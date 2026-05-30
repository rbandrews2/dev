import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  CheckCircle2,
  ExternalLink,
  LockKeyhole,
  PlugZap,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { ownerAdmin } from "@/lib/owner/ownerAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Link } from "react-router-dom";

type IntegrationStatus = "ready" | "connected" | "pending" | "error";
type BusyAction = "connect" | "disconnect" | "test" | null;

type Integration = {
  id: string;
  name: string;
  category: string;
  description: string;
  auth: "oauth" | "api-key";
  actions: string[];
  status?: IntegrationStatus;
};

type IntegrationRecord = {
  provider: string;
  auth_type: "oauth" | "api-key";
  status: IntegrationStatus;
  webhook_url: string | null;
  external_account_label: string | null;
  notes: string | null;
  last_test_status: "ok" | "failed" | null;
  last_test_message: string | null;
  last_test_at: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  required_vault_keys: string[];
  present_vault_keys: string[];
  missing_vault_keys: string[];
};

type IntegrationListResponse = {
  ok: true;
  setup_required?: boolean;
  integrations: IntegrationRecord[];
};

type IntegrationMutationResponse = {
  ok: boolean;
  integration?: IntegrationRecord;
  message?: string;
};

const integrationCatalog: Integration[] = [
  {
    id: "slack",
    name: "Slack",
    category: "Messaging",
    description: "Send crew alerts, outage notices, and job updates directly to channels.",
    auth: "oauth",
    actions: ["Send alerts", "DM crew", "Post safety digests"],
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    category: "Messaging",
    description: "Push schedule changes and meeting links to team chats.",
    auth: "oauth",
    actions: ["Alerts", "Roster sync", "Meeting invites"],
  },
  {
    id: "procore",
    name: "Procore",
    category: "Construction Ops",
    description: "Sync work orders and attachments with project folders.",
    auth: "oauth",
    actions: ["Sync work orders", "Upload forms", "Pull contacts"],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    category: "Docs",
    description: "Drop PDFs, plans, and exports into a shared drive.",
    auth: "oauth",
    actions: ["Export PDFs", "Attach photos", "Mirror reports"],
  },
  {
    id: "sharepoint",
    name: "SharePoint",
    category: "Docs",
    description: "File compliance packets in the right site and folder.",
    auth: "oauth",
    actions: ["Store packets", "Sync folders", "Pull templates"],
  },
  {
    id: "webhook",
    name: "Custom Webhook",
    category: "Universal",
    description: "Post JSON payloads to any HTTPS endpoint with signing.",
    auth: "api-key",
    actions: ["Outbound webhooks", "HMAC signing", "Test harness"],
  },
];

