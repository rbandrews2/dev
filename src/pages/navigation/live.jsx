import { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";

function OfflineTileLayer({ file }) {
  // Placeholder - replace with MBTiles rendering logic later
  if (!file) return null;

  return (
    <TileLayer
      attribution="(c) OpenStreetMap contributors"
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  );
}

export default function Navigator() {
  const [offlineFile, setOfflineFile] = useState(null);

  function loadOfflineMap() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".mbtiles";
    input.addEventListener("change", () => {
      const file = input.files?.[0] ?? null;
      setOfflineFile(file);
    });
    input.click();
  }

  return (
    <div className="w-full h-full flex flex-col">
      <h1 className="text-xl text-orange-400 font-semibold mb-4">
        GPS Navigation
      </h1>

      <button
        onClick={loadOfflineMap}
        className="px-4 py-2 mb-4 bg-orange-500 text-black rounded"
      >
        Load Offline Map
      </button>

      {/* Map MUST have explicit height */}
      <div className="w-full h-[70vh] rounded overflow-hidden">
        <MapContainer
          center={[37.27, -79.94]}
          zoom={11}
          className="w-full h-full"
        >
          {offlineFile ? (
            <OfflineTileLayer file={offlineFile} />
          ) : (
            <TileLayer
              attribution="(c) OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
