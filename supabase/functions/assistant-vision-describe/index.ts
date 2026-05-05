// supabase/functions/assistant-vision-describe/index.ts
// Purpose: Vision endpoint that forwards images to Atlas vision describe.
// Requires secrets: ATLAS_URL, ATLAS_API_KEY
// Input: { image_url?: string, image_base64?: string, prompt?: string, context?: object }

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

    const imageUrl = typeof body?.image_url === "string" ? body.image_url.trim() : "";
    const imageBase64 = typeof body?.image_base64 === "string" ? body.image_base64.trim() : "";
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const context = typeof body?.context === "object" && body.context ? body.context : undefined;

    if (!imageUrl && !imageBase64) {
      return json(400, {
        ok: false,
        error: "Missing image input. Provide {image_url} or {image_base64}.",
        reqId,
      });
    }

    const atlasUrl = requireEnv("ATLAS_URL").replace(/\/+$/, "");
    const atlasKey = requireEnv("ATLAS_API_KEY");
    const userJwt = getAuthBearer(req);

    const payload = {
      image_url: imageUrl || undefined,
      image_base64: imageBase64 || undefined,
      prompt: prompt || undefined,
      context,
    };

    const upstream = await fetchWithTimeout(
      `${atlasUrl}/assistant/vision/describe`,
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
      30000,
    );

    const upstreamText = await upstream.text().catch(() => "");
    const ct = upstream.headers.get("content-type") || "";

    if (!upstream.ok) {
      console.error("[assistant-vision-describe] upstream non-2xx", {
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
    console.error("[assistant-vision-describe] fatal", { reqId, err: err?.stack ?? String(err) });
    return json(500, { ok: false, error: "Edge function crashed", detail: String(err), reqId });
  }
});
