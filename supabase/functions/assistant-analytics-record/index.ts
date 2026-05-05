import { handleCors } from "../shared/cors.ts";
import { json, badRequest, unauthorized, forbidden, serverError } from "../shared/http.ts";
import { requireUser } from "../shared/auth.ts";
import { supabaseServiceClient } from "../shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") return badRequest("POST required");

  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));

    const organization_id = String(body.organization_id ?? "");
    if (!organization_id) return badRequest("organization_id required");

    const sb = supabaseServiceClient();

    // Optional: verify membership exists for org (minimal check).
    // If you want strict gating, join organization_members here.

    const session_id = body.assistant_session_id ? String(body.assistant_session_id) : null;
    const event = String(body.event ?? "assistant_event");
    const intent = body.intent ? String(body.intent) : null;
    const module = body.module ? String(body.module) : null;
    const route = body.route ? String(body.route) : null;
    const resolved = typeof body.resolved === "boolean" ? body.resolved : null;
    const metadata = (body.metadata && typeof body.metadata === "object") ? body.metadata : {};

    // Write to events
    await sb.from("assistant_events").insert({
      organization_id,
      user_id: user.id,
      session_id,
      event_type: event,
      module,
      route,
      payload: metadata,
    });

    // If it's an intent, also write to assistant_intents
    if (intent) {
      await sb.from("assistant_intents").insert({
        organization_id,
        user_id: user.id,
        session_id,
        module,
        intent,
        resolved: resolved ?? false,
        metadata,
      });
    }

    return json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "UNAUTHORIZED") return unauthorized();
    return serverError("Unhandled error", msg);
  }
});
