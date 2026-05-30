import { useState } from "react";
import { Download, Calendar, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRequireAdmin } from "@/lib/rbac/requireAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type TimeEntry = {
  id: string;
  user_name: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number;
};

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function exportTimesheetsCSV(entries: TimeEntry[]) {
  if (!entries.length) return;

  const rows = [
    ["Employee", "Clock In", "Clock Out", "Hours"],
    ...entries.map(e => [
      e.user_name,
      new Date(e.clock_in).toLocaleString(),
      e.clock_out ? new Date(e.clock_out).toLocaleString() : "Open",
      e.total_hours.toFixed(2),
    ]),
  ];

  const csv = rows.map(r => r.map(csvCell).join(",")).join("\r\n");
  downloadFile(`\uFEFF${csv}`, "timesheets.csv", "text/csv;charset=utf-8");
}

export async function exportTimesheetsPDF(
  entries: TimeEntry[],
  from?: string,
  to?: string
) {
  if (!entries.length) return;

  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 42;

  doc.setFontSize(16);
  doc.text("Timesheet Export", 14, 18);

  doc.setFontSize(10);
  const fromLabel = from || "N/A";
  const toLabel = to || "N/A";
  doc.text(`Period: ${fromLabel} - ${toLabel}`, 14, 26);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Employee", 14, y);
  doc.text("Clock In", 72, y);
  doc.text("Clock Out", 126, y);
  doc.text("Hours", pageWidth - 14, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 6;

  entries.forEach((entry) => {
    if (y > pageHeight - 18) {
      doc.addPage();
      y = 18;
    }

    const employeeLines = doc.splitTextToSize(entry.user_name || "Unknown", 52);
    const rowHeight = Math.max(6, employeeLines.length * 5);
    doc.text(employeeLines, 14, y);
    doc.text(new Date(entry.clock_in).toLocaleString(), 72, y);
    doc.text(entry.clock_out ? new Date(entry.clock_out).toLocaleString() : "Open", 126, y);
    doc.text(entry.total_hours.toFixed(2), pageWidth - 14, y, { align: "right" });
    y += rowHeight;
  });

  doc.save("timesheets.pdf");
}

function downloadFile(content: BlobPart | BlobPart[], filename: string, type: string) {
  const parts = Array.isArray(content) ? content : [content];
  const blob = new Blob(parts, { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TimesheetExportsPage() {
  const adminRedirect = useRequireAdmin();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [fetching, setFetching] = useState(false);

  async function loadData() {
    if (!from || !to) return;
    setFetching(true);

    const { data, error } = await supabase.rpc("admin_timesheet_view", {
      from_date: from,
      to_date: to,
    });

    if (!error) setEntries(data ?? []);
    setFetching(false);
  }

  if (adminRedirect) return adminRedirect;

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-2">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl border border-orange-400/40 bg-black/70 flex items-center justify-center text-orange-300">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Timesheet Exports</h1>
          <p className="text-sm text-muted-foreground">
            Admin-only payroll and compliance exports
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-black/65 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <div className="flex items-end">
          <Button onClick={loadData} disabled={fetching}>
            Load Records
          </Button>
        </div>
      </div>

      {/* Export Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => exportTimesheetsCSV(entries)}
          disabled={!entries.length}
        >
          <Download className="h-4 w-4 mr-2" /> CSV
        </Button>
        <Button
          variant="outline"
          onClick={() => void exportTimesheetsPDF(entries, from, to)}
          disabled={!entries.length}
        >
          <Download className="h-4 w-4 mr-2" /> PDF
        </Button>
      </div>

      {/* Preview Table */}
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
            {!entries.length && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  No records loaded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
