// src/lib/assistant/assistantIdleEngine.ts
// Lightweight local analytics stub to avoid missing module during build
function recordEvent(event: string, payload?: Record<string, unknown>) {
  // noop - replace with real analytics implementation if available
  try {
    const globalRecord = (globalThis as any).recordEvent;
    if (typeof globalRecord === "function") {
      globalRecord(event, payload);
    }
  } catch {
    // swallow errors in environments without globalThis or recordEvent
  }
}

let lastInteraction = Date.now();
let lastReminder = 0;

// Called externally by AppLayout / global listeners
export function markUserActive() {
  lastInteraction = Date.now();
}

export function startIdleEngine(showReminder: () => void) {
  setInterval(() => {
    const now = Date.now();
    const idleMinutes = (now - lastInteraction) / (1000 * 60);
    const sinceLast = (now - lastReminder) / (1000 * 60);

    // Tab must be focused
    if (document.visibilityState !== "visible") return;

    if (idleMinutes >= 60 && sinceLast >= 60) {
      showReminder();
      lastReminder = now;

      recordEvent("assistant_idle_reminder", {
        idleMinutes,
      });
    }
  }, 60000); // Check every minute
}
