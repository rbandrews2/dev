import { useEffect, useState } from "react";
import { ownerAdmin } from "@/lib/owner/ownerAdmin";

export default function TicketsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const [draft, setDraft] = useState({ customer_email: "", subject: "", message: "", priority: "normal" });

  async function refresh() {
    setErr(null);
    try {
      const res = await ownerAdmin<{ ok: true; tickets: any[] }>("tickets.list", { status: statusFilter || undefined });
      setRows(res.tickets ?? []);
    } catch (e: any) {
      setErr(e.message || "Failed to load tickets.");
    }
  }

  useEffect(() => { refresh(); }, [statusFilter]);

  async function create() {
    setErr(null);
    try {
      await ownerAdmin("tickets.create", draft);
      setDraft({ customer_email: "", subject: "", message: "", priority: "normal" });
      await refresh();
    } catch (e: any) {
      setErr(e.message || "Create failed.");
    }
  }

  async function update(id: string, patch: any) {
    setErr(null);
    try {
      await ownerAdmin("tickets.update", { id, ...patch });
      await refresh();
    } catch (e: any) {
      setErr(e.message || "Update failed.");
    }
  }

  return (
    <div className="space-y-4">
      {err && <div className="p-3 rounded border border-red-800 bg-red-950/40 text-sm text-red-200">{err}</div>}

      <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
        <div className="font-semibold">Create Ticket</div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input className="Input" value={draft.customer_email} onChange={(e) => setDraft({ ...draft, customer_email: e.target.value })} placeholder="customer email" />
          <select className="Input" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
          <input className="Input md:col-span-2" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="subject" />
          <textarea className="Input md:col-span-2" rows={3} value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} placeholder="customer message" />
        </div>
        <div className="mt-3">
          <button className="BtnPrimary" onClick={create} disabled={!draft.customer_email.trim() || !draft.subject.trim() || !draft.message.trim()}>
            Create Ticket
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select className="Input max-w-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">all</option>
          <option value="open">open</option>
          <option value="in_progress">in_progress</option>
          <option value="resolved">resolved</option>
          <option value="closed">closed</option>
        </select>
        <button className="Btn" onClick={refresh}>Refresh</button>
      </div>

      <div className="rounded border border-zinc-800 overflow-hidden">
        <div className="bg-zinc-950 px-3 py-2 text-xs text-zinc-400">Latest 100</div>
        <div className="divide-y divide-zinc-900">
          {rows.map((t) => (
            <div key={t.id} className="p-3 bg-black">
              <div className="flex flex-wrap justify-between gap-2">
                <div className="text-sm font-semibold">{t.subject}</div>
                <div className="text-xs text-zinc-500">{new Date(t.updated_at).toLocaleString()}</div>
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {t.customer_email} • <span className="font-mono">{t.id}</span> • status: {t.status} • priority: {t.priority}
              </div>
              <div className="text-sm text-zinc-200 mt-2 whitespace-pre-wrap">{t.message}</div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <textarea
                  className="Input"
                  rows={2}
                  defaultValue={t.owner_notes ?? ""}
                  placeholder="owner notes"
                  onBlur={(e) => update(t.id, { owner_notes: e.target.value })}
                />
                <div className="flex flex-wrap gap-2 items-start">
                  <button className="Btn" onClick={() => update(t.id, { status: "in_progress" })}>In progress</button>
                  <button className="Btn" onClick={() => update(t.id, { status: "resolved" })}>Resolved</button>
                  <button className="Btn" onClick={() => update(t.id, { status: "closed" })}>Closed</button>
                </div>
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="p-4 text-sm text-zinc-500">No tickets.</div>}
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
