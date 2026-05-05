import { security } from "@/lib/security";

const provider = (import.meta.env.VITE_MAPS_PROVIDER as string | undefined) || "google";
const rawKey =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ||
  (import.meta.env.MAPS_API_KEY as string | undefined) ||
  (import.meta.env.VITE_MAPS_API_KEY as string | undefined) ||
  "";

const normalizedKey = rawKey.trim();

const defaultBaseUrl = provider === "google" ? "https://maps.googleapis.com" : "";

export const mapsConfig = {
  MAPS_PROVIDER: provider,
  MAPS_API_KEY: normalizedKey,
  MAPS_BASE_URL: (import.meta.env.VITE_MAPS_BASE_URL as string | undefined) || defaultBaseUrl,
  MAPS_EMBED_BASE_URL:
    (import.meta.env.VITE_MAPS_EMBED_BASE_URL as string | undefined) || "https://www.google.com/maps",
  REQUEST_TIMEOUT_MS: 8000,
  RETRY_COUNT: 1,
};

export function requireMapsApiKey(): string {
  if (!mapsConfig.MAPS_API_KEY) {
    security.logSecurityEvent("MAPS_API_KEY_MISSING", { source: "env" });
    throw new Error("Missing Maps API key. Set VITE_GOOGLE_MAPS_API_KEY.");
  }
  return mapsConfig.MAPS_API_KEY;
}
