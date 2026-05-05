import { useEffect, useState } from "react";
import { ownerAdmin } from "@/lib/owner/ownerAdmin";

type SecretCheck = {
  name: string;
  category: "core" | "bookkeeping" | "timekeeping" | "storage" | "client";
  provider: string;
  description: string;
  required: boolean;
  present: boolean;
  strength: "missing" | "weak" | "ok";
  clientVisible: boolean;
};

type ProviderStatus = {
  provider: string;
  category: "bookkeeping" | "timekeeping" | "storage";
  ready: boolean;
  missingSecrets: string[];
  missingClientConfig: string[];
  notes: string;
};

type IntegrationStatusResponse = {
  ok: true;
  secrets: SecretCheck[];
  providers: ProviderStatus[];
  summary: {
    coreReady: boolean;
    bookkeepingReady: boolean;
    timekeepingReady: boolean;
    storageReady: boolean;
    customWebhookReady: boolean;
  };
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function badgeClass(strength: SecretCheck["strength"]) {
  if (strength === "ok") return "border-emerald-700 bg-emerald-950/40 text-emerald-200";
  if (strength === "weak") return "border-amber-700 bg-amber-950/40 text-amber-200";
  return "border-red-800 bg-red-950/40 text-red-200";
}

export default function IntegrationsStatusTab() {
  const [data, setData] = useState<IntegrationStatusResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const res = await ownerAdmin<IntegrationStatusResponse>("integrations.status");
        setData(res);
      } catch (error: unknown) {
        setErr(errorMessage(error, "Failed to load integration status."));
      }
    })();
  }, []);

  const core = data?.secrets.filter((item) => item.category === "core") ?? [];
  const clientConfig = data?.secrets.filter((item) => item.category === "client") ?? [];

  return (
    <div className="space-y-4">
      {err && <div className="rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">{err}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi title="Core Security" ok={data?.summary.coreReady ?? false} />
        <Kpi title="Bookkeeping" ok={data?.summary.bookkeepingReady ?? false} />
        <Kpi title="Timekeeping" ok={data?.summary.timekeepingReady ?? false} />
        <Kpi title="Storage" ok={data?.summary.storageReady ?? false} />
      </div>

      <section className="rounded border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-lg font-semibold">Core secrets</div>
        <div className="mt-1 text-xs text-zinc-400">
          These must exist server-side before live integrations are enabled for admin and owner workflows.
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {core.map((item) => (
            <div key={item.name} className="rounded border border-zinc-800 bg-black/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-xs text-zinc-200">{item.name}</div>
                <span className={`rounded border px-2 py-1 text-[11px] ${badgeClass(item.strength)}`}>
                  {item.strength}
                </span>
              </div>
              <div className="mt-2 text-sm text-zinc-400">{item.description}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-lg font-semibold">Provider readiness</div>
        <div className="mt-1 text-xs text-zinc-400">
          This covers the recommended first integrations for bookkeeping, timekeeping, and document storage.
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(data?.providers ?? []).map((provider) => (
            <div key={provider.provider} className="rounded border border-zinc-800 bg-black/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold capitalize">{provider.provider.replace(/-/g, " ")}</div>
                  <div className="text-xs uppercase tracking-wide text-zinc-500">{provider.category}</div>
                </div>
                <span className={`rounded border px-2 py-1 text-[11px] ${provider.ready ? badgeClass("ok") : badgeClass("missing")}`}>
                  {provider.ready ? "ready" : "setup required"}
                </span>
              </div>
              <div className="mt-2 text-sm text-zinc-400">{provider.notes}</div>
              {provider.missingSecrets.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-red-300">Missing private secrets</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {provider.missingSecrets.map((name) => (
                      <span key={name} className="rounded border border-red-800 bg-red-950/30 px-2 py-1 font-mono text-[11px] text-red-200">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {provider.missingClientConfig.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-amber-300">Missing browser config</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {provider.missingClientConfig.map((name) => (
                      <span key={name} className="rounded border border-amber-700 bg-amber-950/30 px-2 py-1 font-mono text-[11px] text-amber-200">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-lg font-semibold">Browser-visible config</div>
        <div className="mt-1 text-xs text-zinc-400">
          These values are expected in the frontend app. They are not private secrets, but they should still be origin-restricted.
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {clientConfig.map((item) => (
            <div key={item.name} className="rounded border border-zinc-800 bg-black/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-xs text-zinc-200">{item.name}</div>
                <span className={`rounded border px-2 py-1 text-[11px] ${item.present ? badgeClass("ok") : badgeClass("missing")}`}>
                  {item.present ? "present" : "missing"}
                </span>
              </div>
              <div className="mt-2 text-sm text-zinc-400">{item.description}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({ title, ok }: { title: string; ok: boolean }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-xs text-zinc-400">{title}</div>
      <div className={`mt-2 text-lg font-semibold ${ok ? "text-emerald-300" : "text-amber-200"}`}>
        {ok ? "Ready" : "Needs setup"}
      </div>
    </div>
  );
}
