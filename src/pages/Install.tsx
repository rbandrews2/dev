import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Download, KeyRound, Sparkles } from "lucide-react";

export default function Install() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-3xl border border-amber-500/20 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_30%),linear-gradient(180deg,rgba(3,7,18,0.96),rgba(9,9,11,0.98))] p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-amber-200/70">Download and install</p>
        <h1 className="mt-2 text-4xl font-semibold text-white">Install Work Zone OS and activate it with your purchase code.</h1>
        <p className="mt-4 max-w-3xl text-sm text-amber-100/75">
          Use the activation code issued after purchase. Installation is complete only after the code is verified.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StepCard icon={<Download className="h-5 w-5" />} title="1. Install the app" body="Use your device or browser install flow for Work Zone OS. Keep your activation email open." />
        <StepCard icon={<KeyRound className="h-5 w-5" />} title="2. Enter the code" body="When prompted, paste or type the 15-character activation code exactly as provided." />
        <StepCard icon={<Sparkles className="h-5 w-5" />} title="3. Finish setup" body="Start configuration with Atlas AI or schedule a Superior Consultation installation appointment." />
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-6">
        <div className="flex flex-wrap gap-3">
          <Link to="/?install=1" className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black hover:bg-emerald-400">
            Start app install
          </Link>
          <Link to="/activate" className="rounded-xl bg-amber-500 px-4 py-3 font-semibold text-black hover:bg-amber-400">
            Enter activation code
          </Link>
          <Link to="/" className="rounded-xl border border-amber-400/30 px-4 py-3 text-amber-100 hover:bg-white/5">
            Open Work Zone OS
          </Link>
          <Link to="/contact" className="rounded-xl border border-amber-400/30 px-4 py-3 text-amber-100 hover:bg-white/5">
            Book installation help
          </Link>
        </div>
      </section>
    </div>
  );
}

function StepCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-2 text-amber-200">
        {icon}
        <span className="font-semibold text-white">{title}</span>
      </div>
      <p className="mt-3 text-sm text-amber-100/75">{body}</p>
    </div>
  );
}
