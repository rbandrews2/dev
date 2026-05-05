/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function extractMessage(body: any): string {
  if (typeof body?.message === "string") return body.message.trim();
  if (typeof body?.prompt === "string") return body.prompt.trim();

  if (Array.isArray(body?.messages)) {
    const last = body.messages.at(-1);
    if (typeof last?.content === "string") return last.content.trim();
  }

  return "";
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: CORS_HEADERS });
    }

    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const body = await req.json().catch(() => ({}));
    const message = extractMessage(body);

    if (!message) {
      return json(400, { error: "Missing training prompt" });
    }

    const ATLAS_URL = requireEnv("ATLAS_URL");
    const ATLAS_API_KEY = requireEnv("ATLAS_API_KEY");

    const upstream = await fetch(`${ATLAS_URL}/assistant/training`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ATLAS_API_KEY}`,
      },
      body: JSON.stringify({
        message,
        course_id: body?.course_id,
        topic: body?.topic,
      }),
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      return json(502, {
        error: "Atlas upstream error",
        status: upstream.status,
        body: text,
      });
    }

    return new Response(text, {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ai-training-assistant]", err);
    return json(500, {
      error: "Edge function crashed",
      detail: String(err),
    });
  }
});
