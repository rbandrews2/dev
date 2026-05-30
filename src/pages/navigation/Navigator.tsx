import { useEffect, useState } from "react";
import OnlineNavigator from "@/pages/navigation/OnlineNavigator";
import OfflineNavigator from "@/pages/navigation/OfflineMaps"
import { getOfflineMapFile } from "@/pages/navigation/offlineMapUtils";

export default function Navigator() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [offlineMap, setOfflineMap] = useState<File | null>(null);

  useEffect(() => {
    // Listen for connection changes
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Load offline map if stored
    getOfflineMapFile().then((file) => {
      if (file) setOfflineMap(file);
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // OFFLINE MODE: map file required
  if (!online && offlineMap) {
    return <OfflineNavigator file={offlineMap} />;
  }

  // ONLINE MODE: requires internet
  if (online) {
    return <OnlineNavigator />;
  }

  // If offline but no map downloaded
  return (
    <div className="p-6 text-orange-300">
      <h1 className="text-xl font-semibold mb-2">Offline Navigation Unavailable</h1>
      <p>You are offline and do not have an offline map downloaded.</p>
      <p className="mt-2">Go to: Navigation → Offline Maps to download your state.</p>
    </div>
  );
}
