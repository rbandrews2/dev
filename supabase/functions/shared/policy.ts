import type { MemberRole } from "./org.ts";

export type AtlasModule =
  | "dashboard"
  | "forms"
  | "dvir"
  | "c85"
  | "jsa"
  | "incident"
  | "training"
  | "timeclock"
  | "messages"
  | "dispatch"
  | "navigation"
  | "videoconference"
  | "admin";

export type ToolName =
  | "read_dvir"
  | "create_dvir"
  | "submit_form"
  | "list_training_courses"
  | "get_timesheet"
  | "clock_in"
  | "clock_out"
  | "send_message"
  | "export_csv"
  | "export_pdf"
  | "admin_assign_course"
  | "admin_view_completions";

export type PolicyResult = { allowed: boolean; reason?: string };

const memberAllowed: ToolName[] = [
  "read_dvir",
  "create_dvir",
  "submit_form",
  "list_training_courses",
  "get_timesheet",
  "clock_in",
  "clock_out",
  "send_message",
];

const adminAllowed: ToolName[] = [
  ...memberAllowed,
  "export_csv",
  "export_pdf",
  "admin_view_completions",
  "admin_assign_course",
];

const ownerAllowed: ToolName[] = [...adminAllowed];

export function allowedToolsForRole(role: MemberRole): ToolName[] {
  if (role === "owner") return ownerAllowed;
  if (role === "admin") return adminAllowed;
  return memberAllowed;
}

export function canInvokeTool(role: MemberRole, module: AtlasModule, tool: ToolName): PolicyResult {
  // Global role allowlist
  const allowed = allowedToolsForRole(role);
  if (!allowed.includes(tool)) return { allowed: false, reason: "ROLE_DENY" };

  // Module scoping: prevent admin-only tools outside admin areas unless explicitly allowed
  const adminOnlyTools: ToolName[] = ["admin_assign_course", "admin_view_completions"];
  if (adminOnlyTools.includes(tool) && !(role === "admin" || role === "owner")) {
    return { allowed: false, reason: "ADMIN_ONLY" };
  }

  // Example: exports only in admin or forms contexts
  const exportTools: ToolName[] = ["export_csv", "export_pdf"];
  if (exportTools.includes(tool) && !["admin", "forms", "training"].includes(module)) {
    return { allowed: false, reason: "MODULE_DENY" };
  }

  return { allowed: true };
}
