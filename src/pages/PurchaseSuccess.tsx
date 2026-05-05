import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Copy, Download, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { getPurchaseStatus, type PurchaseStatusResponse } from "@/lib/purchase";

export default function PurchaseSuccess() {
  const [params] = useSearchParams();
  const [state, setState] = useState<PurchaseStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sessionId = params.get("session_id") ?? "";
  const deliveryToken = params.get("delivery_token") ?? "";

  useEffect(() => {
    if (!sessionId || !deliveryToken) {
      setError("Purchase confirmation is missing the required delivery token.");
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const data = await getPurchaseStatus(sessionId, deliveryToken);
        if (cancelled) return;
        setState(data);
        setError(null);
        if (!data.ready) {
          timer = window.setTimeout(poll, 2000);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to confirm your purchase yet.");
        timer = window.setTimeout(poll, 3000);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [deliveryToken, sessionId]);

  async function copyCode() {
    if (!state?.activation_code) return;
    await navigator.clipboard.writeText(state.activation_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-3xl border border-emerald-500/25 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_32%),linear-gradient(180deg,rgba(3,7,18,0.96),rgba(9,9,11,0.98))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-3 text-emerald-200">
          <CheckCircle2 className="h-7 w-7" />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Purchase complete</p>
            <h1 className="text-3xl font-semibold text-white">Your Work Zone OS access is being prepared.</h1>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatusCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Secure fulfillment"
            body="Stripe payment is complete and your activation record is being issued server-side."
          />
          <StatusCard
            icon={<Mail className="h-5 w-5" />}
            title="Email delivery"
            body={state?.email_sent ? "Activation email has been sent." : "Activation email will be sent automatically."}
          />
          <StatusCard
            icon={state?.ready ? <Download className="h-5 w-5" /> : <LoaderCircle className="h-5 w-5 animate-spin" />}
            title="Install path"
            body={state?.ready ? "Your download and activation links are ready." : "Preparing your download and activation links."}
          />
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-amber-500/20 bg-black/40 p-6">
        {!state?.ready ? (
          <div className="flex items-center gap-3 text-amber-100">
            <LoaderCircle className="h-5 w-5 animate-spin text-amber-300" />
            <div>
              <div className="font-semibold text-white">Finalizing your activation package</div>
              <p className="text-sm text-amber-100/70">
                This page updates automatically as soon as the Stripe webhook finishes issuing your code.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-200/70">Activation code</p>
              <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-zinc-950/80 p-5 md:flex-row md:items-center md:justify-between">
                <div className="font-mono text-2xl tracking-[0.28em] text-white">{state.activation_code}</div>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/30 px-4 py-2 text-sm text-amber-100 transition hover:bg-white/5"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied" : "Copy code"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <ActionLink href={state.activate_url || "/organization?mode=create"} label="Create organization in app" />
              <ActionLink href={state.download_url || "/install"} label="Install app shortcut" />
              <ActionLink href={state.support_url || "/contact"} label="Schedule installation help" />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-amber-50/75">
              After purchase, use this code to create the organization and add its members and admins.
            </div>
          </div>
        )}
      </section>

      <div className="text-sm text-amber-100/70">
        Need to return later? Your activation code is also sent by email, and the download/install links remain available from that message.
      </div>
      <Link to="/" className="text-sm text-emerald-300 hover:text-emerald-200">
        Return to Work Zone OS home
      </Link>
    </div>
  );
}

function StatusCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-emerald-200">
        {icon}
        <span className="font-semibold text-white">{title}</span>
      </div>
      <p className="mt-2 text-sm text-emerald-50/70">{body}</p>
    </div>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  const external = /^https?:\/\//i.test(href);
  const className = "inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400";
  if (external) {
    return <a href={href} className={className}>{label}</a>;
  }
  return <Link to={href} className={className}>{label}</Link>;
}
