import { handleCors } from "../shared/cors.ts";
import { json, badRequest, unauthorized, forbidden, serverError } from "../shared/http.ts";
import { requireUser } from "../shared/auth.ts";
import { supabaseServiceClient } from "../shared/supabase.ts";
import { invokeTool } from "../shared/tools.ts";
import type { ToolName } from "../shared/policy.ts";

function requireInternalHeader(req: Request) {
  // Hard gate to discourage direct client usage. Still not your only security layer.
  return req.headers.get("x-atlas-internal") === "1";
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") return badRequest("POST required");

  try {
    const user = await requireUser(req);
    if (!requireInternalHeader(req)) return forbidden("Direct tool invocation not allowed");

    const body = await req.json().catch(() => ({}));
    const assistant_session_id = String(body.assistant_session_id ?? "");
    const tool = String(body.tool ?? "") as ToolName;

    if (!assistant_session_id) return badRequest("assistant_session_id required");
    if (!tool) return badRequest("tool required");

    const sb = supabaseServiceClient();
    const { data: session } = await sb
      .from("assistant_sessions")
      .select("id, organization_id, user_id, role, module")
      .eq("id", assistant_session_id)
      .maybeSingle();

    if (!session) return forbidden("Session not found");
    if (session.user_id !== user.id) return forbidden("Session ownership mismatch");

    // Audit: tool call record (queued)
    const { data: callRow } = await sb
      .from("assistant_tool_calls")
      .insert({
        organization_id: session.organization_id,
        user_id: user.id,
        session_id: assistant_session_id,
        tool,
        status: "queued",
        input: body.payload ?? {},
      })
      .select("id")
      .single();

    const result = await invokeTool({
      role: session.role,
      module: session.module,
      tool,
      organization_id: session.organization_id,
      user_id: user.id,
      session_id: assistant_session_id,
      payload: body.payload ?? {},
    });

    if (!callRow?.id) {
      // Continue anyway; do not fail user for audit insert issues.
      return json({ ok: result.ok, result });
    }

    if (result.ok) {
      await sb.from("assistant_tool_calls").update({
        status: "ok",
        output: result.data,
      }).eq("id", callRow.id);
    } else {
      await sb.from("assistant_tool_calls").update({
        status: result.error === "DENIED" ? "denied" : "error",
        output: result.details ?? {},
        error: result.error,
      }).eq("id", callRow.id);
    }

    return json({ ok: result.ok, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "UNAUTHORIZED") return unauthorized();
    return serverError("Unhandled error", msg);
  }
});
