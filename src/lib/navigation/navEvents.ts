import { supabase } from "@/lib/supabase/client";
import {
  recordEvent,
  trackNavigationIssue,
} from "@/lib/assistant/assistantAnalytics";
import { sanitizePayload } from "@/lib/security";

/**
 * Unified navigation issue reporter.
 * - Logs locally (analytics queue)
 * - Sends structured analytics (trackNavigationIssue)
 * - Inserts into Supabase system_events table
 */
export async function reportNavigationIssue(
  title: string,
  detail: string
) {
  try {
    // 1. Local analytics (original behavior preserved)
    recordEvent("navigation_issue", { title, detail }, {
      eventType: "navigation",
      severity: "warning",
      source: "navEvents",
    });

    // 2. New structured analytics
    trackNavigationIssue({
      title,
      detail,
      path:
        typeof window !== "undefined"
          ? window.location.pathname
          : undefined,
    });

    // 3. Attempt remote insert
    const { error } = await supabase.from("system_events").insert(
      sanitizePayload({
        level: "warning",
        source: "navigation",
        title,
        message: detail,
        created_at: new Date().toISOString(),
        read: false,
      })
    );

    // 4. If Supabase fails, log analytics error
    if (error) {
      console.error("Supabase event insert failed:", error);

      recordEvent(
        "navigation_issue_local_fail",
        {
          title,
          detail,
          error: error.message,
        },
        {
          eventType: "navigation",
          severity: "error",
          source: "navEvents",
        }
      );
    }
  } catch (err: any) {
    console.error("Navigation reporting failure:", err);

    recordEvent(
      "navigation_issue_fatal",
      {
        title,
        detail,
        error: err.message,
      },
      {
        eventType: "navigation",
        severity: "critical",
        source: "navEvents",
      }
    );
  }
}

/**
 * Reports fatal navigator-load failures
 * Clean wrapper for severe errors / startup crashes.
 */
export function reportNavigatorStartupFailure(error: any) {
  reportNavigationIssue("Navigator failed to start", String(error));
}
