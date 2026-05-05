// Minimal reporter fallback used by assistantMonitor.
// In production this could post to an admin endpoint or logging service.
export function reportToAdmin(subject: string, message: string) {
  console.warn(`[AssistantReport] ${subject}: ${message}`);
}
