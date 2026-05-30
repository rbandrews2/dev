import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  BarChart3,
  CalendarClock,
  Clipboard,
  FileText,
  FolderKanban,
  GraduationCap,
  LockKeyhole,
  MessageSquare,
  PlugZap,
  RadioTower,
  ShieldCheck,
  Users,
  Vault,
} from "lucide-react";
import AdminTimeClockTab from "./tabs/AdminTimeClockTab";
import AdminMessagesTab from "./tabs/AdminMessagesTab";
import WorkOrdersPage from "@/pages/WorkOrders";
import CompanyForms from "@/pages/forms/CompanyForms";
import AdminPlaylist from "@/pages/training/AdminPlaylist";
import ScheduleEditor from "@/pages/scheduling/Editor";
import SuperiorSecurityPage from "@/pages/security/SuperiorSecurity";
import VaultPage from "@/pages/vault/Index";
import DispatchIndex from "@/pages/dispatch/Index";
import IntegrationsPage from "@/pages/integrations/Index";
import OrganizationIndex from "@/pages/organization/Index";
import DriveTab from "./tabs/DriveTab";
import AuditLogTab from "./tabs/AuditLogTab";
import IntegrationsStatusTab from "./tabs/IntegrationsStatusTab";

type TabKey =
  | "overview"
  | "timeclock"
  | "work-orders"
  | "forms"
  | "training"
  | "scheduling"
  | "organization"
  | "messages"
  | "security"
  | "vault"
  | "dispatch"
  | "integrations"
  | "drive"
  | "audit";

type TabConfig = {
  key: TabKey;
  label: string;
  description: string;
  icon: typeof BarChart3;
  lockedInCore?: boolean;
};

