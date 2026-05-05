/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationStatus } from "../shared/integrationSecrets.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const INTEGRATION_PROVIDERS = ["slack", "teams", "procore", "google-drive", "sharepoint", "webhook"] as const;
type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];
const INTEGRATION_VAULT_KEYS: Record<IntegrationProvider, string[]> = {
  slack: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
  teams: ["MICROSOFT_GRAPH_CLIENT_ID", "MICROSOFT_GRAPH_CLIENT_SECRET", "MICROSOFT_TENANT_ID"],
  procore: ["PROCORE_CLIENT_ID", "PROCORE_CLIENT_SECRET"],
  "google-drive": ["GOOGLE_DRIVE_CLIENT_SECRET"],
  sharepoint: ["MICROSOFT_GRAPH_CLIENT_ID", "MICROSOFT_GRAPH_CLIENT_SECRET", "MICROSOFT_TENANT_ID"],
  webhook: [],
};
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function generateCode(len = 15): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

async function sha256Hex(input: string): Promise<string> {
  const data = textEncoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacBase64(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function base64Encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64Decode(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function deriveVaultKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey("raw", textEncoder.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: textEncoder.encode("wzos-server-vault-v1"),
      iterations: 200_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function sealVaultValue(secret: string, plaintext: string): Promise<string> {
  const key = await deriveVaultKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, textEncoder.encode(plaintext));
  return `${base64Encode(iv)}.${base64Encode(new Uint8Array(ciphertext))}`;
}

async function openVaultValue(secret: string, sealed: string): Promise<string> {
  const [ivPart, cipherPart] = sealed.split(".");
  if (!ivPart || !cipherPart) throw new Error("Stored vault value is malformed.");
  const key = await deriveVaultKey(secret);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64Decode(ivPart) },
    key,
    base64Decode(cipherPart),
  );
  return textDecoder.decode(new Uint8Array(plaintext));
}

function isIntegrationProvider(value: string): value is IntegrationProvider {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}

function validateWebhookUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Webhook URL must be a valid absolute URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Webhook URL must use HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Webhook URL must not include credentials.");
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    throw new Error("Webhook URL must not target a local or private host.");
  }

  return parsed;
}

function defaultIntegrationRow(provider: IntegrationProvider) {
  return {
    provider,
    auth_type: provider === "webhook" ? "api-key" : "oauth",
    status: "ready",
    webhook_url: null,
    external_account_label: null,
    notes: null,
    last_test_status: null,
    last_test_message: null,
    last_test_at: null,
    connected_at: null,
    disconnected_at: null,
    required_vault_keys: INTEGRATION_VAULT_KEYS[provider],
    present_vault_keys: [],
    missing_vault_keys: INTEGRATION_VAULT_KEYS[provider],
  };
}

function normalizeVaultKey(name: string): string {
  const upper = name.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  if (upper === "GOOGLE_MAPS_API_KEY") return "VITE_GOOGLE_MAPS_API_KEY";
  return upper;
}

function washSecret(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("\n");
}

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function errorText(error: unknown): string {
  const e = error as SupabaseErrorLike | null;
  return [e?.code, e?.message, e?.details, e?.hint].filter(Boolean).join(" ").toLowerCase();
}

function isMissingSchemaError(error: unknown): boolean {
  const text = errorText(error);
  return (
    text.includes("42p01") ||
    text.includes("pgrst205") ||
    text.includes("could not find the table") ||
    (text.includes("relation") && text.includes("does not exist")) ||
    text.includes("schema cache")
  );
}

function setupRequired(message = "Integration storage is not installed yet. Run src/sql/integration_tables.sql in the Supabase SQL Editor, then redeploy or refresh this page.") {
  return json(409, {
    ok: false,
    code: "integration_schema_required",
    error: message,
  });
}

async function getVaultPresence(
  admin: ReturnType<typeof createClient>,
  organization_id: string,
  keys: string[],
): Promise<{ present: string[]; missing: string[] }> {
  if (keys.length === 0) return { present: [], missing: [] };

  const normalized = keys.map(normalizeVaultKey);
  const { data, error } = await admin
    .from("org_vault_entries")
    .select("normalized_name")
    .eq("organization_id", organization_id)
    .in("normalized_name", normalized);

  if (error) {
    if (isMissingSchemaError(error)) return { present: [], missing: normalized };
    throw error;
  }

  const presentSet = new Set((data ?? []).map((row) => row.normalized_name));
  return {
    present: normalized.filter((key) => presentSet.has(key)),
    missing: normalized.filter((key) => !presentSet.has(key)),
  };
}

