// src/lib/assistant/assistantMonitor.ts
import { reportToAdmin } from "./assistantReporter";
import { recordEvent } from "./assistantAnalytics";

export function startAssistantMonitor() {
  // JS Runtime Errors
  window.addEventListener("error", (e) => {
    recordEvent("runtime_error", { message: e.message, source: e.filename });
    reportToAdmin("Application Error", e.message);
  });

  // Unhandled Promise Rejections
  window.addEventListener("unhandledrejection", (e) => {
    recordEvent("promise_rejection", { reason: e.reason });
    reportToAdmin("Unhandled Rejection", String(e.reason));
  });

  // Periodic health probe
  setInterval(() => {
    const online = navigator.onLine;

    recordEvent("health_check", { online });

    if (!online) {
      recordEvent("offline_detected", {});
      return; // silent log, no admin alert yet
    }

    // Backend health endpoint
    fetch("/health")
      .then((res) => {
        if (!res.ok) throw new Error("Backend unhealthy");
      })
      .catch((err) => {
        reportToAdmin("Backend Health Failure", err.message);
        recordEvent("backend_health_fail", { error: err.message });
      });
  }, 15000);
}
