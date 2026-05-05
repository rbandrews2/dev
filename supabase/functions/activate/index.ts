/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleCors } from "../shared/cors.ts";
import { json, badRequest, serverError } from "../shared/http.ts";
import { normalizeActivationCode, sha256Hex } from "../shared/license.ts";
import { supabaseServiceClient } from "../shared/supabase.ts";

const MAX_ATTEMPTS = 5;

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return badRequest("POST required");

  try {
    const body = await req.json().catch(() => ({}));
    const installationId = typeof body?.installation_id === "string" ? body.installation_id.trim() : "";
    const activationCode = normalizeActivationCode(typeof body?.activation_code === "string" ? body.activation_code : "");

    if (!installationId || !activationCode) {
      return badRequest("installation_id and activation_code are required.");
    }

    const service = supabaseServiceClient();
    const now = new Date().toISOString();

    await service.from("app_installations").upsert(
      {
        installation_id: installationId,
        last_attempt_at: now,
      },
      { onConflict: "installation_id" },
    );

    const { data: install, error: installError } = await service
      .from("app_installations")
      .select("installation_id, activated, locked, activation_code_id")
      .eq("installation_id", installationId)
      .maybeSingle();

    if (installError) return serverError("Could not load installation state.", installError.message);
    if (!install) return serverError("Installation state not found after initialization.");

    if (install.locked) {
      return json({ ok: false, locked: true, message: "This installation is locked. Contact support." });
    }

    if (install.activated) {
      return json({ ok: true, activated: true });
    }

    const { data: attemptRow, error: attemptsError } = await service
      .from("activation_attempts")
      .select("attempts")
      .eq("installation_id", installationId)
      .maybeSingle();

    if (attemptsError) return serverError("Could not load activation attempts.", attemptsError.message);

    const codeHash = await sha256Hex(activationCode);
    const { data: codeRow, error: codeError } = await service
      .from("activation_codes")
      .select("id, status, redeemed_installation_id, expires_at")
      .eq("code_hash", codeHash)
      .maybeSingle();

    if (codeError) return serverError("Could not validate activation code.", codeError.message);

    const attemptsUsed = (attemptRow?.attempts ?? 0) + 1;
    const attemptsLeft = Math.max(MAX_ATTEMPTS - attemptsUsed, 0);
    const codeExpired = codeRow?.expires_at ? new Date(codeRow.expires_at).getTime() < Date.now() : false;
    const invalid =
      !codeRow ||
      codeExpired ||
      codeRow.status === "revoked" ||
      (codeRow.status === "redeemed" && codeRow.redeemed_installation_id !== installationId);

    if (invalid) {
      const locked = attemptsUsed >= MAX_ATTEMPTS;

      await service.from("activation_attempts").upsert(
        {
          installation_id: installationId,
          attempts: attemptsUsed,
          updated_at: now,
        },
        { onConflict: "installation_id" },
      );

      if (locked) {
        await service.from("app_installations").update({ locked: true, locked_at: now, last_attempt_at: now }).eq("installation_id", installationId);
      }

      return json({
        ok: false,
        locked,
        attempts_left: locked ? 0 : attemptsLeft,
        message: codeExpired ? "Activation code expired." : "Activation code is invalid.",
      });
    }

    await service.from("app_installations").update({
      activated: true,
      activation_code_id: codeRow.id,
      activated_at: now,
      locked: false,
      locked_at: null,
      last_attempt_at: now,
    }).eq("installation_id", installationId);

    await service.from("activation_codes").update({
      status: "redeemed",
      redeemed_at: now,
      redeemed_installation_id: installationId,
    }).eq("id", codeRow.id);

    await service.from("activation_attempts").upsert(
      {
        installation_id: installationId,
        attempts: 0,
        updated_at: now,
      },
      { onConflict: "installation_id" },
    );

    return json({ ok: true, activated: true });
  } catch (error) {
    return serverError("Activation failed.", error instanceof Error ? error.message : String(error));
  }
});
