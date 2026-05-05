import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import { createOfflineLayer } from "@/pages/navigation/offlineMapUtils";
import { startGpsTracking, stopGpsTracking } from "@/lib/navigation/gpsUtils";
import { renderHazardsOffline } from "@/pages/navigation/hazardoverlay";
import BottomDrawer from "@/pages/navigation/BottomDrawer";
import { reportNavigationIssue } from "@/lib/navigation/navEvents";

type Props = {
  file?: File | null;
};

export default function OfflineMaps({ file }: Props) {
  const { state } = useLocation() as any;
  const { from, to, gpsLocation, file: stateFile } = state || {};

  const [offlineFile, setOfflineFile] = useState<File | null>(file || stateFile || null);
  const [currentPos, setCurrentPos] = useState<any>(gpsLocation || null);
  const [destination, setDestination] = useState<any>(null);
  const [distance, setDistance] = useState<number>(0);
  const [bearingLine, setBearingLine] = useState<any[]>([]);

  const mapRef = useRef<LeafletMap | null>(null);

  // Tap to choose destination
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        const dest = { lat: e.latlng.lat, lng: e.latlng.lng };
        setDestination(dest);
      },
    });
    return null;
  }

  // Haversine distance (meters)
  function calculateDistance(a: any, b: any) {
    const R = 6371000;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  // GPS Tracking
  useEffect(() => {
    startGpsTracking((pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCurrentPos(loc);

      if (destination) {
        setDistance(calculateDistance(loc, destination));
        setBearingLine([loc, destination]);
      }
    });

    return () => stopGpsTracking();
  }, [destination]);

  // If navigationHome has a typed destination, geocode isn't available offline,
  // so we gracefully skip it and require map tap OR coordinates.
  useEffect(() => {
    if (!to || !/^-?\d+\.\d+,\s?-?\d+\.\d+$/.test(to)) {
      // TO is not coordinates — offline cannot resolve addresses
      return;
    }

    const [lat, lng] = to.split(",").map(Number);
    setDestination({ lat, lng });
  }, [to]);

  // Initialize Offline Map + Hazards
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    (async () => {
      try {
        if (offlineFile) {
          const layer = await createOfflineLayer(offlineFile);
          if (layer) {
            layer.addTo(map);
          }
        }

        renderHazardsOffline(map);
      } catch (err: any) {
        console.error("Offline layer load failed:", err);
        reportNavigationIssue("Offline map failed", err.message);
      }
    })();
  }, [offlineFile]);

  return (
    <div className="relative w-full h-screen fade-in">
      <MapContainer
        center={currentPos || { lat: 37.27, lng: -79.94 }}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
      >
        <MapClickHandler />

        {/* GPS Marker */}
        {currentPos && <Marker position={currentPos}></Marker>}

        {/* Destination Marker */}
        {destination && <Marker position={destination}></Marker>}

        {/* Bearing Line */}
        {bearingLine.length === 2 && (
          <Polyline positions={bearingLine} color="orange" weight={4} />
        )}
      </MapContainer>

      {/* Drawer */}
      <BottomDrawer
        offline
        offlineDistance={distance}
      />
    </div>
  );
}
