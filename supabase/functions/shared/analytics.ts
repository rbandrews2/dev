import { supabaseServiceClient } from "./supabase.ts";

export async function recordEvent(params: {
  organization_id: string;
  user_id: string;
  session_id?: string | null;
  event_type: string;
  module?: string | null;
  route?: string | null;
  payload?: Record<string, unknown>;
}) {
  const sb = supabaseServiceClient();
  await sb.from("assistant_events").insert({
    organization_id: params.organization_id,
    user_id: params.user_id,
    session_id: params.session_id ?? null,
    event_type: params.event_type,
    module: params.module ?? null,
    route: params.route ?? null,
    payload: params.payload ?? {},
  });
}
