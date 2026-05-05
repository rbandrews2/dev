import { useEffect, useState } from "react";
import { ownerAdmin } from "@/lib/owner/ownerAdmin";

type InstallRow = {
  installation_id: string;
  activated: boolean;
  locked: boolean;
  activation_code_id: string | null;
  created_at: string;
  activated_at: string | null;
  locked_at: string | null;
  last_attempt_at: string | null;
};

export default function InstallationsTab() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<InstallRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");

  async function refresh() {
    setErr(null);
    try {
      const res = await ownerAdmin<{ ok: true; installs: InstallRow[] }>("installs.list", { q });
      setRows(res.installs ?? []);
    } catch (e: any) {
      setErr(e.message || "Failed to load installations.");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function unlock(installation_id: string) {
    setErr(null);
    try {
      await ownerAdmin("installs.unlock", { installation_id });
      await refresh();
    } catch (e: any) {
      setErr(e.message || "Unlock failed.");
    }
  }

  async function transfer() {
    setErr(null);
    try {
      await ownerAdmin("licenses.transfer", { from_installation_id: fromId, to_installation_id: toId });
      setFromId("");
      setToId("");
      await refresh();
    } catch (e: any) {
      setErr(e.message || "Transfer failed.");
    }
  }

  return (
    <div className="space-y-4">
      {err && <div className="p-3 rounded border border-red-800 bg-red-950/40 text-sm text-red-200">{err}</div>}

      <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
        <div className="font-semibold">License Transfer</div>
        <div className="text-xs text-zinc-400 mt-1">
          Moves an activated license from one installation_id to another (owner-controlled).
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input className="Input" value={fromId} onChange={(e) => setFromId(e.target.value)} placeholder="from installation_id" />
          <input className="Input" value={toId} onChange={(e) => setToId(e.target.value)} placeholder="to installation_id" />
        </div>
        <div className="mt-3">
          <button className="BtnPrimary" onClick={transfer} disabled={!fromId.trim() || !toId.trim()}>
            Transfer License
          </button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <input className="Input max-w-md" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search installation_id" />
        <button className="Btn" onClick={refresh}>Search</button>
      </div>

      <div className="rounded border border-zinc-800 overflow-hidden">
        <div className="bg-zinc-950 px-3 py-2 text-xs text-zinc-400">Latest 200</div>
        <div className="divide-y divide-zinc-900">
          {rows.map((r) => (
            <div key={r.installation_id} className="p-3 bg-black">
              <div className="flex flex-wrap justify-between gap-2">
                <div className="text-sm font-mono">{r.installation_id}</div>
                <div className="text-xs text-zinc-500">Created: {new Date(r.created_at).toLocaleString()}</div>
              </div>

              <div className="mt-2 text-xs text-zinc-400 grid gap-1 md:grid-cols-4">
                <div>Activated: {String(r.activated)}</div>
                <div>Locked: {String(r.locked)}</div>
                <div>Code ID: <span className="font-mono">{r.activation_code_id ?? "—"}</span></div>
                <div>Last attempt: {r.last_attempt_at ? new Date(r.last_attempt_at).toLocaleString() : "—"}</div>
              </div>

              <div className="mt-3">
                <button className="Btn" onClick={() => unlock(r.installation_id)} disabled={!r.locked}>
                  Unlock + Reset Attempts
                </button>
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="p-4 text-sm text-zinc-500">No results.</div>}
        </div>
      </div>

      <style>{`
        .Input{background:#09090b;border:1px solid #27272a;border-radius:.5rem;padding:.6rem .75rem;color:#fff;font-size:.9rem;outline:none}
        .Input:focus{border-color:#10b981}
        .Btn{background:#09090b;border:1px solid #27272a;border-radius:.5rem;padding:.55rem .8rem;font-size:.85rem}
        .Btn:hover{border-color:#3f3f46}
        .BtnPrimary{background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.45);border-radius:.5rem;padding:.55rem .8rem;font-size:.85rem}
        .BtnPrimary:hover{background:rgba(16,185,129,.22)}
        .Btn:disabled,.BtnPrimary:disabled{opacity:.5;cursor:not-allowed}
      `}</style>
    </div>
  );
}
