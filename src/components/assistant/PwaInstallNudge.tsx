import React, { useEffect, useState } from "react";

declare global {
  interface WindowEventMap {
    beforeinstallprompt: any;
  }
}

type DeferredPrompt = any;

const STORAGE_KEY_SEEN = "wzos_pwa_prompt_shown";
const STORAGE_KEY_REMIND = "wzos_pwa_prompt_remind";

const PwaInstallNudge: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPrompt | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);

      const seen = window.localStorage.getItem(STORAGE_KEY_SEEN) === "1";
      const remind = window.localStorage.getItem(STORAGE_KEY_REMIND) === "1";

      // First time or scheduled reminder -> show nudge
      if (!seen || remind) {
        setVisible(true);
        window.localStorage.setItem(STORAGE_KEY_SEEN, "1");
        window.localStorage.removeItem(STORAGE_KEY_REMIND);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (!visible || !deferredPrompt) return null;

  const handleInstall = async () => {
    setVisible(false);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        // Do nothing else; prompt won't show again
      } else {
        // User dismissed; set a one-time reminder for a future visit
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY_REMIND, "1");
        }
      }
    } catch (e) {
      console.error("PWA install prompt error", e);
    }
  };

  const handleClose = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      // Only remind once on a later visit
      window.localStorage.setItem(STORAGE_KEY_REMIND, "1");
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-black/90 border border-amber-500/40 rounded-2xl px-4 py-3 text-[11px] text-amber-50 shadow-[0_0_16px_rgba(255,179,0,0.45)] max-w-xs flex items-start gap-3">
        <div className="mt-0.5">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-black text-xs font-bold">
            WZ
          </span>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-xs">Install Work Zone OS</p>
          <p className="text-[11px] text-gray-200">
            Add the app to your home screen for one-tap access in the field.
          </p>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={handleInstall}
              className="px-3 py-1 rounded-full bg-amber-500 text-black text-[11px] font-semibold hover:bg-amber-400"
            >
              Install app
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-2 py-1 rounded-full border border-amber-500/40 text-[11px] text-amber-200 hover:bg-black/60"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallNudge;
