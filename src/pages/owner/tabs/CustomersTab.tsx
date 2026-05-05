import { useState } from "react";
import { ownerAdmin } from "@/lib/owner/ownerAdmin";

export default function CustomersTab() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({ email: "", name: "", phone: "", company: "", notes: "" });

  async function search() {
    setErr(null);
    try {
      const res = await ownerAdmin<{ ok: true; customers: any[] }>("customers.search", { q });
      setRows(res.customers ?? []);
    } catch (e: any) {
      setErr(e.message || "Search failed.");
    }
  }

  async function save() {
    setErr(null);
    try {
      const res = await ownerAdmin<{ ok: true; customer: any }>("customers.upsert", form);
      setForm({ email: res.customer.email, name: res.customer.name ?? "", phone: res.customer.phone ?? "", company: res.customer.company ?? "", notes: res.customer.notes ?? "" });
      await search();
    } catch (e: any) {
      setErr(e.message || "Save failed.");
    }
  }

  return (
    <div className="space-y-4">
      {err && <div className="p-3 rounded border border-red-800 bg-red-950/40 text-sm text-red-200">{err}</div>}

      <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
        <div className="font-semibold">Upsert Customer</div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input className="Input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email (required)" />
          <input className="Input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="company" />
          <input className="Input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="name" />
          <input className="Input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="phone" />
          <textarea className="Input md:col-span-2" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="notes" />
        </div>
        <div className="mt-3">
          <button className="BtnPrimary" onClick={save} disabled={!form.email.trim()}>Save</button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <input className="Input max-w-md" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search by email/name/company" />
        <button className="Btn" onClick={search}>Search</button>
      </div>

      <div className="rounded border border-zinc-800 overflow-hidden">
        <div className="bg-zinc-950 px-3 py-2 text-xs text-zinc-400">Results</div>
        <div className="divide-y divide-zinc-900">
          {rows.map((r) => (
            <div key={r.id} className="p-3 bg-black text-sm">
              <div className="flex flex-wrap gap-2 justify-between">
                <div><span className="text-zinc-400">Email:</span> {r.email}</div>
                <div className="text-xs text-zinc-500">Updated: {new Date(r.updated_at).toLocaleString()}</div>
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {r.company ?? "—"} | {r.name ?? "—"} | {r.phone ?? "—"}
              </div>
              {r.notes && <div className="text-xs text-zinc-500 mt-2">{r.notes}</div>}
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
