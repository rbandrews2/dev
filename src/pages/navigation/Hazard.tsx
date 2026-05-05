import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, Popup } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import { supabase } from "@/lib/supabase/client";
import { renderHazardsOffline } from "@/pages/navigation/hazardoverlay";
import { reportNavigationIssue } from "@/lib/navigation/navEvents";

export default function Hazard() {
  const [hazards, setHazards] = useState<any[]>([]);
  const mapRef = useRef<LeafletMap | null>(null);

  async function loadHazards() {
    try {
      const { data, error } = await supabase
        .from("hazard_zones")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;
      setHazards(data || []);
    } catch (err: any) {
      console.error("Hazard load error:", err);
      reportNavigationIssue("Hazard data failed", err.message);
    }
  }

  useEffect(() => {
    loadHazards();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    renderHazardsOffline(mapRef.current);
  }, []);

  function getColor(severity: string) {
    switch (severity) {
      case "high":
        return "red";
      case "medium":
        return "orange";
      default:
        return "yellow";
    }
  }

  return (
    <div className="relative w-full h-screen fade-in">
      <MapContainer
        ref={mapRef}
        center={{ lat: 37.27, lng: -79.94 }}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
/>

        {hazards.map((hz) => (
          <Marker key={hz.id} position={[hz.lat, hz.lng]}>
            <Popup>
              <div className="text-black">
                <strong>Hazard:</strong> {hz.title || "Zone"} <br />
                <strong>Severity:</strong>{" "}
                <span style={{ color: getColor(hz.severity) }}>
                  {hz.severity}
                </span>
                <br />
                {hz.description && (
                  <>
                    <strong>Description:</strong>
                    <br />
                    {hz.description}
                  </>
                )}
                <br />
                <small>
                  {hz.created_at
                    ? new Date(hz.created_at).toLocaleString()
                    : ""}
                </small>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* On-map overlay for refresh */}
      <div className="absolute top-4 right-4 z-40">
        <button
          onClick={loadHazards}
          className="px-4 py-2 bg-black/60 border border-yellow-400/30 text-yellow-200 rounded-md shadow hover:bg-black/50"
        >
          Refresh Hazards
        </button>
      </div>
    </div>
  );
}