const tabs: TabConfig[] = [
  { key: "overview", label: "Overview", description: "Admin command center", icon: BarChart3 },
  { key: "timeclock", label: "Time Clock", description: "Corrections, job setup, and exports", icon: CalendarClock },
  { key: "work-orders", label: "Work Orders", description: "Create and assign crew work", icon: Clipboard },
  { key: "forms", label: "Form Hub", description: "Upload company forms", icon: FileText },
  { key: "training", label: "Training", description: "Manage videos, lessons, tests, and certificates", icon: GraduationCap },
  { key: "scheduling", label: "Scheduling", description: "Upload and edit schedule data", icon: CalendarClock },
  { key: "organization", label: "Users & Roles", description: "Invite members and assign access roles", icon: Users },
  { key: "messages", label: "EchoChat", description: "Broadcast to every user", icon: MessageSquare },
  { key: "security", label: "Security", description: "Superior Security controls", icon: ShieldCheck },
  { key: "vault", label: "Vault", description: "Admin-only secrets and exports", icon: Vault, lockedInCore: true },
  { key: "dispatch", label: "Dispatch", description: "Dispatch jobs and app handoffs", icon: RadioTower, lockedInCore: true },
  { key: "integrations", label: "App Integrations", description: "Connect, test, and reset integrations", icon: PlugZap, lockedInCore: true },
  { key: "drive", label: "Google Drive", description: "Exports, compliance docs, and files", icon: FolderKanban },
  { key: "audit", label: "Audit Log", description: "Administrative activity", icon: ShieldCheck },
];

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const [tab, setTab] = useState<TabKey>("overview");

  const tabKeys = useMemo(() => tabs.map((item) => item.key), []);
  const basePath = location.pathname.startsWith("/owner") ? "/owner" : "/admin";

  useEffect(() => {
    const nextTab = tabParam && tabKeys.includes(tabParam as TabKey) ? (tabParam as TabKey) : "overview";
    setTab(nextTab);
  }, [tabParam, tabKeys]);

  function go(next: TabKey) {
    const nextConfig = tabs.find((item) => item.key === next);
    if (nextConfig?.lockedInCore) return;

    setTab(next);
    navigate(next === "overview" ? basePath : `${basePath}/${next}`);
  }

  const activeConfig = tabs.find((item) => item.key === tab) ?? tabs[0];
  const activeLocked = Boolean(activeConfig.lockedInCore);

  return (
    <div className="min-h-screen text-white">
      <header className="rounded-2xl border border-zinc-800 bg-black/70 px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-orange-200/70">Owner/Admin Dashboard</div>
            <h1 className="text-2xl font-semibold">Admin Console</h1>
            <p className="text-sm text-zinc-400">
              All owner and admin actions live here. Crew pages expose only crew-level workflows.
            </p>
          </div>
          <nav className="flex max-h-40 flex-wrap gap-2 overflow-auto lg:max-w-3xl lg:justify-end">
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => go(item.key)}
                disabled={item.lockedInCore}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  item.lockedInCore
                    ? "cursor-not-allowed border-zinc-800 bg-zinc-900/60 text-zinc-600"
                    : tab === item.key
                    ? "border-emerald-500 bg-emerald-600/20 text-emerald-100"
                    : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-orange-500/50 hover:text-white"
                }`}
                title={item.lockedInCore ? "upgrade to activate" : undefined}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="py-6">
        {tab === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tabs
                .filter((item) => item.key !== "overview")
                .map((item) => {
                  const Icon = item.icon;
                  const locked = Boolean(item.lockedInCore);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => go(item.key)}
                      disabled={locked}
                      className={`relative overflow-hidden rounded-xl border p-4 text-left transition ${
                        locked
                          ? "cursor-not-allowed border-zinc-800 bg-zinc-950/70 text-zinc-500 grayscale"
                          : "border-zinc-800 bg-zinc-950 hover:border-emerald-500/60 hover:bg-zinc-900/70"
                      }`}
                    >
                      {locked && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55">
                          <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-950/90 px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-200">
                            <LockKeyhole className="h-4 w-4" />
                            upgrade to activate
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                            locked
                              ? "border-zinc-700 bg-zinc-800/50 text-zinc-500"
                              : "border-emerald-500/30 bg-emerald-600/10 text-emerald-200"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-xs text-zinc-500">Admin Tools</div>
                          <div className="text-lg font-semibold">{item.label}</div>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-zinc-400">{item.description}</p>
                    </button>
                  );
                })}
            </div>
            <div className="rounded-xl border border-orange-500/20 bg-black/50 p-4 text-sm text-orange-100/80">
              Security, Vault, Dispatch, integrations, uploads, schedule edits, work-order creation, training content
              changes, user-role management, and time-clock corrections are centralized here.
            </div>
          </div>
        ) : (
          <section className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-black/60 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-orange-200/70">Admin Section</div>
              <h2 className="text-2xl font-semibold">{activeConfig.label}</h2>
              <p className="text-sm text-zinc-400">{activeConfig.description}</p>
            </div>

            {activeLocked && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-8 text-center text-zinc-300">
                <LockKeyhole className="mx-auto h-8 w-8 text-zinc-500" />
                <div className="mt-3 text-lg font-semibold uppercase tracking-[0.14em]">upgrade to activate</div>
                <p className="mt-2 text-sm text-zinc-500">This module is not included in the core edition.</p>
              </div>
            )}

            {!activeLocked && tab === "timeclock" && <AdminTimeClockTab />}
            {tab === "work-orders" && <WorkOrdersPage adminMode />}
            {tab === "forms" && <CompanyForms adminMode />}
            {tab === "training" && <AdminPlaylist />}
            {tab === "scheduling" && <ScheduleEditor />}
            {tab === "organization" && <OrganizationIndex adminMode />}
            {tab === "messages" && <AdminMessagesTab />}
            {tab === "security" && <SuperiorSecurityPage />}
            {!activeLocked && tab === "vault" && <VaultPage />}
            {!activeLocked && tab === "dispatch" && <DispatchIndex />}
            {!activeLocked && tab === "integrations" && (
              <div className="space-y-4">
                <IntegrationsStatusTab />
                <IntegrationsPage />
              </div>
            )}
            {tab === "drive" && <DriveTab />}
            {tab === "audit" && <AuditLogTab />}
          </section>
        )}
      </main>
    </div>
  );
}
