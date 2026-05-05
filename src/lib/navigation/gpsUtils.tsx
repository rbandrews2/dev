// GPS Utility — Production Ready
// Handles high-accuracy real-time GPS tracking with error fallback.

type GpsCallback = (pos: GeolocationPosition) => void;

let watchId: number | null = null;

export function startGpsTracking(callback: GpsCallback) {
  if (!navigator.geolocation) {
    console.warn("GPS not supported on this device.");
    return;
  }

  // Stop existing watcher if multiple modules load
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);

  watchId = navigator.geolocation.watchPosition(
    callback,
    (err) => {
      console.error("GPS error:", err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 5000,
    }
  );
}

export function stopGpsTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}
