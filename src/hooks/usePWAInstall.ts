import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Window {
    __wzosInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingRegistration, setWaitingRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const detectInstalled = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
      const installedFlag = localStorage.getItem("wzos_pwa_installed") === "1";
      setIsInstalled(Boolean(standalone || installedFlag));
    };

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleCachedPrompt = (event: Event) => {
      const prompt = (event as CustomEvent<BeforeInstallPromptEvent>).detail ?? window.__wzosInstallPrompt;
      if (!prompt) return;
      setDeferredPrompt(prompt);
      setIsInstallable(true);
    };

    const handleInstalled = () => {
      localStorage.setItem("wzos_pwa_installed", "1");
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    const handleUpdate = (event: Event) => {
      const registration = (event as CustomEvent<ServiceWorkerRegistration>).detail;
      setWaitingRegistration(registration);
      setUpdateAvailable(true);
    };

    detectInstalled();
    if (window.__wzosInstallPrompt) {
      setDeferredPrompt(window.__wzosInstallPrompt);
      setIsInstallable(true);
    }
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("wzos-beforeinstallprompt", handleCachedPrompt as EventListener);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("wzos-sw-update", handleUpdate as EventListener);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("wzos-beforeinstallprompt", handleCachedPrompt as EventListener);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("wzos-sw-update", handleUpdate as EventListener);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    window.__wzosInstallPrompt = null;
    setDeferredPrompt(null);
    setIsInstallable(false);
    if (choice?.outcome === "accepted") {
      localStorage.setItem("wzos_pwa_installed", "1");
      setIsInstalled(true);
    }
    return choice?.outcome;
  };

  const applyUpdate = () => {
    const waiting = waitingRegistration?.waiting;
    if (!waiting) return false;
    waiting.postMessage({ type: "SKIP_WAITING" });
    return true;
  };

  return { isInstallable, isInstalled, updateAvailable, promptInstall, applyUpdate };
}
