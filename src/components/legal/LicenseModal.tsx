import { useEffect, useState } from "react";

const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
const STORAGE_KEY = `wzos-license-${APP_VERSION}`;

type AcceptanceRecord = {
  version: string;
  acceptedAt: string;
};

export default function LicenseModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setOpen(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as AcceptanceRecord;
      if (parsed.version !== APP_VERSION) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  const handleAgree = () => {
    const payload: AcceptanceRecord = {
      version: APP_VERSION,
      acceptedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
      <div className="w-full max-w-xl rounded-2xl border border-amber-500/40 bg-black/80 p-6 shadow-[0_18px_48px_rgba(0,0,0,0.7)]">
        <p className="text-xs uppercase tracking-[0.18em] text-amber-200/80 mb-2">
          Limited Ownership License – Summary Notice
        </p>
        <h2 className="text-2xl font-semibold text-white mb-2">Work Zone OS (WZOS)</h2>
        <p className="text-sm text-amber-100/80 mb-4">
          Superior Consultation, LLC
        </p>

        <ul className="space-y-2 text-sm text-amber-100/85 list-disc list-inside mb-5">
          <li>Work Zone OS is the exclusive property of Superior Consultation, LLC.</li>
          <li>You are granted a limited, non-transferable license for internal business use only.</li>
          <li>No modifications, reverse engineering, or integrations without explicit written consent.</li>
          <li>Unauthorized modification or misuse immediately terminates your license.</li>
          <li>Includes a one (1) year limited warranty from initial activation.</li>
          <li>Unrestricted access to product enhancements and security updates during the active license period.</li>
          <li>Continued use means you accept the full Limited Ownership License Agreement.</li>
          <li>If you do not agree, do not install or use this application.</li>
        </ul>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/license-agreement"
            className="inline-flex items-center justify-center rounded-lg border border-amber-500/50 bg-black/60 px-4 py-2 text-sm font-semibold text-amber-100 hover:border-amber-300 transition"
          >
            View Full License Agreement
          </a>
          <button
            type="button"
            onClick={handleAgree}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black shadow-[0_0_18px_rgba(255,193,7,0.45)] hover:bg-amber-400 transition"
          >
            I Agree and Continue
          </button>
        </div>
        <p className="mt-3 text-xs text-amber-100/70">
          Acceptance required on first install, first launch, and after any update. Timestamp and app version are recorded locally.
        </p>
      </div>
    </div>
  );
}
