import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ownerAdmin } from "@/lib/owner/ownerAdmin";

type VaultItem = {
  id: string;
  name: string;
  normalized_name: string;
  category: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by_email: string | null;
  updated_by_email: string | null;
};

type VaultListResponse = {
  ok: true;
  items: VaultItem[];
};

type VaultUpsertResponse = {
  ok: true;
  item: VaultItem;
  message: string;
};

type VaultRevealResponse = {
  ok: true;
  id: string;
  name: string;
  value: string;
};

type VaultExportResponse = {
  ok: true;
  envBlock: string;
  message: string;
};

type BusyState = "saving" | "revealing" | "deleting" | "exporting" | null;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function washSecret(raw: string) {
  return raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("\n");
}

function formatTime(value: string | null) {
  if (!value) return "n/a";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export default function VaultPage() {
  const { user, activeOrgId, organization } = useAuth();
  const { canAdmin } = usePermissions();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("integration");
  const [notes, setNotes] = useState("");
  const [value, setValue] = useState("");
  const [vault, setVault] = useState<VaultItem[]>([]);
  const [envPreview, setEnvPreview] = useState("");
  const [reveal, setReveal] = useState<{ id: string; value: string } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [busyState, setBusyState] = useState<BusyState>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [sealedMessage, setSealedMessage] = useState<string | null>(null);

  const ready = useMemo(() => Boolean(user && canAdmin && activeOrgId), [user, canAdmin, activeOrgId]);

  const loadVault = useCallback(async () => {
    if (!ready || !activeOrgId) return;
    setLoading(true);
    try {
      const res = await ownerAdmin<VaultListResponse>("vault.list", { organization_id: activeOrgId });
      setVault(res.items);
    } catch (error: unknown) {
      setStatus(errorMessage(error, "Failed to load vault entries."));
    } finally {
      setLoading(false);
    }
  }, [ready, activeOrgId]);

  useEffect(() => {
    void loadVault();
  }, [loadVault]);

  async function handleAddSecret() {
    if (!ready || !activeOrgId) {
      setStatus("Only owners and admins can use the production vault.");
      return;
    }
    if (!name.trim() || !value.trim()) {
      setStatus("Name and value are required.");
      return;
    }

    setBusyState("saving");
    setStatus(null);
    try {
      const res = await ownerAdmin<VaultUpsertResponse>("vault.upsert", {
        organization_id: activeOrgId,
        name: name.trim(),
        category: category.trim() || "generic",
        notes: notes.trim() || undefined,
        value: washSecret(value),
      });

      setVault((prev) => {
        const withoutOld = prev.filter((item) => item.id !== res.item.id && item.normalized_name !== res.item.normalized_name);
        return [res.item, ...withoutOld];
      });
      setName("");
      setValue("");
      setNotes("");
      setReveal(null);
      setStatus(res.message);
    } catch (error: unknown) {
      setStatus(errorMessage(error, "Failed to store the secret."));
    } finally {
      setBusyState(null);
    }
  }

  async function handleReveal(item: VaultItem) {
    if (!ready || !activeOrgId) {
      setStatus("Only owners and admins can reveal stored secrets.");
      return;
    }

    setBusyItemId(item.id);
    setBusyState("revealing");
    setStatus(null);
    try {
      const res = await ownerAdmin<VaultRevealResponse>("vault.reveal", {
        organization_id: activeOrgId,
        id: item.id,
      });
      setReveal({ id: item.id, value: res.value });
      setTimeout(() => {
        setReveal((prev) => (prev?.id === item.id ? null : prev));
      }, 10000);
      setStatus("Secret revealed for 10 seconds.");
    } catch (error: unknown) {
      setStatus(errorMessage(error, "Unable to reveal the secret."));
    } finally {
      setBusyItemId(null);
      setBusyState(null);
    }
  }

  async function handleEnvExport() {
    if (!ready || !activeOrgId) {
      setStatus("Only owners and admins can export vault contents.");
      return;
    }

    setBusyState("exporting");
    setStatus(null);
    try {
      const res = await ownerAdmin<VaultExportResponse>("vault.export", { organization_id: activeOrgId });
      setEnvPreview(res.envBlock);
      setStatus(res.message);
    } catch (error: unknown) {
      setStatus(errorMessage(error, "Unable to export vault contents."));
    } finally {
      setBusyState(null);
    }
  }

  function handleWash() {
    setValue(washSecret(value));
    setStatus("Secret washed (whitespace normalized).");
  }

  async function handleDelete(id: string) {
    if (!ready || !activeOrgId) {
      setStatus("Only owners and admins can delete stored secrets.");
      return;
    }

    setBusyItemId(id);
    setBusyState("deleting");
    setStatus(null);
    try {
      await ownerAdmin("vault.delete", { organization_id: activeOrgId, id });
      setVault((prev) => prev.filter((item) => item.id !== id));
      if (reveal?.id === id) setReveal(null);
      setStatus("Secret deleted from the server vault.");
    } catch (error: unknown) {
      setStatus(errorMessage(error, "Unable to delete the secret."));
    } finally {
      setBusyItemId(null);
      setBusyState(null);
    }
  }

  function handleSeal() {
    setSealing(true);
    setVaultOpen(false);
    setReveal(null);
    setSealedMessage("The vault is sealed");
    setTimeout(() => setSealing(false), 1200);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-zinc-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">The Vault</h1>
          <p className="text-sm text-gray-300">
            Secrets are now stored server-side for {organization?.name ?? "this organization"} and encrypted with the
            backend vault master key. This screen is for owner/admin operations only. The browser no longer stores
            production secret material in localStorage.
          </p>
        </header>

        <section className="relative">
          <div
            onMouseEnter={() => {
              setVaultOpen(true);
              setSealedMessage(null);
            }}
            className={`absolute inset-0 z-20 flex items-center justify-center transition duration-500 ${
              vaultOpen ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
            }`}
          >
            <div className="relative w-full max-w-4xl aspect-[4/3] bg-gradient-to-br from-gray-900 via-black to-gray-950 border border-amber-500/40 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex items-center justify-center">
              <div
                className={`h-40 w-40 rounded-full border-4 border-amber-400/60 bg-black/60 flex items-center justify-center transition-transform duration-700 ${
                  sealing ? "animate-spin" : ""
                }`}
              >
                <div className="h-6 w-6 rounded-full bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.8)]" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5" />
              <div className="absolute inset-x-8 top-6 text-center">
                <p className="text-sm text-amber-200/80 font-semibold tracking-wide">Vault locked</p>
                {sealedMessage && <p className="text-xs text-emerald-300 mt-1">{sealedMessage}</p>}
              </div>
              <div className="absolute bottom-6 inset-x-0 text-center text-xs text-amber-200/70">
                Hover to access the server vault controls.
              </div>
            </div>
          </div>

          <div className={`space-y-4 relative z-10 ${vaultOpen ? "" : "opacity-0 pointer-events-none"}`}>
            <div className="rounded-2xl border border-amber-500/30 bg-black/60 p-5 shadow-lg shadow-amber-500/10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-lg font-semibold text-white">Vault controls</div>
                  <div className="text-xs text-amber-100/70">Server-encrypted storage for integration and operator secrets.</div>
                </div>
                <button
                  type="button"
                  onClick={handleSeal}
                  className="rounded-full border border-amber-500/40 bg-amber-500 text-black px-3 py-1.5 text-xs font-semibold hover:bg-amber-400 transition"
                >
                  Seal the vault
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-gray-300">Secret name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. quickbooks_client_secret"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-black/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300">Category</label>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="integration"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-black/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-300">Notes</label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What this secret is used for"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-black/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-300">Secret value</label>
                  <textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Paste the secret..."
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-black/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={handleWash}
                  className="rounded-lg border border-amber-500/30 px-3 py-2 text-sm hover:border-amber-400 hover:text-amber-200"
                >
                  Wash secret
                </button>
                <button
                  onClick={() => void handleAddSecret()}
                  disabled={!ready || busyState === "saving"}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-60"
                >
                  {busyState === "saving" ? "Saving..." : "Encrypt and store"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/10 bg-black/50 p-5 space-y-3">
              <h3 className="text-lg font-semibold text-amber-200">Rotation policy</h3>
              <p className="text-sm text-gray-400">
                Browser-managed master keys are no longer used. Rotate the server-side `WZOS_VAULT_MASTER_KEY` through your
                secret manager and rewrap records in a controlled backend maintenance task when needed.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-black/60 p-5 shadow-lg shadow-amber-500/10 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-amber-200">Stored secrets</h3>
                <p className="text-xs text-gray-400">
                  {loading ? "Loading..." : `${vault.length} total`} • workspace: {organization?.name ?? "No organization selected"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadVault()}
                disabled={!ready || loading}
                className="rounded-lg border border-amber-500/30 px-3 py-2 text-xs text-amber-100 hover:border-amber-400 disabled:opacity-60"
              >
                Refresh
              </button>
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {vault.length === 0 && <p className="text-sm text-gray-400">No secrets stored yet.</p>}
              {vault.map((item) => {
                const isRevealed = reveal?.id === item.id;
                const isBusy = busyItemId === item.id;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-amber-500/20 bg-zinc-900/70 px-3 py-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          {item.normalized_name} • {item.category} • updated {formatTime(item.updated_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void handleReveal(item)}
                          disabled={!ready || isBusy}
                          className="text-xs rounded border border-amber-500/30 px-2 py-1 hover:border-amber-400 hover:text-amber-200 disabled:opacity-60"
                        >
                          {isBusy && busyState === "revealing" ? "Opening..." : isRevealed ? "Re-open" : "Reveal"}
                        </button>
                        <button
                          onClick={() => void handleDelete(item.id)}
                          disabled={!ready || isBusy}
                          className="text-xs rounded border border-red-500/30 px-2 py-1 text-red-200 hover:border-red-400 disabled:opacity-60"
                        >
                          {isBusy && busyState === "deleting" ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                    {item.notes && (
                      <div className="rounded-lg bg-black/40 border border-amber-500/20 p-2 text-xs text-amber-100/80">
                        {item.notes}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-500">
                      Created by {item.created_by_email ?? "unknown"} • Updated by {item.updated_by_email ?? "unknown"}
                    </div>
                    {isRevealed && (
                      <div className="rounded-lg bg-black/60 border border-amber-500/30 p-2 text-xs text-amber-100 whitespace-pre-wrap">
                        {reveal?.value}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="space-y-2">
              <button
                onClick={() => void handleEnvExport()}
                disabled={!ready || busyState === "exporting"}
                className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-60"
              >
                {busyState === "exporting" ? "Exporting..." : "Convert to .env block"}
              </button>
              <textarea
                value={envPreview}
                onChange={() => undefined}
                placeholder=".env preview will appear here after export"
                className="w-full min-h-[120px] rounded-lg border border-amber-500/30 bg-black/50 px-3 py-2 text-xs text-amber-100"
              />
            </div>
          </div>
        </section>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-100">
          <div className="flex items-center gap-2 font-semibold">
            <KeyRound className="w-4 h-4" />
            Production vault pattern
          </div>
          <p className="mt-2 text-emerald-100/80">
            Secrets are encrypted on the server with `WZOS_VAULT_MASTER_KEY`, stored per organization, and only revealed
            through audited owner/admin actions. This removes the previous client-local storage path.
          </p>
        </div>

        {status && (
          <div className="rounded-xl border border-amber-500/30 bg-black/60 px-4 py-3 text-sm text-amber-100">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
