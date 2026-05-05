import type { AtlasModule } from "./policy.ts";

export type SessionContext = {
  module: AtlasModule;
  route: string;
  device?: string | null;
  timezone?: string | null;
  page_context?: Record<string, unknown>;
  last_seen_at?: string;
};

export function normalizeModule(maybe: string): AtlasModule {
  const v = (maybe || "").toLowerCase();
  const allowed: AtlasModule[] = [
    "dashboard","forms","dvir","c85","jsa","incident","training","timeclock",
    "messages","dispatch","navigation","videoconference","admin",
  ];
  return (allowed as string[]).includes(v) ? (v as AtlasModule) : "dashboard";
}
