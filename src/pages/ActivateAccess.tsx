import { useState } from "react";
import { Link } from "react-router-dom";
import ActivationScreen from "@/components/activation/ActivationScreen";

export default function ActivateAccess() {
  const [activated, setActivated] = useState(false);

  if (!activated) {
    return <ActivationScreen onActivated={() => setActivated(true)} />;
  }

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-emerald-500/20 bg-black/50 p-8 text-white">
      <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/70">Activation complete</p>
      <h1 className="mt-2 text-3xl font-semibold">Work Zone OS is ready for setup.</h1>
      <p className="mt-4 text-sm text-emerald-50/75">
        Continue into the app and let Atlas AI help with your initial setup, or book a Superior Consultation installation appointment if you want guided onboarding.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/" className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black hover:bg-emerald-400">
          Open Work Zone OS
        </Link>
        <Link to="/contact" className="rounded-xl border border-emerald-400/30 px-4 py-3 text-emerald-100 hover:bg-white/5">
          Schedule guided installation
        </Link>
      </div>
    </div>
  );
}