async function getDriveSettings(admin: ReturnType<typeof createClient>, owner_email: string) {
  const { data, error } = await admin
    .from("owner_drive_settings")
    .select("drive_folder_id, drive_folder_name")
    .eq("owner_email", owner_email)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) return null;
    throw error;
  }

  return data ?? null;
}

type Action =
  | "stats"
  | "codes.list"
  | "codes.issue"
  | "codes.revoke"
  | "codes.reissue"
  | "licenses.transfer"
  | "installs.list"
  | "installs.unlock"
  | "customers.search"
  | "customers.upsert"
  | "tickets.list"
  | "tickets.create"
  | "tickets.update"
  | "audit.list"
  | "drive.get"
  | "drive.set"
  | "integrations.status"
  | "integrations.list"
  | "integrations.connect"
  | "integrations.disconnect"
  | "integrations.test"
  | "vault.list"
  | "vault.upsert"
  | "vault.reveal"
  | "vault.delete"
  | "vault.export";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = requireEnv("SUPABASE_URL");
    const PUBLISHABLE_KEY = requireEnv("SUPABASE_PUBLISHABLE_KEYS"); // for getUser validation
    const SECRET_KEY = requireEnv("SUPABASE_SECRET_KEYS");

    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return json(401, { error: "Missing bearer token" });

    const body = await req.json().catch(() => ({}));
    const action = body?.action as Action;

    // Client used ONLY to validate JWT / identify user (network-verified)
    const userClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json(401, { error: "Invalid session" });

    const actor = userRes.user;
    const actorEmail = actor.email ?? null;

    // Secret-key client for privileged DB ops (never expose key to browser)
    const admin = createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });

    // Authorization check: caller must be owner/admin in at least one organization.
    const { data: memberships, error: memErr } = await admin
      .from("organization_members")
      .select("organization_id, role, email")
      .eq("email", actor.email ?? "");

    if (memErr) return json(500, { error: "Authz lookup failed" });
    const adminMemberships = (memberships ?? []).filter((item) => item.role === "owner" || item.role === "admin");
    if (adminMemberships.length === 0) return json(403, { error: "Not authorized" });

    async function audit(action: string, target_type?: string, target_id?: string, detail?: unknown) {
      const { error } = await admin.from("owner_audit_log").insert({
        actor_user_id: actor.id,
        actor_email: actorEmail,
        action,
        target_type: target_type ?? null,
        target_id: target_id ?? null,
        detail: detail ? detail : null,
      });
      if (error && !isMissingSchemaError(error)) console.warn("owner audit write failed", error);
    }

    async function requireOrgAdmin(organization_id: string) {
      if (!organization_id) throw new Error("organization_id required");
      const match = adminMemberships.find((item) => item.organization_id === organization_id);
      if (!match) throw new Error("Not authorized for this organization");
      return match;
    }

    // ---------------- ACTIONS ----------------

    if (action === "stats") {
      const [codes, installs, locked, tickets] = await Promise.all([
        admin.from("activation_codes").select("id", { count: "exact", head: true }),
        admin.from("app_installations").select("installation_id", { count: "exact", head: true }),
        admin.from("app_installations").select("installation_id", { count: "exact", head: true }).eq("locked", true),
        admin.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
      ]);

      return json(200, {
        ok: true,
        stats: {
          codes_total: codes.count ?? 0,
          installs_total: installs.count ?? 0,
          installs_locked: locked.count ?? 0,
          tickets_open: tickets.count ?? 0,
        },
      });
    }

    if (action === "codes.list") {
      const q = (body?.q as string | undefined)?.trim() ?? "";
      let query = admin
        .from("activation_codes")
        .select("id,status,customer_email,order_id,product_sku,issued_at,expires_at,redeemed_at,redeemed_installation_id")
        .order("issued_at", { ascending: false })
        .limit(100);

      if (q) query = query.or(`customer_email.ilike.%${q}%,order_id.ilike.%${q}%`);

      const { data, error } = await query;
      if (error) return json(500, { error: "codes.list failed" });

      return json(200, { ok: true, codes: data });
    }

    if (action === "codes.issue") {
      const customer_email = String(body?.customer_email ?? "").trim().toLowerCase();
      const order_id = String(body?.order_id ?? "").trim();
      const product_sku = String(body?.product_sku ?? "WZOS_CORE").trim();
      const expires_at = body?.expires_at ? String(body.expires_at) : null;

      if (!customer_email) return json(400, { error: "customer_email required" });

      const plain = generateCode(15);
      const code_hash = await sha256Hex(plain);

      const { error } = await admin.from("activation_codes").insert({
        code_hash,
        customer_email,
        order_id: order_id || null,
        product_sku,
        expires_at,
      });

      if (error) return json(500, { error: "codes.issue failed" });

      await audit("codes.issue", "activation_codes", customer_email, { order_id, product_sku });

      // Return plaintext ONCE so you can copy/email it immediately.
      return json(200, { ok: true, activation_code: plain });
    }

    if (action === "codes.revoke") {
      const id = String(body?.id ?? "");
      if (!id) return json(400, { error: "id required" });

      const { data, error } = await admin
        .from("activation_codes")
        .update({ status: "revoked" })
        .eq("id", id)
        .select("id, status")
        .maybeSingle();

      if (error || !data) return json(500, { error: "codes.revoke failed" });

      await audit("codes.revoke", "activation_codes", id);
      return json(200, { ok: true });
    }

    if (action === "codes.reissue") {
      // revoke old + issue new, tied to same customer/order/product
      const id = String(body?.id ?? "");
      if (!id) return json(400, { error: "id required" });

      const { data: old, error: oldErr } = await admin
        .from("activation_codes")
        .select("customer_email, order_id, product_sku")
        .eq("id", id)
        .maybeSingle();

      if (oldErr || !old?.customer_email) return json(404, { error: "Code not found" });

      await admin.from("activation_codes").update({ status: "revoked" }).eq("id", id);

      const plain = generateCode(15);
      const code_hash = await sha256Hex(plain);

      const { error: insErr } = await admin.from("activation_codes").insert({
        code_hash,
        customer_email: old.customer_email,
        order_id: old.order_id,
        product_sku: old.product_sku,
      });

      if (insErr) return json(500, { error: "codes.reissue insert failed" });

      await audit("codes.reissue", "activation_codes", id, { customer_email: old.customer_email });
      return json(200, { ok: true, activation_code: plain });
    }

    if (action === "licenses.transfer") {
      // Move activation from one installation_id to another (owner-controlled).
      const from_installation_id = String(body?.from_installation_id ?? "");
      const to_installation_id = String(body?.to_installation_id ?? "");
      if (!from_installation_id || !to_installation_id) {
        return json(400, { error: "from_installation_id and to_installation_id required" });
      }

      const { data: from, error: fErr } = await admin
        .from("app_installations")
        .select("installation_id, activated, activation_code_id")
        .eq("installation_id", from_installation_id)
        .maybeSingle();

      if (fErr || !from?.activated || !from.activation_code_id) return json(400, { error: "Source installation not activated" });

      // Ensure destination exists
      await admin.from("app_installations").upsert({ installation_id: to_installation_id }, { onConflict: "installation_id" });

      // Transfer
      await admin.from("app_installations").update({
        activated: false,
        activation_code_id: null,
      }).eq("installation_id", from_installation_id);

      await admin.from("app_installations").update({
        activated: true,
        activation_code_id: from.activation_code_id,
        activated_at: new Date().toISOString(),
        locked: false,
        locked_at: null,
      }).eq("installation_id", to_installation_id);

      await admin.from("activation_codes").update({
        redeemed_installation_id: to_installation_id,
      }).eq("id", from.activation_code_id);

      await audit("licenses.transfer", "app_installations", from_installation_id, { to_installation_id });
      return json(200, { ok: true });
    }

    if (action === "installs.list") {
      const q = (body?.q as string | undefined)?.trim() ?? "";
      let query = admin
        .from("app_installations")
        .select("installation_id, activated, locked, activation_code_id, created_at, activated_at, locked_at, last_attempt_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (q) query = query.ilike("installation_id", `%${q}%`);

      const { data, error } = await query;
      if (error) return json(500, { error: "installs.list failed" });

      return json(200, { ok: true, installs: data });
    }

    if (action === "installs.unlock") {
      const installation_id = String(body?.installation_id ?? "");
      if (!installation_id) return json(400, { error: "installation_id required" });

      await admin.from("app_installations").update({ locked: false, locked_at: null }).eq("installation_id", installation_id);
      await admin.from("activation_attempts").update({ attempts: 0 }).eq("installation_id", installation_id);

      await audit("installs.unlock", "app_installations", installation_id);
      return json(200, { ok: true });
    }

    if (action === "customers.search") {
      const q = String(body?.q ?? "").trim().toLowerCase();
      if (!q) return json(200, { ok: true, customers: [] });

      const { data, error } = await admin
        .from("customer_profiles")
        .select("id,email,name,phone,company,notes,created_at,updated_at")
        .or(`email.ilike.%${q}%,name.ilike.%${q}%,company.ilike.%${q}%`)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) return json(500, { error: "customers.search failed" });
      return json(200, { ok: true, customers: data });
    }

    if (action === "customers.upsert") {
      const email = String(body?.email ?? "").trim().toLowerCase();
      if (!email) return json(400, { error: "email required" });

      const payload = {
        email,
        name: body?.name ?? null,
        phone: body?.phone ?? null,
        company: body?.company ?? null,
        notes: body?.notes ?? null,
      };

      const { data, error } = await admin
        .from("customer_profiles")
        .upsert(payload, { onConflict: "email" })
        .select("id,email,name,phone,company,notes,created_at,updated_at")
        .single();

      if (error) return json(500, { error: "customers.upsert failed" });

      await audit("customers.upsert", "customer_profiles", email);
      return json(200, { ok: true, customer: data });
    }

    if (action === "tickets.list") {
      const status = String(body?.status ?? "").trim();
      let query = admin
        .from("support_tickets")
        .select("id,customer_email,subject,status,priority,message,owner_notes,created_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(100);

      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) return json(500, { error: "tickets.list failed" });

      return json(200, { ok: true, tickets: data });
    }

    if (action === "tickets.create") {
      const customer_email = String(body?.customer_email ?? "").trim().toLowerCase();
      const subject = String(body?.subject ?? "").trim();
      const message = String(body?.message ?? "").trim();
      const priority = String(body?.priority ?? "normal").trim();

      if (!customer_email || !subject || !message) return json(400, { error: "customer_email, subject, message required" });

      const { data, error } = await admin
        .from("support_tickets")
        .insert({ customer_email, subject, message, priority })
        .select("*")
        .single();

      if (error) return json(500, { error: "tickets.create failed" });

      await audit("tickets.create", "support_tickets", data.id, { customer_email });
      return json(200, { ok: true, ticket: data });
    }

    if (action === "tickets.update") {
      const id = String(body?.id ?? "");
      if (!id) return json(400, { error: "id required" });

      const patch: Record<string, unknown> = {};
      if (body?.status) patch.status = String(body.status);
      if (body?.owner_notes !== undefined) patch.owner_notes = body.owner_notes;

      const { data, error } = await admin
        .from("support_tickets")
        .update(patch)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error || !data) return json(500, { error: "tickets.update failed" });

      await audit("tickets.update", "support_tickets", id, patch);
      return json(200, { ok: true, ticket: data });
    }

    if (action === "audit.list") {
      const q = String(body?.q ?? "").trim();
      let query = admin
        .from("owner_audit_log")
        .select("id,actor_email,action,target_type,target_id,detail,created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (q) {
        query = query.or(`action.ilike.%${q}%,actor_email.ilike.%${q}%,target_id.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (error) return json(500, { error: "audit.list failed" });

      return json(200, { ok: true, logs: data });
    }

    if (action === "drive.get") {
      const owner_email = actor.email ?? "";
      try {
        const settings = await getDriveSettings(admin, owner_email);
        return json(200, { ok: true, settings });
      } catch {
        return json(500, { error: "drive.get failed" });
      }
    }

    if (action === "drive.set") {
      const owner_email = actor.email ?? "";
      const drive_folder_id = body?.drive_folder_id ? String(body.drive_folder_id) : null;
      const drive_folder_name = body?.drive_folder_name ? String(body.drive_folder_name) : null;

      const { error } = await admin
        .from("owner_drive_settings")
        .upsert({ owner_email, drive_folder_id, drive_folder_name }, { onConflict: "owner_email" });

      if (error) {
        if (isMissingSchemaError(error)) return setupRequired("Google Drive settings storage is not installed yet. Run src/sql/integration_tables.sql in the Supabase SQL Editor.");
        return json(500, { error: "drive.set failed" });
      }

      await audit("drive.set", "owner_drive_settings", owner_email, { drive_folder_id, drive_folder_name });
      return json(200, { ok: true });
    }

    if (action === "integrations.list") {
      const organization_id = String(body?.organization_id ?? "");
      await requireOrgAdmin(organization_id);

      const { data, error } = await admin
        .from("org_integrations")
        .select("provider,auth_type,status,webhook_url,external_account_label,notes,last_test_status,last_test_message,last_test_at,connected_at,disconnected_at")
        .eq("organization_id", organization_id);

      if (error) {
        if (isMissingSchemaError(error)) {
          const integrations = await Promise.all(
            INTEGRATION_PROVIDERS.map(async (provider) => {
              const requiredVaultKeys = INTEGRATION_VAULT_KEYS[provider];
              const vault = await getVaultPresence(admin, organization_id, requiredVaultKeys);
              return {
                ...defaultIntegrationRow(provider),
                notes: "Integration storage is not installed yet. Run src/sql/integration_tables.sql in Supabase before connecting providers.",
                required_vault_keys: requiredVaultKeys,
                present_vault_keys: vault.present,
                missing_vault_keys: vault.missing,
              };
            }),
          );
          return json(200, { ok: true, setup_required: true, integrations });
        }
        return json(500, { error: "integrations.list failed" });
      }

      const rowMap = new Map((data ?? []).map((row) => [row.provider, row]));
      const integrations = await Promise.all(
        INTEGRATION_PROVIDERS.map(async (provider) => {
          const row = rowMap.get(provider) ?? defaultIntegrationRow(provider);
          const requiredVaultKeys = INTEGRATION_VAULT_KEYS[provider];
          const vault = await getVaultPresence(admin, organization_id, requiredVaultKeys);
          return {
            ...row,
            required_vault_keys: requiredVaultKeys,
            present_vault_keys: vault.present,
            missing_vault_keys: vault.missing,
          };
        }),
      );
      return json(200, { ok: true, integrations });
    }

    if (action === "integrations.connect") {
      const organization_id = String(body?.organization_id ?? "");
      await requireOrgAdmin(organization_id);

      const provider = String(body?.provider ?? "").trim();
      if (!isIntegrationProvider(provider)) return json(400, { error: "Unsupported integration provider" });
      const vault = await getVaultPresence(admin, organization_id, INTEGRATION_VAULT_KEYS[provider]);

      const now = new Date().toISOString();
      let patch: Record<string, unknown> = {
        organization_id,
        provider,
        auth_type: provider === "webhook" ? "api-key" : "oauth",
        last_test_status: null,
        last_test_message: null,
        last_test_at: null,
        updated_at: now,
        connected_by_user_id: actor.id,
        connected_by_email: actorEmail,
      };
      let message = "";

      if (provider === "webhook") {
        const webhook_url = String(body?.webhook_url ?? "").trim();
        const parsed = validateWebhookUrl(webhook_url);
        patch = {
          ...patch,
          status: "connected",
          webhook_url: parsed.toString(),
          notes: "Webhook endpoint saved. Use Test flow to verify delivery before go-live.",
          connected_at: now,
          disconnected_at: null,
        };
        message = "Webhook endpoint saved. Run Test flow to validate signed delivery.";
      } else if (provider === "google-drive") {
        if (vault.missing.length > 0) {
          patch = {
            ...patch,
            status: "error",
            notes: `Store these Vault keys first: ${vault.missing.join(", ")}`,
            connected_at: null,
            disconnected_at: null,
          };
          message = `Google Drive is blocked until Vault keys are stored: ${vault.missing.join(", ")}.`;
        } else {
        const owner_email = actor.email ?? "";
        let drive: { drive_folder_id: string | null; drive_folder_name: string | null } | null;
        try {
          drive = await getDriveSettings(admin, owner_email);
        } catch {
          return json(500, { error: "integrations.connect drive lookup failed" });
        }

        if (drive?.drive_folder_id) {
          patch = {
            ...patch,
            status: "connected",
            external_account_label: drive.drive_folder_name ?? drive.drive_folder_id,
            notes: "Drive export folder configured in the owner console.",
            connected_at: now,
            disconnected_at: null,
          };
          message = "Google Drive is ready. Export target found in the owner console.";
        } else {
          patch = {
            ...patch,
            status: "pending",
            notes: "Vault keys are present. Select a Google Drive folder in Owner Console > Google Drive to finish setup.",
            connected_at: null,
            disconnected_at: null,
          };
          message = "Google Drive still needs a folder selection in the owner console.";
        }
        }
      } else {
        const providerLabel =
          provider === "sharepoint" ? "SharePoint / Microsoft Graph" :
          provider === "procore" ? "Procore" :
          provider === "slack" ? "Slack" :
          "Microsoft Teams";

        patch = {
          ...patch,
          status: vault.missing.length === 0 ? "pending" : "error",
          notes:
            vault.missing.length === 0
              ? `${providerLabel} onboarding recorded. Vault keys are present; complete provider OAuth handoff before go-live.`
              : `Store these Vault keys first: ${vault.missing.join(", ")}`,
          connected_at: null,
          disconnected_at: null,
        };
        message =
          vault.missing.length === 0
            ? `${providerLabel} setup request recorded. OAuth handoff is still required before production use.`
            : `${providerLabel} is blocked until Vault keys are stored: ${vault.missing.join(", ")}.`;
      }

      const { data, error } = await admin
        .from("org_integrations")
        .upsert(patch, { onConflict: "organization_id,provider" })
        .select("provider,auth_type,status,webhook_url,external_account_label,notes,last_test_status,last_test_message,last_test_at,connected_at,disconnected_at")
        .single();

      if (error) {
        if (isMissingSchemaError(error)) return setupRequired();
        return json(500, { error: "integrations.connect failed" });
      }

      await audit("integrations.connect", "org_integrations", provider, { organization_id, status: data.status });
      return json(200, { ok: true, integration: data, message });
    }

    if (action === "integrations.disconnect") {
      const organization_id = String(body?.organization_id ?? "");
      await requireOrgAdmin(organization_id);

      const provider = String(body?.provider ?? "").trim();
      if (!isIntegrationProvider(provider)) return json(400, { error: "Unsupported integration provider" });

      const patch = {
        status: "ready",
        webhook_url: null,
        external_account_label: null,
        notes: null,
        last_test_status: null,
        last_test_message: null,
        last_test_at: null,
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await admin
        .from("org_integrations")
        .upsert(
          {
            organization_id,
            provider,
            auth_type: provider === "webhook" ? "api-key" : "oauth",
            ...patch,
          },
          { onConflict: "organization_id,provider" },
        )
        .select("provider,auth_type,status,webhook_url,external_account_label,notes,last_test_status,last_test_message,last_test_at,connected_at,disconnected_at")
        .single();

      if (error) {
        if (isMissingSchemaError(error)) return setupRequired();
        return json(500, { error: "integrations.disconnect failed" });
      }

      await audit("integrations.disconnect", "org_integrations", provider, { organization_id });
      return json(200, { ok: true, integration: data, message: "Integration reset. Any live provider-side tokens still need revocation if already issued." });
    }

    if (action === "integrations.test") {
      const organization_id = String(body?.organization_id ?? "");
      await requireOrgAdmin(organization_id);

      const provider = String(body?.provider ?? "").trim();
      if (!isIntegrationProvider(provider)) return json(400, { error: "Unsupported integration provider" });
      const vault = await getVaultPresence(admin, organization_id, INTEGRATION_VAULT_KEYS[provider]);

      const now = new Date().toISOString();

      if (provider === "webhook") {
        const { data: integration, error: readErr } = await admin
          .from("org_integrations")
          .select("provider,status,webhook_url")
          .eq("organization_id", organization_id)
          .eq("provider", provider)
          .maybeSingle();

        if (readErr) {
          if (isMissingSchemaError(readErr)) return setupRequired();
          return json(500, { error: "integrations.test lookup failed" });
        }
        if (!integration?.webhook_url || integration.status !== "connected") {
          return json(409, { error: "Connect and save a webhook endpoint before testing." });
        }

        const secret = requireEnv("WZOS_WEBHOOK_SIGNING_SECRET");
        const nonce = crypto.randomUUID();
        const payload = {
          event: "wzos.integration.test",
          provider,
          organization_id,
          nonce,
          sent_at: now,
          actor_email: actorEmail,
        };
        const serialized = JSON.stringify(payload);
        const signature = await hmacBase64(secret, `${now}.${nonce}.${serialized}`);

        let response: Response;
        try {
          response = await fetch(integration.webhook_url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WZOS-Timestamp": now,
              "X-WZOS-Nonce": nonce,
              "X-WZOS-Signature": signature,
            },
            body: serialized,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Webhook request failed";
          await admin
            .from("org_integrations")
            .update({ status: "error", last_test_status: "failed", last_test_message: message, last_test_at: now, updated_at: now })
            .eq("organization_id", organization_id)
            .eq("provider", provider);
          return json(502, { error: message });
        }

        const message = `Webhook responded with HTTP ${response.status}.`;
        await admin
          .from("org_integrations")
          .update({
            status: response.ok ? "connected" : "error",
            last_test_status: response.ok ? "ok" : "failed",
            last_test_message: message,
            last_test_at: now,
            updated_at: now,
          })
          .eq("organization_id", organization_id)
          .eq("provider", provider);

        await audit("integrations.test", "org_integrations", provider, { organization_id, status: response.status });
        return json(response.ok ? 200 : 502, { ok: response.ok, message });
      }

      if (provider === "google-drive") {
        if (vault.missing.length > 0) {
          await admin
            .from("org_integrations")
            .upsert(
              {
                organization_id,
                provider,
                auth_type: "oauth",
                status: "error",
                notes: `Store these Vault keys first: ${vault.missing.join(", ")}`,
                last_test_status: "failed",
                last_test_message: `Missing Vault keys: ${vault.missing.join(", ")}`,
                last_test_at: now,
                updated_at: now,
              },
              { onConflict: "organization_id,provider" },
            );
          return json(409, { error: `Missing Vault keys: ${vault.missing.join(", ")}` });
        }

        const owner_email = actor.email ?? "";
        let drive: { drive_folder_id: string | null; drive_folder_name: string | null } | null;
        try {
          drive = await getDriveSettings(admin, owner_email);
        } catch {
          return json(500, { error: "integrations.test drive lookup failed" });
        }
        if (!drive?.drive_folder_id) {
          await admin
            .from("org_integrations")
            .upsert(
              {
                organization_id,
                provider,
                auth_type: "oauth",
                status: "pending",
                notes: "No Drive folder selected yet.",
                last_test_status: "failed",
                last_test_message: "No Drive folder selected in the owner console.",
                last_test_at: now,
                updated_at: now,
              },
              { onConflict: "organization_id,provider" },
            );
          return json(409, { error: "No Drive folder selected in the owner console." });
        }

        const message = `Drive folder confirmed: ${drive.drive_folder_name ?? drive.drive_folder_id}`;
        await admin
          .from("org_integrations")
          .upsert(
            {
              organization_id,
              provider,
              auth_type: "oauth",
              status: "connected",
              external_account_label: drive.drive_folder_name ?? drive.drive_folder_id,
              notes: "Drive export folder configured in the owner console.",
              last_test_status: "ok",
              last_test_message: message,
              last_test_at: now,
              connected_at: now,
              updated_at: now,
              connected_by_user_id: actor.id,
              connected_by_email: actorEmail,
            },
            { onConflict: "organization_id,provider" },
          );
        return json(200, { ok: true, message });
      }

      const providerLabel =
        provider === "sharepoint" ? "SharePoint / Microsoft Graph" :
        provider === "procore" ? "Procore" :
        provider === "slack" ? "Slack" :
        "Microsoft Teams";

      if (vault.missing.length > 0) {
        await admin
          .from("org_integrations")
          .upsert(
            {
              organization_id,
              provider,
              auth_type: "oauth",
              status: "error",
              notes: `Store these Vault keys first: ${vault.missing.join(", ")}`,
              last_test_status: "failed",
              last_test_message: `Missing Vault keys: ${vault.missing.join(", ")}`,
              last_test_at: now,
              updated_at: now,
            },
            { onConflict: "organization_id,provider" },
          );
        return json(409, { error: `${providerLabel} is blocked until Vault keys are stored: ${vault.missing.join(", ")}` });
      }

      await admin
        .from("org_integrations")
        .upsert(
          {
            organization_id,
            provider,
            auth_type: "oauth",
            status: "pending",
            notes: `${providerLabel} still requires provider-specific OAuth callback implementation.`,
            last_test_status: "failed",
            last_test_message: `${providerLabel} is not testable until OAuth handoff is implemented.`,
            last_test_at: now,
            updated_at: now,
          },
          { onConflict: "organization_id,provider" },
        );

      return json(409, { error: `${providerLabel} is not testable yet. Complete the OAuth callback implementation first.` });
    }

    if (action === "vault.list") {
      const organization_id = String(body?.organization_id ?? "");
      await requireOrgAdmin(organization_id);

      const { data, error } = await admin
        .from("org_vault_entries")
        .select("id,name,normalized_name,category,notes,created_at,updated_at,created_by_email,updated_by_email")
        .eq("organization_id", organization_id)
        .order("updated_at", { ascending: false });

      if (error) return json(500, { error: "vault.list failed" });
      return json(200, { ok: true, items: data ?? [] });
    }

    if (action === "vault.upsert") {
      const organization_id = String(body?.organization_id ?? "");
      await requireOrgAdmin(organization_id);

      const name = String(body?.name ?? "").trim();
      const category = String(body?.category ?? "generic").trim().toLowerCase() || "generic";
      const notes = body?.notes ? String(body.notes).trim() : null;
      const rawValue = String(body?.value ?? "");

      if (!name) return json(400, { error: "Secret name is required." });
      if (!rawValue.trim()) return json(400, { error: "Secret value is required." });

      const normalized_name = normalizeVaultKey(name);
      const cleanedValue = washSecret(rawValue);
      const sealed_value = await sealVaultValue(requireEnv("WZOS_VAULT_MASTER_KEY"), cleanedValue);
      const now = new Date().toISOString();

      const { data, error } = await admin
        .from("org_vault_entries")
        .upsert(
          {
            organization_id,
            name,
            normalized_name,
            category,
            notes,
            sealed_value,
            created_by_user_id: actor.id,
            created_by_email: actorEmail,
            updated_by_user_id: actor.id,
            updated_by_email: actorEmail,
            updated_at: now,
          },
          { onConflict: "organization_id,normalized_name" },
        )
        .select("id,name,normalized_name,category,notes,created_at,updated_at,created_by_email,updated_by_email")
        .single();

      if (error) return json(500, { error: "vault.upsert failed" });

      await audit("vault.upsert", "org_vault_entries", data.id, { organization_id, normalized_name, category });
      return json(200, { ok: true, item: data, message: "Secret stored in the server vault." });
    }

    if (action === "vault.reveal") {
      const organization_id = String(body?.organization_id ?? "");
      await requireOrgAdmin(organization_id);

      const id = String(body?.id ?? "").trim();
      if (!id) return json(400, { error: "Vault item id is required." });

      const { data, error } = await admin
        .from("org_vault_entries")
        .select("id,name,normalized_name,sealed_value")
        .eq("organization_id", organization_id)
        .eq("id", id)
        .maybeSingle();

      if (error) return json(500, { error: "vault.reveal failed" });
      if (!data) return json(404, { error: "Vault item not found." });

      const value = await openVaultValue(requireEnv("WZOS_VAULT_MASTER_KEY"), data.sealed_value);
      await audit("vault.reveal", "org_vault_entries", id, { organization_id, normalized_name: data.normalized_name });
      return json(200, { ok: true, id, name: data.name, value });
    }

    if (action === "vault.delete") {
      const organization_id = String(body?.organization_id ?? "");
      await requireOrgAdmin(organization_id);

      const id = String(body?.id ?? "").trim();
      if (!id) return json(400, { error: "Vault item id is required." });

      const { data, error } = await admin
        .from("org_vault_entries")
        .delete()
        .eq("organization_id", organization_id)
        .eq("id", id)
        .select("id,normalized_name")
        .maybeSingle();

      if (error) return json(500, { error: "vault.delete failed" });
      if (!data) return json(404, { error: "Vault item not found." });

      await audit("vault.delete", "org_vault_entries", id, { organization_id, normalized_name: data.normalized_name });
      return json(200, { ok: true, id, message: "Secret deleted from the server vault." });
    }

    if (action === "vault.export") {
      const organization_id = String(body?.organization_id ?? "");
      await requireOrgAdmin(organization_id);

      const { data, error } = await admin
        .from("org_vault_entries")
        .select("name,normalized_name,sealed_value")
        .eq("organization_id", organization_id)
        .order("normalized_name", { ascending: true });

      if (error) return json(500, { error: "vault.export failed" });

      const secret = requireEnv("WZOS_VAULT_MASTER_KEY");
      const lines: string[] = [];
      for (const item of data ?? []) {
        const value = await openVaultValue(secret, item.sealed_value);
        lines.push(`${item.normalized_name}="${value}"`);
      }

      await audit("vault.export", "org_vault_entries", organization_id, { count: lines.length });
      return json(200, {
        ok: true,
        envBlock: lines.join("\n"),
        message: lines.length ? "Generated .env block from the server vault." : "No secrets stored yet.",
      });
    }

    if (action === "integrations.status") {
      return json(200, { ok: true, ...getIntegrationStatus() });
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    return json(500, { error: String((e as any)?.message ?? e) });
  }
});
