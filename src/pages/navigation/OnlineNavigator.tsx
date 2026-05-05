import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { loadGoogleMaps } from "@/pages/navigation/directionsUtils";
import { startGpsTracking, stopGpsTracking } from "@/lib/navigation/gpsUtils";
import { renderHazardsOnline } from "@/pages/navigation/hazardoverlay";
import BottomDrawer from "@/pages/navigation/BottomDrawer";
import { reportNavigationIssue } from "@/lib/navigation/navEvents";

type LatLngLiteral = { lat: number; lng: number };
type MapLike = { panTo: (loc: LatLngLiteral) => void };
type DirectionsRendererLike = { setMap: (map: unknown) => void; setDirections: (dir: unknown) => void } | null;
type Step = {
  instruction: string;
  distance?: string;
  duration?: string;
  maneuver?: string;
  start: LatLngLiteral;
};

type NavState = {
  from?: string;
  to?: string;
  gpsLocation?: LatLngLiteral | null;
};

export default function OnlineNavigator() {
  // Data passed from NavigationHome
  const { state } = useLocation() as { state?: NavState };
  const { from, to, gpsLocation } = state || {};

  const mapRef = useRef<MapLike | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const initialCenter = useRef<LatLngLiteral>(gpsLocation || { lat: 37.27, lng: -79.94 });

  const [steps, setSteps] = useState<Step[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [currentPos, setCurrentPos] = useState<LatLngLiteral | null>(gpsLocation || null);

  const [directionsRenderer, setDirectionsRenderer] = useState<DirectionsRendererLike>(null);

  // Voice engine
  function speak(text: string) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      speechSynthesis.speak(u);
    } catch (err) {
      console.warn("Voice synthesis error:", err);
    }
  }

  // INITIALIZE MAP
  useEffect(() => {
    (async () => {
      try {
        const google = await loadGoogleMaps();

        if (!mapEl.current) return;

        const map = new google.maps.Map(mapEl.current, {
          center: initialCenter.current,
          zoom: 13,
          mapTypeId: "roadmap",
          gestureHandling: "greedy",
          disableDefaultUI: true,
        });

        mapRef.current = map;
        setLoaded(true);

        // Render hazards
        renderHazardsOnline(map);
      } catch (err: unknown) {
        console.error("Map load failure:", err);
        reportNavigationIssue("Maps failed to load", err instanceof Error ? err.message : "Unknown error");
      }
    })();
  }, []);

  // GPS tracking
  useEffect(() => {
    startGpsTracking((pos) => {
      const newLoc = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      setCurrentPos(newLoc);

      // Keep map centered as worker moves
      if (mapRef.current) {
        mapRef.current.panTo(newLoc);
      }
    });

    return () => stopGpsTracking();
  }, []);

  // REQUEST DIRECTIONS
  useEffect(() => {
    async function fetchRoute() {
      if (!loaded || !mapRef.current) return;
      if (!to) {
        alert("Missing destination.");
        return;
      }

      try {
        const google = await loadGoogleMaps();

        const svc = new google.maps.DirectionsService();
        const renderer = new google.maps.DirectionsRenderer({
          suppressMarkers: true,
          preserveViewport: true,
        });

        renderer.setMap(mapRef.current);
        setDirectionsRenderer(renderer);

        const origin =
          from?.includes(",") && !isNaN(Number(from.split(",")[0]))
            ? from
            : currentPos;

        const result = await svc.route({
          origin,
          destination: to,
          travelMode: google.maps.TravelMode.DRIVING,
        });

        renderer.setDirections(result);

        const leg = result.routes[0].legs[0];
        const parsed: Step[] = leg.steps.map((step: any) => ({
          instruction: step.instructions,
          distance: step.distance?.text,
          duration: step.duration?.text,
          maneuver: step.maneuver,
          start: step.start_location.toJSON() as LatLngLiteral,
        }));

        setSteps(parsed);

        // Voice first instruction
        if (parsed[0]) speak(parsed[0].instruction);
      } catch (err: unknown) {
        console.error(err);
        reportNavigationIssue(
          "Directions API failed",
          err instanceof Error ? err.message : "Unknown error"
        );
        alert("Navigation could not be started. Please check your signal.");
      }
    }

    fetchRoute();
  }, [loaded, to, from, currentPos]);

  return (
    <div className="relative w-full h-screen fade-in">
      <div ref={mapEl} className="absolute inset-0" />

      {/* Directions Drawer */}
      <BottomDrawer steps={steps} />
    </div>
  );
}
