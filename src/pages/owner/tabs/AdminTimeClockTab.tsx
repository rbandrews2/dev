import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import TimeTrackingPanel from "@/components/time/TimeTrackingPanel";
import TimesheetsPage from "@/pages/admin/Timesheets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AdminTimeEntry = {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  duration_seconds: number | null;
  note: string | null;
  job_label_at_time: string | null;
  task_label_at_time: string | null;
  gross_pay: number | null;
};

function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export default function AdminTimeClockTab() {
  const [entries, setEntries] = useState<AdminTimeEntry[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId]
  );

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select("id, user_id, clock_in, clock_out, duration_seconds, note, job_label_at_time, task_label_at_time, gross_pay")
        .order("clock_in", { ascending: false })
        .limit(100);

      if (error) throw error;
      const rows = (data ?? []) as AdminTimeEntry[];
      setEntries(rows);
      const nextSelected = rows.find((entry) => entry.id === selectedId) ?? rows[0] ?? null;
      setSelectedId(nextSelected?.id ?? "");
    } catch (error) {
      console.error("Unable to load time entries", error);
      setStatus("Unable to load time entries. Confirm admin RLS policies are applied.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (!selected) {
      setClockIn("");
      setClockOut("");
      setNote("");
      return;
    }
    setClockIn(toLocalInputValue(selected.clock_in));
    setClockOut(toLocalInputValue(selected.clock_out));
    setNote(selected.note ?? "");
  }, [selected]);

  async function saveEntry() {
    if (!selected) return;
    const nextClockIn = toIso(clockIn);
    const nextClockOut = toIso(clockOut);
    if (!nextClockIn) {
      setStatus("Clock-in time is required.");
      return;
    }

    const durationSeconds = nextClockOut
      ? Math.max(0, Math.floor((new Date(nextClockOut).getTime() - new Date(nextClockIn).getTime()) / 1000))
      : null;

    setSaving(true);
    setStatus(null);
    try {
      const { error } = await supabase
        .from("time_entries")
        .update({
          clock_in: nextClockIn,
          clock_out: nextClockOut,
          duration_seconds: durationSeconds,
          note: note.trim() || null,
        })
        .eq("id", selected.id);

      if (error) throw error;
      setStatus("Time entry updated.");
      await loadEntries();
    } catch (error) {
      console.error("Unable to update time entry", error);
      setStatus("Unable to update this entry. Confirm admin update policies are applied.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Crew Timesheet Exports</h2>
          <p className="text-sm text-zinc-400">Download payroll-ready CSV, Excel, and PDF reports.</p>
        </div>
        <TimesheetsPage />
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Time Entry Corrections</h2>
          <p className="text-sm text-zinc-400">Adjust clock-in, clock-out, and notes for submitted entries.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),minmax(320px,420px)]">
          <div className="max-h-96 overflow-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-black text-zinc-400">
                <tr>
                  <th className="p-2 text-left">Entry</th>
                  <th className="p-2 text-left">Job / Task</th>
                  <th className="p-2 text-right">Hours</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`cursor-pointer border-t border-zinc-800 ${selectedId === entry.id ? "bg-emerald-500/10" : "hover:bg-white/5"}`}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <td className="p-2">
                      <div>{new Date(entry.clock_in).toLocaleString()}</div>
                      <div className="text-xs text-zinc-500">{entry.user_id}</div>
                    </td>
                    <td className="p-2">
                      <div>{entry.job_label_at_time ?? "-"}</div>
                      <div className="text-xs text-zinc-500">{entry.task_label_at_time ?? "-"}</div>
                    </td>
                    <td className="p-2 text-right">
                      {entry.duration_seconds ? (entry.duration_seconds / 3600).toFixed(2) : "Open"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && entries.length === 0 && (
              <div className="p-4 text-sm text-zinc-400">No time entries found.</div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black/40 p-4 space-y-3">
            <h3 className="font-semibold text-white">Selected Entry</h3>
            <label className="grid gap-1 text-sm text-zinc-300">
              Clock in
              <Input type="datetime-local" value={clockIn} onChange={(event) => setClockIn(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm text-zinc-300">
              Clock out
              <Input type="datetime-local" value={clockOut} onChange={(event) => setClockOut(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm text-zinc-300">
              Note
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
            </label>
            <div className="flex items-center gap-2">
              <Button onClick={saveEntry} disabled={!selected || saving}>
                {saving ? "Saving..." : "Save correction"}
              </Button>
              <Button variant="outline" onClick={() => void loadEntries()} disabled={loading}>
                Refresh
              </Button>
            </div>
            {status && <p className="text-sm text-orange-100/80">{status}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Job and Task Setup</h2>
          <p className="text-sm text-zinc-400">These controls are intentionally removed from the crew Time Clock page.</p>
        </div>
        <TimeTrackingPanel adminMode />
      </section>
    </div>
  );
}
