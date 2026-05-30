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

type InstallState = {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstallable: boolean;
  isInstalled: boolean;
  updateAvailable: boolean;
  waitingRegistration: ServiceWorkerRegistration | null;
};

const listeners = new Set<(state: InstallState) => void>();
let browserEventsBound = false;
let installState: InstallState = {
  deferredPrompt: null,
  isInstallable: false,
  isInstalled: false,
  updateAvailable: false,
  waitingRegistration: null,
};

const publishInstallState = (next: Partial<InstallState>) => {
  installState = { ...installState, ...next };
  listeners.forEach((listener) => listener(installState));
};

const detectInstalled = () => {
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  const installedFlag = localStorage.getItem("wzos_pwa_installed") === "1";
  publishInstallState({ isInstalled: Boolean(standalone || installedFlag) });
};

const bindBrowserEvents = () => {
  if (browserEventsBound || typeof window === "undefined") return;
  browserEventsBound = true;

  const handler = (e: Event) => {
    e.preventDefault();
    window.__wzosInstallPrompt = e as BeforeInstallPromptEvent;
    publishInstallState({
      deferredPrompt: e as BeforeInstallPromptEvent,
      isInstallable: true,
    });
  };

  const handleCachedPrompt = (event: Event) => {
    const prompt = (event as CustomEvent<BeforeInstallPromptEvent>).detail ?? window.__wzosInstallPrompt;
    if (!prompt) return;
    publishInstallState({
      deferredPrompt: prompt,
      isInstallable: true,
    });
  };

  const handleInstalled = () => {
    localStorage.setItem("wzos_pwa_installed", "1");
    window.__wzosInstallPrompt = null;
    publishInstallState({
      deferredPrompt: null,
      isInstallable: false,
      isInstalled: true,
    });
  };

  const handleUpdate = (event: Event) => {
    publishInstallState({
      waitingRegistration: (event as CustomEvent<ServiceWorkerRegistration>).detail,
      updateAvailable: true,
    });
  };

  detectInstalled();
  if (window.__wzosInstallPrompt) {
    publishInstallState({
      deferredPrompt: window.__wzosInstallPrompt,
      isInstallable: true,
    });
  }

  window.addEventListener("beforeinstallprompt", handler);
  window.addEventListener("wzos-beforeinstallprompt", handleCachedPrompt as EventListener);
  window.addEventListener("appinstalled", handleInstalled);
  window.addEventListener("wzos-sw-update", handleUpdate as EventListener);
};

export function usePWAInstall() {
  const [state, setState] = useState<InstallState>(installState);

  useEffect(() => {
    bindBrowserEvents();
    listeners.add(setState);
    setState(installState);

    return () => {
      listeners.delete(setState);
    };
  }, []);

  const promptInstall = async () => {
    if (!state.deferredPrompt) return;
    await state.deferredPrompt.prompt();
    const choice = await state.deferredPrompt.userChoice;
    window.__wzosInstallPrompt = null;
    publishInstallState({
      deferredPrompt: null,
      isInstallable: false,
    });
    if (choice?.outcome === "accepted") {
      localStorage.setItem("wzos_pwa_installed", "1");
      publishInstallState({ isInstalled: true });
    }
    return choice?.outcome;
  };

  const applyUpdate = () => {
    const waiting = state.waitingRegistration?.waiting;
    if (!waiting) return false;
    waiting.postMessage({ type: "SKIP_WAITING" });
    return true;
  };

  return {
    isInstallable: state.isInstallable,
    isInstalled: state.isInstalled,
    updateAvailable: state.updateAvailable,
    promptInstall,
    applyUpdate,
  };
}
