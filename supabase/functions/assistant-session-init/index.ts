// supabase/functions/assistant-session/index.ts
// Purpose: Create/refresh/get assistant sessions via Atlas (server-authoritative).
// POST { action: "create"|"refresh"|"get", session_id?, organization_id?, context? }
// Requires secrets: ATLAS_URL, ATLAS_API_KEY
// Optional: REQUIRE_AUTH=true

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function getReqId(req: Request) {
  return (
    req.headers.get("x-request-id") ||
    req.headers.get("x-sb-request-id") ||
    crypto.randomUUID()
  );
}

function getAuthBearer(req: Request) {
  const raw =
    req.headers.get("authorization") ||
    req.headers.get("Authorization") ||
    req.headers.get("x-supabase-authorization") ||
    "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

async function readJsonBody(req: Request): Promise<any> {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return {};
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required secret: ${name}`);
  return v;
}

Deno.serve(async (req) => {
  const reqId = getReqId(req);

  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
    if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed", reqId });

    const body = await readJsonBody(req);
    const action =
      typeof body?.action === "string" ? body.action.toLowerCase().trim() : "create";

    const atlasUrl = requireEnv("ATLAS_URL").replace(/\/+$/, "");
    const atlasKey = requireEnv("ATLAS_API_KEY");
    const requireAuth = (Deno.env.get("REQUIRE_AUTH") || "false").toLowerCase() === "true";
    const userJwt = getAuthBearer(req);

    if (requireAuth && !userJwt) {
      return json(401, { ok: false, error: "Missing Authorization: Bearer <jwt>", reqId });
    }

    const payload = {
      action,
      session_id: typeof body?.session_id === "string" ? body.session_id : undefined,
      organization_id: typeof body?.organization_id === "string" ? body.organization_id : undefined,
      context: typeof body?.context === "object" && body.context ? body.context : undefined,
    };

    const upstream = await fetchWithTimeout(
      `${atlasUrl}/assistant/session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": reqId,
          Authorization: `Bearer ${atlasKey}`,
          ...(userJwt ? { "X-User-JWT": userJwt } : {}),
        },
        body: JSON.stringify(payload),
      },
      20000,
    );

    const upstreamText = await upstream.text().catch(() => "");
    const ct = upstream.headers.get("content-type") || "";

    if (!upstream.ok) {
      console.error("[assistant-session] upstream non-2xx", {
        reqId,
        status: upstream.status,
        bodyPreview: upstreamText.slice(0, 800),
      });

      return json(502, {
        ok: false,
        error: "Atlas upstream error",
        upstreamStatus: upstream.status,
        upstreamBody: upstreamText.slice(0, 4000),
        reqId,
      });
    }

    if (ct.includes("application/json")) {
      let data: any = null;
      try {
        data = JSON.parse(upstreamText);
      } catch {
        data = { raw: upstreamText };
      }
      return json(200, { ok: true, ...data, reqId });
    }

    return json(200, { ok: true, text: upstreamText, reqId });
  } catch (err) {
    console.error("[assistant-session] fatal", { reqId, err: err?.stack ?? String(err) });
    return json(500, { ok: false, error: "Edge function crashed", detail: String(err), reqId });
  }
});
