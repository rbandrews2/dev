import React, { useEffect, useMemo, useState } from "react";
import { Download, X } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";

export const PWAInstallCard: React.FC = () => {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("wzos_pwa_nudge_dismissed") === "1";
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  const isStandalone = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    );
  }, []);

  if (dismissed || isInstalled || isStandalone || (!ready && !isInstallable)) return null;

  const handleDismiss = () => {
    window.localStorage.setItem("wzos_pwa_nudge_dismissed", "1");
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (isInstallable) {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        handleDismiss();
      }
      return;
    }
    window.localStorage.setItem("wzos_install_intent", "1");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-lg border border-orange-400/50 bg-zinc-950/95 p-4 text-orange-50 shadow-2xl shadow-black/40 backdrop-blur">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-md p-1 text-orange-100/70 hover:bg-white/10 hover:text-orange-50"
        aria-label="Dismiss install prompt"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="mb-2 flex items-center gap-2 pr-7 font-semibold text-orange-200">
        <Download className="h-4 w-4" />
        Install Work Zone OS
      </div>
      <p className="mb-3 text-sm leading-5 text-zinc-200">
        Add the app to this device for faster launch, field access, and a full-screen crew workflow.
      </p>
      {!isInstallable && (
        <p className="mb-3 text-xs leading-5 text-zinc-300">
          If your browser does not show the install prompt, use the browser menu and choose Install app or Add to Home Screen.
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="bg-orange-400 text-black hover:bg-orange-300"
          onClick={handleInstall}
        >
          {isInstallable ? "Install App" : "Got it"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-orange-400/40 bg-transparent text-orange-100 hover:bg-white/10 hover:text-orange-50"
          onClick={handleDismiss}
        >
          Later
        </Button>
      </div>
    </div>
  );
};
