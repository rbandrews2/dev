import L from "leaflet";
import { supabase } from "@/lib/supabase/client";

// Uses the Google Maps instance on the window; guard so TS doesn't require @types/google.maps
export async function renderHazardsOnline(map: any) {
  const g = (window as any).google;
  if (!g?.maps) return;

  const { data } = await supabase.from("hazard_zones").select("*");

  data?.forEach((hz) => {
    new g.maps.Marker({
      position: { lat: hz.lat, lng: hz.lng },
      map,
      icon: {
        path: g.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillOpacity: 0.8,
        fillColor:
          hz.severity === "high"
            ? "red"
            : hz.severity === "medium"
            ? "orange"
            : "yellow",
      },
    });
  });
}

export async function renderHazardsOffline(map: L.Map) {
  if (!map) return;

  const { data } = await supabase.from("hazard_zones").select("*");

  data?.forEach((hz) => {
    L.circleMarker([hz.lat, hz.lng], {
      radius: 6,
      color:
        hz.severity === "high"
          ? "red"
          : hz.severity === "medium"
          ? "orange"
          : "yellow",
      fillOpacity: 0.9,
    }).addTo(map);
  });
}
