import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { getHazards, createHazard } from "@/lib/hazard/hazardApi";
import { useAuth } from "@/contexts/AuthContext";

type Hazard = {
  id: string;
  title: string;
  description?: string | null;
  lat: number;
  lng: number;
  severity: "low" | "medium" | "high";
};

const severityColors = {
  low: "yellow",
  medium: "orange",
  high: "red",
};

function AddHazardClick({ isAdmin }: { isAdmin: boolean }) {
  useMapEvents({
    click: async (e) => {
      if (!isAdmin) return;

      const title = prompt("Hazard Title:");
      if (!title) return;

      const severity = prompt("Severity? low / medium / high", "low");

      await createHazard({
        title,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        severity: severity === "medium" || severity === "high" ? severity : "low",
      });

      window.location.reload();
    },
  });

  return null;
}

export default function HazardMapPanel() {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.org_creator === true;

  const [hazards, setHazards] = useState<Hazard[]>([]);

  useEffect(() => {
    (async () => {
      const hz = await getHazards();
      setHazards(hz);
    })();
  }, []);

  return (
    <div className="w-full h-[70vh] rounded-xl overflow-hidden shadow-xl">
      <MapContainer
        center={[37.271, -79.941]} // Roanoke default
        zoom={11}
        className="w-full h-full"
      >
        <TileLayer
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {hazards.map((h) => (
          <Marker
            key={h.id}
            position={[h.lat, h.lng]}
          >
            <Popup>
              <h2 className="font-semibold">{h.title}</h2>
              <p className="text-sm">{h.description || "No description"}</p>
              <p className="text-xs">Severity: {h.severity}</p>
            </Popup>
          </Marker>
        ))}

        <AddHazardClick isAdmin={isAdmin} />
      </MapContainer>
    </div>
  );
}
