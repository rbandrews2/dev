// Google Maps Loader for Production Navigation Engine
import { loadMapsScript } from "@/lib/maps/client";
import { requireMapsApiKey } from "@/lib/maps/config";
import { security } from "@/lib/security";

let googleRef: any | null = null;
let loadingPromise: Promise<void> | null = null;

export async function loadGoogleMaps(): Promise<any> {
  if (googleRef) return googleRef;
  if (loadingPromise) {
    await loadingPromise;
    return googleRef;
  }

  requireMapsApiKey();

  loadingPromise = (async () => {
    await loadMapsScript("places");
    googleRef = (window as any).google;
    const src = document
      .querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
      ?.getAttribute("src");
    security.logSecurityEvent("GOOGLE_MAPS_LOADED", { url: src ?? "unknown" });
    if (!googleRef?.maps) {
      throw new Error("Maps library loaded without google.maps available. Check API key enablement.");
    }
  })();

  await loadingPromise;
  return googleRef;
}
