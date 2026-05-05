import type { ToolName } from "./policy.ts";
import { canInvokeTool } from "./policy.ts";
import type { MemberRole } from "./org.ts";
import { supabaseServiceClient } from "./supabase.ts";

export type ToolResult = { ok: true; data: unknown } | { ok: false; error: string; details?: unknown };

export async function invokeTool(params: {
  role: MemberRole;
  module: any;
  tool: ToolName;
  organization_id: string;
  user_id: string;
  session_id: string;
  payload: any;
}): Promise<ToolResult> {
  const gate = canInvokeTool(params.role, params.module, params.tool);
  if (!gate.allowed) return { ok: false, error: "DENIED", details: gate.reason };

  const sb = supabaseServiceClient();

  // Minimal example tools — extend as needed.
  switch (params.tool) {
    case "read_dvir": {
      const { data, error } = await sb
        .from("dvir_inspections")
        .select("*")
        .eq("organization_id", params.organization_id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return { ok: false, error: "DB_ERROR", details: error.message };
      return { ok: true, data };
    }

    case "create_dvir": {
      const body = params.payload ?? {};
      const { data, error } = await sb
        .from("dvir_inspections")
        .insert({
          organization_id: params.organization_id,
          created_by: params.user_id,
          date: body.date ?? new Date().toISOString().slice(0, 10),
          vehicle_id: body.vehicle_id ?? null,
          checklist: body.checklist ?? {},
          notes: body.notes ?? null,
        })
        .select("*")
        .single();
      if (error) return { ok: false, error: "DB_ERROR", details: error.message };
      return { ok: true, data };
    }

    case "send_message": {
      const body = params.payload ?? {};
      const { data, error } = await sb
        .from("organization_messages")
        .insert({
          organization_id: params.organization_id,
          sender_id: params.user_id,
          body: String(body.body ?? "").slice(0, 4000),
        })
        .select("*")
        .single();
      if (error) return { ok: false, error: "DB_ERROR", details: error.message };
      return { ok: true, data };
    }

    // Stubbed / extend
    default:
      return { ok: false, error: "NOT_IMPLEMENTED", details: params.tool };
  }
}
