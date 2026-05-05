import { useState } from "react";
import { activateApp } from "@/lib/activation/activate";
import ActivationLocked from "./ActivationLocked";

export default function ActivationScreen({ onActivated }: { onActivated: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  const formatCode = (value: string) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const parts: string[] = [];
    for (let i = 0; i < cleaned.length; i += 5) {
      parts.push(cleaned.slice(i, i + 5));
    }
    return parts.join(" ").slice(0, 17);
  };

  async function handleActivate() {
    setError(null);
    setLoading(true);

    const res = await activateApp(code.replace(/\s+/g, ""));

    setLoading(false);

    if (res.locked) {
      setLocked(true);
      return;
    }

    if (res.activated) {
      onActivated();
      return;
    }

    if (!res.ok) {
      setAttemptsLeft(res.attempts_left ?? null);
      setError(res.message ?? "Activation failed.");
    }
  }

  if (locked) {
    return <ActivationLocked />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <div className="w-full max-w-md space-y-6 border border-amber-500/20 bg-zinc-950/70 backdrop-blur rounded-2xl p-6 shadow-[0_18px_48px_rgba(0,0,0,0.5)]">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-200/70">
            Work Zone OS
          </p>
          <h1 className="text-2xl font-bold text-white">
            Activate Your Application
          </h1>
          <p className="text-sm text-gray-300">
            Enter the 15-character activation code provided with your purchase.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.12em] text-amber-200/70">
            Activation code
          </label>
          <input
            value={code}
            autoFocus
            onChange={(e) => setCode(formatCode(e.target.value))}
            placeholder="WZOSX 12345 67890"
            maxLength={17}
            className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-amber-500/30 text-white tracking-[0.25em] text-center focus:outline-none focus:ring-2 focus:ring-amber-400/60"
          />
          <p className="text-[11px] text-gray-400 text-center">
            Formatted automatically. Paste or type your code exactly as provided.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
            {attemptsLeft !== null && (
              <div className="mt-1 text-xs text-gray-300">
                Attempts remaining: {attemptsLeft}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleActivate}
          disabled={loading || code.replace(/\s+/g, "").length < 15}
          className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition font-semibold"
        >
          {loading ? "Verifying..." : "Activate"}
        </button>
      </div>
    </div>
  );
}
