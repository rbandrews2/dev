import { useEffect, useState } from "react";
import { ownerAdmin } from "@/lib/owner/ownerAdmin";

type AuditRow = {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: any;
  created_at: string;
};

export default function AuditLogTab() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    try {
      const res = await ownerAdmin<{ ok: true; logs: AuditRow[] }>("audit.list", { q });
      setRows(res.logs ?? []);
    } catch (e: any) {
      setErr(e.message || "Failed to load audit log.");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {err && <div className="p-3 rounded border border-red-800 bg-red-950/40 text-sm text-red-200">{err}</div>}

      <div className="flex gap-2 items-center">
        <input
          className="Input max-w-md"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search by action, actor email, or target id"
        />
        <button className="Btn" onClick={refresh}>Search</button>
      </div>

      <div className="rounded border border-zinc-800 overflow-hidden">
        <div className="bg-zinc-950 px-3 py-2 text-xs text-zinc-400">Latest 200</div>
        <div className="divide-y divide-zinc-900">
          {rows.map((r) => (
            <div key={r.id} className="p-3 bg-black">
              <div className="flex flex-wrap justify-between gap-2">
                <div className="text-sm font-semibold">{r.action}</div>
                <div className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {r.actor_email ?? "unknown"} ƒ?› {r.target_type ?? "target"} ƒ?›{" "}
                <span className="font-mono">{r.target_id ?? "n/a"}</span>
              </div>
              {r.detail && (
                <pre className="mt-2 text-xs text-zinc-500 whitespace-pre-wrap">
                  {JSON.stringify(r.detail, null, 2)}
                </pre>
              )}
            </div>
          ))}
          {rows.length === 0 && <div className="p-4 text-sm text-zinc-500">No audit entries.</div>}
        </div>
      </div>

      <style>{`
        .Input{background:#09090b;border:1px solid #27272a;border-radius:.5rem;padding:.6rem .75rem;color:#fff;font-size:.9rem;outline:none}
        .Input:focus{border-color:#10b981}
        .Btn{background:#09090b;border:1px solid #27272a;border-radius:.5rem;padding:.55rem .8rem;font-size:.85rem}
        .Btn:hover{border-color:#3f3f46}
      `}</style>
    </div>
  );
}
