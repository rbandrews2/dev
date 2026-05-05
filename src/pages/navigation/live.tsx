import { useState } from "react";
import { MapContainer, TileLayer, AttributionControl } from "react-leaflet";

type OfflineTileLayerProps = { file: File | null };

function OfflineTileLayer({ file }: OfflineTileLayerProps) {
  if (!file) return null;

  return (
    <>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <AttributionControl
        position="bottomright"
        prefix="Work Zone OS ƒ?› Ac OpenStreetMap contributors"
      />
    </>
  );
}

export default function Navigator() {
  const [offlineFile, setOfflineFile] = useState<File | null>(null);

  function loadOfflineMap() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".mbtiles";
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      const file = target?.files?.[0] || null;
      setOfflineFile(file);
    };
    input.click();
  }

  return (
    <div className="w-full h-full flex flex-col">
      <h1 className="text-xl text-yellow-400 font-semibold mb-4">
        GPS Navigation
      </h1>

      <button
        onClick={loadOfflineMap}
        className="px-4 py-2 mb-4 bg-yellow-500 text-black rounded"
      >
        Load Offline Map
      </button>

      <div className="w-full h-[70vh] rounded overflow-hidden">
        <MapContainer
          center={[37.27, -79.94]}
          zoom={11}
          className="w-full h-full"
        >
          {offlineFile ? (
            <OfflineTileLayer file={offlineFile} />
          ) : (
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
