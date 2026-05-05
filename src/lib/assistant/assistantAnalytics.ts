// src/lib/assistant/assistantAnalytics.ts

import { supabase } from "@/lib/supabase/client";
import { sanitizePayload } from "@/lib/security";

// Allow analytics writes to be toggled off (prevents 401 noise when RLS/keys aren't set).
const ANALYTICS_WRITE_ENABLED = import.meta.env.VITE_ENABLE_ANALYTICS === "true";

/**
 * High-level categories for analytics.
 */
export type AnalyticsEventType =
  | "assistant"
  | "navigation"
  | "training"
  | "dvir"
  | "incident"
  | "auth"
  | "system"
  | "custom";

/**
 * Severity levels for events.
 */
export type AnalyticsSeverity = "info" | "warning" | "error" | "critical";

/**
 * Canonical event names for Work Zone OS.
 * You can extend this safely over time.
 */
export type AnalyticsEventName =
  | "assistant_opened"
  | "assistant_closed"
  | "assistant_message_sent"
  | "assistant_message_received"
  | "assistant_error"
  | "navigation_issue_reported"
  | "page_view"
  | "dvir_submitted"
  | "incident_report_submitted"
  | "time_off_request_submitted"
  | "training_module_started"
  | "training_module_completed"
  | "training_quiz_attempted"
  | "auth_login"
  | "auth_logout"
  | "system_error"
  | "custom";

/**
 * Shape of the payload we persist with each event.
 * Keep this flexible: different events will send different keys.
 */
export type AnalyticsPayload = Record<string, unknown>;

/**
 * Options for fine-tuning how an event is recorded.
 */
export interface AnalyticsOptions {
  eventType?: AnalyticsEventType;
  severity?: AnalyticsSeverity;
  source?: string; // e.g., "dashboard", "assistant_bubble", "mobile_nav"
  path?: string;   // usually window.location.pathname
  metadata?: Record<string, unknown>;
  userId?: string | null;
  /**
   * If you already have a session ID from higher-level app context,
   * you can pass it in. Otherwise, we use the internal session generator.
   */
  sessionId?: string | null;
}

/**
 * Internal in-memory event representation.
 */
interface QueuedAnalyticsEvent {
  event_name: string;
  event_type: AnalyticsEventType;
  severity: AnalyticsSeverity;
  source: string | null;
  path: string | null;
  payload: AnalyticsPayload | null;
  metadata: Record<string, unknown> | null;
  user_id: string | null;
  session_id: string | null;
  created_at?: string;
}

/**
 * Local/session helpers
 */

const SESSION_STORAGE_KEY = "wzos_analytics_session_id";

let cachedSessionId: string | null = null;
let isFlushing = false;
let flushTimer: number | null = null;
const eventQueue: QueuedAnalyticsEvent[] = [];

/**
 * Generate a lightweight, unique-ish session id.
 */
function generateSessionId(): string {
  const random = Math.random().toString(36).slice(2);
  const ts = Date.now().toString(36);
  return `wzos_${ts}_${random}`;
}

/**
 * Get or create a session id, persisting it in localStorage when available.
 */
export function getAnalyticsSessionId(): string | null {
  if (cachedSessionId) return cachedSessionId;

  if (typeof window === "undefined") {
    // No window (SSR), just create an ephemeral session id in memory
    cachedSessionId = generateSessionId();
    return cachedSessionId;
  }

  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      cachedSessionId = existing;
      return cachedSessionId;
    }

    const fresh = generateSessionId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, fresh);
    cachedSessionId = fresh;
    return cachedSessionId;
  } catch {
    // localStorage may be blocked; fall back to in-memory
    cachedSessionId = generateSessionId();
    return cachedSessionId;
  }
}

/**
 * Enqueue an event and schedule a flush.
 */
function enqueueEvent(event: QueuedAnalyticsEvent) {
  // If analytics is disabled, drop the event silently to avoid 401 spam.
  if (!ANALYTICS_WRITE_ENABLED) return;

  eventQueue.push(event);
  scheduleFlush();
}

/**
 * Schedule a flush using a small debounce.
 */
function scheduleFlush() {
  if (typeof window === "undefined") {
    // In SSR or non-window context, we'll flush immediately to avoid leaks.
    void flushEvents();
    return;
  }

  if (flushTimer != null) return;

  // ~2 seconds debounce is usually enough to batch a few events
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushEvents();
  }, 2000);
}

/**
 * Flush the in-memory queue to Supabase.
 */
async function flushEvents() {
  if (isFlushing) return;
  if (!eventQueue.length) return;
  if (!ANALYTICS_WRITE_ENABLED) {
    eventQueue.length = 0;
    return;
  }

  isFlushing = true;

  // Take a snapshot of the queue
  const batch = eventQueue.splice(0, eventQueue.length);

  try {
    const payload = batch.map((event) =>
      sanitizePayload({
        event_name: event.event_name,
        event_type: event.event_type,
        severity: event.severity,
        source: event.source,
        path: event.path,
        payload: event.payload,
        metadata: event.metadata,
        user_id: event.user_id,
        session_id: event.session_id,
        created_at: event.created_at ?? new Date().toISOString(),
      })
    );

    const { error } = await supabase.from("analytics_events").insert(payload);

    if (error) {
      // If unauthorized or RLS blocked, log once and drop to avoid noisy retries.
      if ((error as any)?.status === 401 || (error as any)?.code === "401") {
        console.warn("[Analytics] Unauthorized to write analytics_events; dropping batch.");
        return;
      }

      // If Supabase is down or network fails, log and re-enqueue so we don't lose data.
      console.warn("[Analytics] Failed to insert events:", error.message);
      eventQueue.unshift(...batch);
    }
  } catch (err) {
    console.warn("[Analytics] Unexpected error while flushing events:", err);
    // Optional: re-queue to try again later
    eventQueue.unshift(...batch);
  } finally {
    isFlushing = false;
  }
}

