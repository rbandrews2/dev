import { useCallback, useEffect, useState } from "react";
import { Download, Calendar, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequireAdmin } from "@/lib/rbac/requireAdmin";
import type { TimeEntry } from "@/pages/admin/TimesheetExport";
import {
  exportTimesheetsCSV,
  exportTimesheetsPDF,
} from "@/pages/admin/TimesheetExport";

export default function TimesheetsPage() {
  const adminRedirect = useRequireAdmin();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTimesheets = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase.rpc("admin_timesheet_view", {
      from_date: from,
      to_date: to,
    });

    if (!error) setEntries(data ?? []);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    if (from && to) void loadTimesheets();
  }, [from, to, loadTimesheets]);

  if (adminRedirect) return adminRedirect;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Timesheets</h1>
          <p className="text-sm text-muted-foreground">
            Approved time records for payroll and reporting
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-black/60 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" /> From
          </label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>

        <div>
          <label className="text-xs text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" /> To
          </label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>

        <div className="flex items-end gap-2">
          <Button onClick={loadTimesheets} disabled={loading}>
            Load
          </Button>
        </div>
      </div>

      {/* Export Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => exportTimesheetsCSV(entries)}
          className="gap-2"
        >
          <Download className="h-4 w-4" /> CSV
        </Button>
        <Button
          variant="outline"
          onClick={() => void exportTimesheetsPDF(entries, from, to)}
          className="gap-2"
        >
          <Download className="h-4 w-4" /> PDF
        </Button>
      </div>

      {/* Table Preview */}
      <div className="rounded-2xl border bg-black/70 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/80 text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Employee</th>
              <th className="p-3">Clock In</th>
              <th className="p-3">Clock Out</th>
              <th className="p-3 text-right">Hours</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} className="border-t border-white/5">
                <td className="p-3">{e.user_name}</td>
                <td className="p-3">{new Date(e.clock_in).toLocaleString()}</td>
                <td className="p-3">{e.clock_out ? new Date(e.clock_out).toLocaleString() : "Open"}</td>
                <td className="p-3 text-right font-medium">
                  {e.total_hours.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
