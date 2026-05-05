/**
 * Placeholder: Gemini Vision adapter.
 * Use this if/when Atlas needs image understanding (e.g., work zone photos, incident photos).
 * Keep it server-side. Do NOT ship keys to client.
 */
export async function geminiVisionDescribe(_imageBase64: string, _prompt: string) {
  throw new Error("Gemini Vision adapter not configured in this pack.");
}
