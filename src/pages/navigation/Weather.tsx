import { useEffect, useState } from "react";
import { startGpsTracking, stopGpsTracking } from "@/lib/navigation/gpsUtils";
import { reportNavigationIssue } from "@/lib/navigation/navEvents";

export default function Weather() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    startGpsTracking((pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(loc);
    });

    return () => stopGpsTracking();
  }, []);

  return (
    <div className="p-6 max-w-xl mx-auto text-yellow-200">
      <h1 className="text-3xl font-bold mb-4">Weather Conditions</h1>

      <div className="bg-black/40 border border-yellow-400/20 p-4 rounded-lg backdrop-blur-md shadow-md">
        {coords ? (
          <>
            <p className="mb-2 opacity-80">Current GPS Location:</p>
            <p className="font-semibold text-yellow-300">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
            <p className="mt-4 opacity-80">
              Weather data integration will be added in the next release.
            </p>
          </>
        ) : (
          <p className="opacity-80">Acquiring GPS location…</p>
        )}
      </div>
    </div>
  );
}
