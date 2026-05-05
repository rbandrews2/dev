import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/pages/navigation/directionsUtils";
import { startGpsTracking, stopGpsTracking } from "@/lib/navigation/gpsUtils";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/GlassCard";
import { AlertTriangle, Map, MapPin as PinIcon, WifiOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import SignInGate from "@/components/auth/SignInGate";

export default function NavigationHome() {
  const { user } = useAuth() as any;
  const navigate = useNavigate();

  const [from, setFrom] = useState<string>("Determining current locationƒ?İ");
  const [to, setTo] = useState<string>("");
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [autocomplete, setAutocomplete] = useState<any>(null);
  const [mapStatus, setMapStatus] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);

  // Load Google Autocomplete for "TO" and initialize the lightweight map preview
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        setMapStatus("Loading map…");
        const google = await loadGoogleMaps();
        if (cancelled) return;

        const input = document.getElementById("toField") as HTMLInputElement;

        if (input) {
          const ac = new google.maps.places.Autocomplete(input, {
            fields: ["geometry", "formatted_address", "name"],
          });
          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            if (place?.geometry?.location) {
              setTo(place.formatted_address || place.name || "");
            }
          });
          setAutocomplete(ac);
        }

        if (mapRef.current && !mapInstance.current) {
          mapInstance.current = new google.maps.Map(mapRef.current, {
            center: gpsLocation || { lat: 39.8283, lng: -98.5795 }, // continental US midpoint
            zoom: 5,
            disableDefaultUI: true,
            gestureHandling: "greedy",
            mapTypeControl: false,
          });
          setMapStatus(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to render map preview.";
        setMapStatus(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, gpsLocation]);

  // GPS auto-fill "FROM" and keep preview centered
  useEffect(() => {
    if (!user) return;
    startGpsTracking((pos) => {
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      setGpsLocation(coords);
      if (from.startsWith("Determining")) {
        setFrom(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
      }
      if (mapInstance.current) {
        mapInstance.current.setCenter(coords);
        mapInstance.current.setZoom(10);
      }
    });

    return () => stopGpsTracking();
  }, [user, from]);

  function handleOnlineNav() {
    if (!to) return alert("Please enter a destination.");
    navigate("/navigation/live", { state: { from, to, gpsLocation } });
  }

  function handleOfflineNav() {
    if (!to) return alert("Please enter a destination.");
    navigate("/navigation/offline", { state: { from, to, gpsLocation } });
  }

  if (!user) {
    return (
      <SignInGate
        label="Navigation"
        title="Online & offline routing."
        description="Sign in to plan routes, view hazards, weather, and offline maps."
        icon={<Map className="h-5 w-5" />}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-3xl w-full mx-auto text-yellow-200">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl border border-amber-400/40 bg-black/60 flex items-center justify-center text-amber-300">
          <Map className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Navigation</h1>
          <p className="text-sm text-yellow-100/75">
            Online & offline routing with hazard awareness.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-400/25 bg-black/60 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div ref={mapRef} className="w-full min-h-[260px]" />
        <div className="px-4 py-2 text-[11px] text-yellow-100/70 bg-black/50 border-t border-amber-400/20 flex items-center justify-between gap-3">
          <span>Lightweight embed for quick situational awareness. Interactive routing loads after you start navigation.</span>
          {mapStatus && <span className="text-red-200">{mapStatus}</span>}
        </div>
      </div>

      <GlassCard className="p-5 space-y-4">
        <div>
          <label className="block mb-2 text-sm font-semibold">From (Starting Point)</label>
          <input
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full p-3 bg-black/40 border border-yellow-400/20 rounded-md text-yellow-100"
            placeholder="Enter starting point or use GPS"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold">To (Destination)</label>
          <input
            id="toField"
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full p-3 bg-black/40 border border-yellow-400/20 rounded-md text-yellow-100"
            placeholder="Enter destinationƒ?İ"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleOnlineNav}
            className="p-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-md shadow-lg transition"
          >
            Start Online Navigation
          </button>

          <button
            onClick={handleOfflineNav}
            className="p-4 bg-orange-600 hover:bg-orange-500 text-black font-bold rounded-md shadow-lg transition"
          >
            Start Offline Navigation
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/navigation/hazard")}
            className="p-4 bg-black/40 border border-yellow-400/20 rounded-md hover:bg-black/30 flex items-center justify-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" /> View Hazard Map
          </button>

          <button
            onClick={() => navigate("/navigation/weather")}
            className="p-4 bg-black/40 border border-yellow-400/20 rounded-md hover:bg-black/30 flex items-center justify-center gap-2"
          >
            <PinIcon className="h-4 w-4" /> Weather Conditions
          </button>
        </div>

        <p className="text-xs text-yellow-100/70 flex items-center gap-2">
          <WifiOff className="h-4 w-4" /> Offline routing expects coordinates or a tapped map destination.
        </p>
      </GlassCard>
    </div>
  );
}
