import { corsHeaders } from "./cors.ts";

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function badRequest(message: string, details?: unknown) {
  return json({ error: "bad_request", message, details }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return json({ error: "unauthorized", message }, { status: 401 });
}

export function forbidden(message = "Forbidden", details?: unknown) {
  return json({ error: "forbidden", message, details }, { status: 403 });
}

export function serverError(message = "Server error", details?: unknown) {
  return json({ error: "server_error", message, details }, { status: 500 });
}