/**
 * Public core function: record a single analytics event.
 *
 * This is what you call from anywhere in the app.
 */
export function recordEvent(
  eventName: AnalyticsEventName | string,
  payload: AnalyticsPayload = {},
  options: AnalyticsOptions = {}
): void {
  if (!ANALYTICS_WRITE_ENABLED) return;

  const {
    eventType = "custom",
    severity = "info",
    source = null,
    path = typeof window !== "undefined" ? window.location?.pathname ?? null : null,
    metadata = null,
    userId = null,
    sessionId = getAnalyticsSessionId(),
  } = options;

  const event: QueuedAnalyticsEvent = {
    event_name: eventName,
    event_type: eventType,
    severity,
    source,
    path,
    payload: Object.keys(payload).length ? payload : null,
    metadata,
    user_id: userId ?? null,
    session_id: sessionId ?? null,
  };

  enqueueEvent(event);
}

/**
 * Optionally expose a manual flush, e.g. when logging out or closing the app.
 */
export async function flushAnalyticsNow(): Promise<void> {
  await flushEvents();
}

/**
 * Auto-flush on page unload when possible.
 * This keeps data loss low if the tab is closed.
 */
if (typeof window !== "undefined") {
  const handler = () => {
    // Fire and forget; we can't await in beforeunload reliably.
    void flushEvents();
  };

  window.addEventListener("beforeunload", handler);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void flushEvents();
    }
  });
}

/**
 * Convenience helpers for common Work Zone OS events.
 * These all delegate to recordEvent with proper types.
 */

export function trackAssistantOpened(source: string = "assistant_bubble") {
  recordEvent(
    "assistant_opened",
    {},
    {
      eventType: "assistant",
      severity: "info",
      source,
    }
  );
}

export function trackAssistantClosed(source: string = "assistant_bubble") {
  recordEvent(
    "assistant_closed",
    {},
    {
      eventType: "assistant",
      severity: "info",
      source,
    }
  );
}

export function trackAssistantMessageSent(args: {
  contentLength: number;
  model?: string;
  source?: string;
}) {
  recordEvent(
    "assistant_message_sent",
    {
      content_length: args.contentLength,
      model: args.model ?? null,
    },
    {
      eventType: "assistant",
      severity: "info",
      source: args.source ?? "assistant_panel",
    }
  );
}

export function trackAssistantMessageReceived(args: {
  contentLength: number;
  model?: string;
  source?: string;
}) {
  recordEvent(
    "assistant_message_received",
    {
      content_length: args.contentLength,
      model: args.model ?? null,
    },
    {
      eventType: "assistant",
      severity: "info",
      source: args.source ?? "assistant_panel",
    }
  );
}

export function trackAssistantError(error: unknown, context: Record<string, unknown> = {}) {
  recordEvent(
    "assistant_error",
    {
      error: error instanceof Error ? error.message : String(error),
      ...context,
    },
    {
      eventType: "assistant",
      severity: "error",
      source: "assistant",
    }
  );
}

export function trackNavigationIssue(args: {
  title: string;
  detail: string;
  path?: string;
}) {
  recordEvent(
    "navigation_issue_reported",
    {
      title: args.title,
      detail: args.detail,
    },
    {
      eventType: "navigation",
      severity: "warning",
      path: args.path,
      source: "user_report",
    }
  );
}

export function trackPageView(pathOverride?: string) {
  recordEvent(
    "page_view",
    {},
    {
      eventType: "navigation",
      severity: "info",
      path: pathOverride,
      source: "router",
    }
  );
}

export function trackDVIRSubmitted(args: { vehicleId: string; hasDefects: boolean }) {
  recordEvent(
    "dvir_submitted",
    {
      vehicle_id: args.vehicleId,
      has_defects: args.hasDefects,
    },
    {
      eventType: "dvir",
      severity: "info",
      source: "dvir_form",
    }
  );
}

export function trackIncidentReportSubmitted(args: { severity: string; hasInjury: boolean }) {
  recordEvent(
    "incident_report_submitted",
    {
      severity: args.severity,
      has_injury: args.hasInjury,
    },
    {
      eventType: "incident",
      severity: "info",
      source: "incident_form",
    }
  );
}

export function trackAuthLogin(userId?: string | null) {
  recordEvent(
    "auth_login",
    {},
    {
      eventType: "auth",
      severity: "info",
      source: "auth",
      userId: userId ?? null,
    }
  );
}

export function trackAuthLogout(userId?: string | null) {
  recordEvent(
    "auth_logout",
    {},
    {
      eventType: "auth",
      severity: "info",
      source: "auth",
      userId: userId ?? null,
    }
  );
}
