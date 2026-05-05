import { handleCors } from "../shared/cors.ts";
import { json, badRequest, unauthorized, forbidden, serverError } from "../shared/http.ts";
import { requireUser } from "../shared/auth.ts";
import { supabaseServiceClient } from "../shared/supabase.ts";
import { normalizeModule } from "../shared/context.ts";
import { recordEvent } from "../shared/analytics.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") return badRequest("POST required");

  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));

    const assistant_session_id = String(body.assistant_session_id ?? "");
    if (!assistant_session_id) return badRequest("assistant_session_id required");

    const module = normalizeModule(String(body.module ?? "dashboard"));
    const route = String(body.route ?? "/");
    const state = (body.state && typeof body.state === "object") ? body.state : {};
    const page_context = (body.page_context && typeof body.page_context === "object") ? body.page_context : {};

    const sb = supabaseServiceClient();

    const { data: session } = await sb
      .from("assistant_sessions")
      .select("id, organization_id, user_id, role, context")
      .eq("id", assistant_session_id)
      .maybeSingle();

    if (!session) return forbidden("Session not found");
    if (session.user_id !== user.id) return forbidden("Session ownership mismatch");

    const merged = {
      ...(session.context ?? {}),
      module,
      route,
      page_context,
      state,
      last_seen_at: new Date().toISOString(),
    };

    const { error } = await sb
      .from("assistant_sessions")
      .update({
        updated_at: new Date().toISOString(),
        module,
        route,
        context: merged,
      })
      .eq("id", assistant_session_id);

    if (error) return serverError("Failed to refresh context", error.message);

    await recordEvent({
      organization_id: session.organization_id,
      user_id: user.id,
      session_id: assistant_session_id,
      event_type: "context_refresh",
      module,
      route,
      payload: { keys: Object.keys(state ?? {}) },
    });

    return json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "UNAUTHORIZED") return unauthorized();
    return serverError("Unhandled error", msg);
  }
});
