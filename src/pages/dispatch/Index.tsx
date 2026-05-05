import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/lib/supabase/client";
import { Send, Truck, User, MapPin } from "lucide-react";
import { sanitizePayload } from "@/lib/security";
import { usePermissions } from "@/hooks/usePermissions";

type DispatchJob = {
  id: string;
  title: string;
  address: string;
  assignee: string;
  notes: string | null;
  start_time: string | null;
  status: "queued" | "sent" | "completed" | "cancelled";
  created_at: string;
};

function featureEnabled() {
  const v = import.meta.env.VITE_FEATURE_DISPATCH;
  return v === undefined ? true : String(v).toLowerCase() !== "false";
}

export default function DispatchIndex() {
  const enabled = useMemo(() => featureEnabled(), []);
  const { canAdmin } = usePermissions();
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [assignee, setAssignee] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<DispatchJob[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);

  async function load() {
    setError(null);
    try {
      const { data, error } = await supabase
        .from("dispatch_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);

      if (error) throw error;
      setJobs((data ?? []) as DispatchJob[]);
    } catch (e: any) {
      setJobs([]);
      setError(
        e?.message ??
          "Unable to load dispatch jobs. Ensure the dispatch_jobs table exists in Supabase."
      );
    } finally {
      setInitialLoad(false);
    }
  }

  useEffect(() => {
    if (!enabled) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  async function submit() {
    if (!canAdmin) {
      setError("Only admins or owners can create or modify dispatch jobs.");
      return;
    }
    if (!title.trim() || !address.trim() || !assignee.trim()) {
      setError("Title, address, and assignee are required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = sanitizePayload({
        title: title.trim(),
        address: address.trim(),
        assignee: assignee.trim(),
        notes: notes.trim() ? notes.trim() : null,
        start_time: startTime ? new Date(startTime).toISOString() : null,
        status: "queued",
      });

      const { error } = await supabase.from("dispatch_jobs").insert(payload);
      if (error) throw error;

      setTitle("");
      setAddress("");
      setAssignee("");
      setStartTime("");
      setNotes("");
      await load();
    } catch (e: any) {
      setError(
        e?.message ??
          "Unable to create dispatch job. Check Supabase configuration."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ---------- FEATURE DISABLED STATE ---------- */
  if (!enabled) {
    return (
      <div className="p-6 min-h-[calc(100vh-64px)]">
        <GlassCard>
          <div className="text-lg font-semibold">Dispatch is disabled</div>
          <div className="text-sm text-white/70 mt-2">
            Set{" "}
            <code className="px-1 py-0.5 rounded bg-white/10">
              VITE_FEATURE_DISPATCH=true
            </code>{" "}
            to enable this module.
          </div>
        </GlassCard>
      </div>
    );
  }

  /* ---------- MAIN PAGE ---------- */
  return (
    <div className="p-6 min-h-[calc(100vh-64px)] space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Dispatch</h1>
          <p className="text-sm text-white/70">
            Create assignments and track dispatch status. MOTIV integration can
            be added via a server-side proxy.
          </p>
        </div>
      </div>

      {/* New Job */}
      <GlassCard className="space-y-4">
        <div className="text-lg font-semibold flex items-center gap-2">
          <Send className="w-4 h-4" /> New dispatch job
        </div>

        {!canAdmin && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            Dispatch creation is limited to admins and owners. You can view existing jobs below.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm text-white/70">Job title</span>
            <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <Send className="w-4 h-4 text-white/60" />
              <input
                className="w-full bg-transparent outline-none"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Lane closure setup"
                disabled={!canAdmin}
              />
            </div>
          </label>

          <label className="space-y-1">
            <span className="text-sm text-white/70">Assignee</span>
            <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <User className="w-4 h-4 text-white/60" />
              <input
                className="w-full bg-transparent outline-none"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="J. Ramirez"
                disabled={!canAdmin}
              />
            </div>
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm text-white/70">Address / location</span>
            <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <MapPin className="w-4 h-4 text-white/60" />
              <input
                className="w-full bg-transparent outline-none"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="I-81 Mile 45, Roanoke, VA"
                disabled={!canAdmin}
              />
            </div>
          </label>

          <label className="space-y-1">
            <span className="text-sm text-white/70">
              Start time (optional)
            </span>
            <input
              type="datetime-local"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={!canAdmin}
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm text-white/70">Notes (optional)</span>
            <textarea
              className="w-full min-h-[90px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Equipment, hazards, contacts…"
              disabled={!canAdmin}
            />
          </label>
        </div>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/15 hover:bg-white/20 border border-white/20 px-4 py-2 disabled:opacity-60"
          onClick={submit}
          disabled={loading || !canAdmin}
        >
          <Send className="w-4 h-4" />
          {loading ? "Sending…" : "Create dispatch job"}
        </button>
      </GlassCard>

      {/* Recent Jobs */}
      <GlassCard>
        <div className="text-lg font-semibold mb-3">
          Recent dispatch jobs
        </div>

        {initialLoad ? (
          <div className="text-sm text-white/70">Loading jobs…</div>
        ) : jobs.length === 0 ? (
          <div className="text-sm text-white/70">
            No jobs yet. Create your first dispatch above.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <div
                key={j.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{j.title}</div>
                  <div className="text-xs rounded-full px-2 py-1 bg-white/10 border border-white/10">
                    {j.status}
                  </div>
                </div>
                <div className="text-sm text-white/70 mt-1">
                  {j.address}
                </div>
                <div className="text-xs text-white/60 mt-2">
                  Assigned to {j.assignee}
                  {j.start_time
                    ? ` • Starts ${new Date(j.start_time).toLocaleString()}`
                    : ""}
                </div>
                {j.notes && (
                  <div className="text-sm mt-2">{j.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
