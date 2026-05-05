import { useEffect, useState } from "react";
import { ownerAdmin } from "@/lib/owner/ownerAdmin";

type CodeRow = {
  id: string;
  status: "new" | "redeemed" | "revoked";
  customer_email: string | null;
  order_id: string | null;
  product_sku: string | null;
  issued_at: string;
  redeemed_at: string | null;
  redeemed_installation_id: string | null;
};

export default function CodesTab() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [issueEmail, setIssueEmail] = useState("");
  const [issueSku, setIssueSku] = useState("WZOS_CORE");
  const [issueOrder, setIssueOrder] = useState("");
  const [issuedCode, setIssuedCode] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const res = await ownerAdmin<{ ok: true; codes: CodeRow[] }>("codes.list", { q });
      setRows(res.codes ?? []);
    } catch (e: any) {
      setErr(e.message || "Failed to load codes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function issue() {
    setErr(null);
    setIssuedCode(null);
    try {
      const res = await ownerAdmin<{ ok: true; activation_code: string }>("codes.issue", {
        customer_email: issueEmail,
        product_sku: issueSku,
        order_id: issueOrder,
      });
      setIssuedCode(res.activation_code);
      await refresh();
    } catch (e: any) {
      setErr(e.message || "Issue failed.");
    }
  }

  async function revoke(id: string) {
    setErr(null);
    try {
      await ownerAdmin("codes.revoke", { id });
      await refresh();
    } catch (e: any) {
      setErr(e.message || "Revoke failed.");
    }
  }

  async function reissue(id: string) {
    setErr(null);
    setIssuedCode(null);
    try {
      const res = await ownerAdmin<{ ok: true; activation_code: string }>("codes.reissue", { id });
      setIssuedCode(res.activation_code);
      await refresh();
    } catch (e: any) {
      setErr(e.message || "Reissue failed.");
    }
  }

  return (
    <div className="space-y-4">
      {err && <Banner text={err} />}

      <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
        <div className="font-semibold">Issue New Activation Code</div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input className="Input" value={issueEmail} onChange={(e) => setIssueEmail(e.target.value)} placeholder="customer email" />
          <input className="Input" value={issueOrder} onChange={(e) => setIssueOrder(e.target.value)} placeholder="order id (optional)" />
          <input className="Input" value={issueSku} onChange={(e) => setIssueSku(e.target.value)} placeholder="product sku (e.g., WZOS_CORE)" />
        </div>
        <div className="mt-3 flex gap-2 items-center">
          <button className="BtnPrimary" onClick={issue} disabled={!issueEmail.trim()}>
            Issue Code
          </button>
          {issuedCode && (
            <div className="text-sm">
              Plaintext code (copy once):{" "}
              <span className="font-mono tracking-widest text-emerald-300">{issuedCode}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <input className="Input max-w-md" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search by email or order id" />
        <button className="Btn" onClick={refresh} disabled={loading}>
          {loading ? "Loading..." : "Search"}
        </button>
      </div>

      <div className="rounded border border-zinc-800 overflow-hidden">
        <div className="bg-zinc-950 px-3 py-2 text-xs text-zinc-400">Latest 100</div>
        <div className="divide-y divide-zinc-900">
          {rows.map((r) => (
            <div key={r.id} className="p-3 bg-black">
              <div className="flex flex-wrap gap-2 justify-between">
                <div className="text-sm">
                  <span className="font-mono text-zinc-300">{r.id}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded border text-xs ${badge(r.status)}`}>{r.status}</span>
                </div>
                <div className="text-xs text-zinc-500">Issued: {new Date(r.issued_at).toLocaleString()}</div>
              </div>

              <div className="mt-2 text-xs text-zinc-400 grid gap-1 md:grid-cols-3">
                <div>Email: {r.customer_email ?? "—"}</div>
                <div>Order: {r.order_id ?? "—"}</div>
                <div>SKU: {r.product_sku ?? "—"}</div>
                <div className="md:col-span-3">
                  Redeemed installation: <span className="font-mono">{r.redeemed_installation_id ?? "—"}</span>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button className="Btn" onClick={() => revoke(r.id)} disabled={r.status !== "new"}>
                  Revoke
                </button>
                <button className="Btn" onClick={() => reissue(r.id)}>
                  Reissue
                </button>
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="p-4 text-sm text-zinc-500">No results.</div>}
        </div>
      </div>

      <StyleHelpers />
    </div>
  );
}

function badge(s: string) {
  if (s === "new") return "border-emerald-700 text-emerald-200 bg-emerald-950/40";
  if (s === "redeemed") return "border-blue-700 text-blue-200 bg-blue-950/40";
  return "border-red-800 text-red-200 bg-red-950/40";
}

function Banner({ text }: { text: string }) {
  return <div className="p-3 rounded border border-red-800 bg-red-950/40 text-sm text-red-200">{text}</div>;
}

function StyleHelpers() {
  return (
    <style>{`
      .Input{background:#09090b;border:1px solid #27272a;border-radius:.5rem;padding:.6rem .75rem;color:#fff;font-size:.9rem;outline:none}
      .Input:focus{border-color:#10b981}
      .Btn{background:#09090b;border:1px solid #27272a;border-radius:.5rem;padding:.55rem .8rem;font-size:.85rem}
      .Btn:hover{border-color:#3f3f46}
      .BtnPrimary{background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.45);border-radius:.5rem;padding:.55rem .8rem;font-size:.85rem}
      .BtnPrimary:hover{background:rgba(16,185,129,.22)}
      .Btn:disabled,.BtnPrimary:disabled{opacity:.5;cursor:not-allowed}
    `}</style>
  );
}