function statusBadge(status: IntegrationStatus) {
  const map: Record<IntegrationStatus, { label: string; className: string }> = {
    ready: { label: "Ready", className: "bg-emerald-500/15 text-emerald-200 border-emerald-400/40" },
    connected: { label: "Connected", className: "bg-orange-500/15 text-orange-200 border-orange-400/50" },
    pending: { label: "Pending", className: "bg-blue-500/15 text-blue-200 border-blue-400/40" },
    error: { label: "Action needed", className: "bg-red-500/15 text-red-200 border-red-400/50" },
  };
  const cfg = map[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.className}`}
    >
      <Sparkles className="w-4 h-4" />
      {cfg.label}
    </span>
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function IntegrationsPage() {
  const { activeOrgId } = useAuth();
  const { canAdmin } = usePermissions();

  const [connections, setConnections] = useState<Record<string, IntegrationStatus>>(() => {
    const map: Record<string, IntegrationStatus> = {};
    integrationCatalog.forEach((integration) => {
      map[integration.id] = integration.status ?? "ready";
    });
    return map;
  });
  const [connectionMeta, setConnectionMeta] = useState<Record<string, IntegrationRecord>>({});
  const [webhookUrl, setWebhookUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, BusyAction>>({});
  const [loading, setLoading] = useState(false);

  const activated = useMemo(() => {
    return (import.meta.env.VITE_INTEGRATIONS_ENABLED ?? "false").toString().toLowerCase() === "true";
  }, []);

  const loadConnections = useCallback(async () => {
    if (!activated || !canAdmin || !activeOrgId) return;

    setLoading(true);
    try {
      const res = await ownerAdmin<IntegrationListResponse>("integrations.list", { organization_id: activeOrgId });
      const nextStatuses: Record<string, IntegrationStatus> = {};
      const nextMeta: Record<string, IntegrationRecord> = {};

      integrationCatalog.forEach((integration) => {
        const row = res.integrations.find((item) => item.provider === integration.id);
        nextStatuses[integration.id] = row?.status ?? "ready";
        if (row) nextMeta[integration.id] = row;
      });

      setConnections(nextStatuses);
      setConnectionMeta(nextMeta);
      setWebhookUrl(nextMeta.webhook?.webhook_url ?? "");
      if (res.setup_required) {
        setMessage("Integration storage is not installed yet. Run src/sql/integration_tables.sql in Supabase before connecting providers.");
      }
    } catch (error: unknown) {
      setMessage(errorMessage(error, "Failed to load integrations."));
    } finally {
      setLoading(false);
    }
  }, [activated, canAdmin, activeOrgId]);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  function setBusyAction(id: string, action: BusyAction) {
    setBusy((prev) => ({ ...prev, [id]: action }));
  }

  function applyIntegrationRecord(record?: IntegrationRecord) {
    if (!record) return;
    setConnections((prev) => ({ ...prev, [record.provider]: record.status }));
    setConnectionMeta((prev) => ({ ...prev, [record.provider]: record }));
    if (record.provider === "webhook") {
      setWebhookUrl(record.webhook_url ?? "");
    }
  }

  async function handleConnect(id: string) {
    if (!activated) {
      setMessage("Enable integrations before connecting providers.");
      return;
    }
    if (!canAdmin || !activeOrgId) {
      setMessage("Only owners and admins can manage live integrations for this workspace.");
      return;
    }

    setBusyAction(id, "connect");
    setMessage(null);

    try {
      const payload: Record<string, unknown> = {
        organization_id: activeOrgId,
        provider: id,
      };
      if (id === "webhook") {
        payload.webhook_url = webhookUrl.trim();
      }

      const res = await ownerAdmin<IntegrationMutationResponse>("integrations.connect", payload);
      applyIntegrationRecord(res.integration);
      setMessage(res.message ?? "Integration updated.");
    } catch (error: unknown) {
      setConnections((prev) => ({ ...prev, [id]: "error" }));
      setMessage(errorMessage(error, "Failed to connect integration."));
    } finally {
      setBusyAction(id, null);
    }
  }

  async function handleDisconnect(id: string) {
    if (!canAdmin || !activeOrgId) {
      setMessage("Only owners and admins can manage live integrations for this workspace.");
      return;
    }

    setBusyAction(id, "disconnect");
    setMessage(null);

    try {
      const res = await ownerAdmin<IntegrationMutationResponse>("integrations.disconnect", {
        organization_id: activeOrgId,
        provider: id,
      });
      applyIntegrationRecord(res.integration);
      setMessage(res.message ?? "Integration reset.");
    } catch (error: unknown) {
      setMessage(errorMessage(error, "Failed to reset integration."));
    } finally {
      setBusyAction(id, null);
    }
  }

  async function handleTest(id: string) {
    if (!canAdmin || !activeOrgId) {
      setMessage("Only owners and admins can run live integration tests for this workspace.");
      return;
    }

    setBusyAction(id, "test");
    setMessage(null);

    try {
      const res = await ownerAdmin<IntegrationMutationResponse>("integrations.test", {
        organization_id: activeOrgId,
        provider: id,
      });
      setMessage(res.message ?? "Integration test completed.");
      await loadConnections();
    } catch (error: unknown) {
      await loadConnections();
      setMessage(errorMessage(error, "Integration test failed."));
    } finally {
      setBusyAction(id, null);
    }
  }

  const activationChecklist = [
    {
      title: "Toggle feature flag",
      description: "Set VITE_INTEGRATIONS_ENABLED=true and redeploy.",
      icon: SlidersHorizontal,
    },
    {
      title: "Add credentials",
      description: "Keep private keys server-side and configure provider secrets before go-live.",
      icon: LockKeyhole,
    },
    {
      title: "Pick apps",
      description: "Start with webhook + document storage for the fastest live rollout.",
      icon: PlugZap,
    },
    {
      title: "Test & notify",
      description: "Run a live test and confirm audit visibility before launch.",
      icon: BellRing,
    },
  ];

  const quickWins = [
    "Auto-send work order PDFs to Drive or SharePoint.",
    "Push crew alerts to Slack or Teams when a hazard is logged.",
    "Post scheduling changes to messaging channels in under 2 taps.",
    "Use signed webhooks to hit any internal API with a standard payload.",
  ];

  return (
    <div className="space-y-8 text-white">
      <section className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-black/80 shadow-glow p-6 md:p-10">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-black/70 to-black/90" />
          <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-500/10 px-3 py-1.5 text-sm text-orange-100">
              <PlugZap className="w-4 h-4" />
              App Integrations
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-bold">Connect your crew&apos;s favorite apps</h1>
              {activated ? statusBadge("connected") : statusBadge("pending")}
            </div>
            <p className="text-orange-100/80 text-base leading-relaxed">
              Integrations now use backend-managed connect, disconnect, and test flows. Webhooks are production-usable
              today; OAuth providers are tracked honestly as pending until their provider callback handoff is finished.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadConnections()}
                className="rounded-xl bg-orange-500 text-black font-semibold px-4 py-2 hover:bg-orange-400 transition disabled:opacity-60"
                disabled={!activated || loading}
              >
                {loading ? "Refreshing..." : "Refresh status"}
              </button>
              <button
                type="button"
                className="rounded-xl border border-orange-400/40 px-4 py-2 text-orange-100 hover:bg-white/5 transition"
                onClick={() => setMessage("Run src/sql/integration_tables.sql in Supabase, then use this page to connect and test providers.")}
              >
                View API handoff
              </button>
              {canAdmin && (
                <Link
                  to="/admin/vault"
                  className="rounded-xl border border-emerald-400/40 px-4 py-2 text-emerald-100 hover:bg-white/5 transition"
                >
                  Open Vault
                </Link>
              )}
            </div>
          </div>
          <GlassCard className="md:w-80 w-full p-5 border border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
              <div>
                <p className="text-sm text-emerald-200/80">Secured handoff</p>
                <p className="text-lg font-semibold">Backend state + signed tests</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-emerald-100/80">
              Live connection state is now persisted server-side. Webhook tests are signed with your server secret instead
              of pretending to succeed in the browser.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-200/80">
              <CheckCircle2 className="w-4 h-4" />
              Owner/admin users can verify readiness before go-live.
            </div>
          </GlassCard>
        </div>
      </section>

      {!activated && (
        <GlassCard className="p-6 border border-orange-500/25 bg-black/70">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-orange-100/70">Activation required</p>
              <h2 className="text-2xl font-semibold text-white">Enable integrations for this workspace</h2>
              <p className="text-sm text-orange-100/80 max-w-2xl mt-2">
                The live connect and test actions stay disabled until the integration feature flag is turned on.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/15 text-red-200 border border-red-400/40 px-4 py-2 text-sm font-semibold">
                Inactive
              </div>
              <ArrowRight className="w-5 h-5 text-orange-300" />
              <div className="rounded-full bg-orange-500/15 text-orange-100 border border-orange-400/40 px-4 py-2 text-sm font-semibold">
                Flip VITE_INTEGRATIONS_ENABLED
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {activationChecklist.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-orange-500/20 bg-black/60 p-4 flex items-start gap-3"
                >
                  <div className="h-10 w-10 rounded-xl border border-orange-400/30 bg-orange-500/10 flex items-center justify-center text-orange-200">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-orange-100/75">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2 p-5 border border-orange-500/25 bg-black/70">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Plug-and-play apps</h3>
              <p className="text-sm text-orange-100/75">
                Custom webhook is live-ready now. OAuth providers are tracked server-side until their callback flow is wired.
              </p>
            </div>
            <BadgeCheck className="w-6 h-6 text-orange-300" />
          </div>
          {!canAdmin && (
            <div className="mb-4 rounded-xl border border-orange-500/30 bg-black/60 px-4 py-3 text-sm text-orange-100">
              Only owners and admins can connect, disconnect, or test integrations.
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {integrationCatalog.map((integration) => {
              const status = connections[integration.id] ?? "ready";
              const meta = connectionMeta[integration.id];
              const actionBusy = busy[integration.id];
              const disabled = !activated || !canAdmin || !activeOrgId || Boolean(actionBusy);

              return (
                <div
                  key={integration.id}
                  className="rounded-2xl border border-orange-500/20 bg-black/60 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{integration.name}</p>
                      <p className="text-xs uppercase tracking-[0.12em] text-orange-200/70">
                        {integration.category}
                      </p>
                    </div>
                    {statusBadge(status)}
                  </div>
                  <p className="text-sm text-orange-100/75">{integration.description}</p>
                  <div className="flex flex-wrap gap-2 text-[11px] text-orange-100/70">
                    {integration.actions.map((action) => (
                      <span
                        key={action}
                        className="rounded-full border border-orange-500/25 px-3 py-1 bg-white/5"
                      >
                        {action}
                      </span>
                    ))}
                  </div>

                  {integration.id === "webhook" && (
                    <div className="space-y-2">
                      <label className="text-xs text-orange-100/75">Webhook URL</label>
                      <input
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://example.com/api/wzos/webhook"
                        className="w-full rounded-lg border border-orange-500/30 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <p className="text-[11px] text-orange-100/60">
                        HTTPS only. Localhost and private network targets are blocked by the backend.
                      </p>
                    </div>
                  )}

                  {meta?.external_account_label && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-100">
                      Connected target: {meta.external_account_label}
                    </div>
                  )}

                  {meta?.notes && (
                    <div className="rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-xs text-orange-100/80">
                      {meta.notes}
                    </div>
                  )}

                  {meta && meta.required_vault_keys.length > 0 && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-100/90 space-y-2">
                      <div className="font-semibold">Vault requirements</div>
                      <div className="flex flex-wrap gap-2">
                        {meta.required_vault_keys.map((key) => {
                          const present = meta.present_vault_keys.includes(key);
                          return (
                            <span
                              key={key}
                              className={`rounded border px-2 py-1 font-mono text-[11px] ${
                                present
                                  ? "border-emerald-700 bg-emerald-950/40 text-emerald-200"
                                  : "border-red-800 bg-red-950/40 text-red-200"
                              }`}
                            >
                              {key}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {meta?.last_test_message && (
                    <div className={`rounded-lg border px-3 py-2 text-xs ${
                      meta.last_test_status === "ok"
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-100"
                        : "border-red-500/30 bg-red-500/5 text-red-100"
                    }`}>
                      {meta.last_test_message}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void handleConnect(integration.id)}
                      className="rounded-lg bg-orange-500 text-black text-sm font-semibold px-3 py-1.5 hover:bg-orange-400 transition disabled:opacity-60"
                      disabled={disabled}
                    >
                      {actionBusy === "connect" ? "Working..." : "Connect"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDisconnect(integration.id)}
                      className="rounded-lg border border-orange-500/30 text-orange-100 text-sm px-3 py-1.5 hover:bg-white/5 transition disabled:opacity-60"
                      disabled={disabled}
                    >
                      {actionBusy === "disconnect" ? "Working..." : "Reset"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleTest(integration.id)}
                      className="ml-auto inline-flex items-center gap-1 text-xs text-orange-200 hover:text-white disabled:opacity-60"
                      disabled={disabled}
                    >
                      {actionBusy === "test" ? "Testing..." : "Test flow"} <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-5 border border-orange-500/25 bg-black/70 space-y-4">
          <div className="flex items-center gap-3">
            <RefreshCcw className="w-6 h-6 text-orange-300" />
            <div>
              <p className="text-sm font-semibold text-white">Quick wins</p>
              <p className="text-xs text-orange-100/70">Practical rollout order for the next 10 days.</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-orange-100/80">
            {quickWins.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-xl border border-orange-500/20 bg-black/60 p-4 space-y-2">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <LockKeyhole className="w-4 h-4" /> Connection checklist
            </p>
            <p className="text-xs text-orange-100/70">
              1) Run `src/sql/integration_tables.sql`. 2) Keep OAuth secrets server-side. 3) Use this page to save and
              test the webhook endpoint. 4) Finish provider OAuth callbacks before enabling Slack, Teams, Procore, or SharePoint in production.
            </p>
          </div>
        </GlassCard>
      </section>

      <GlassCard className="p-5 border border-orange-500/25 bg-black/70">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm text-orange-100/75">Implementation status</p>
            <h3 className="text-xl font-semibold text-white">API wiring notes</h3>
            <p className="text-sm text-orange-100/75 max-w-3xl">
              The integrations page now talks to the backend instead of faking success in the browser. Webhook connections
              persist per workspace and signed test deliveries are executed server-side. OAuth providers still need callback
              implementation, so they remain visibly pending instead of incorrectly showing as connected.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-orange-200">
            <ExternalLink className="w-4 h-4" />
            Production-safe state tracking is now in place.
          </div>
        </div>
      </GlassCard>

      {message && (
        <div className="rounded-xl border border-orange-500/30 bg-black/70 px-4 py-3 text-sm text-orange-100">
          {message}
        </div>
      )}
    </div>
  );
}
