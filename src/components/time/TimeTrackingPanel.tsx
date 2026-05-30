import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { sanitizePayload } from "@/lib/security";

type JobTitle = {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
};

type JobTask = {
  id: string;
  job_id: string;
  name: string;
  pay_rate: number;
  pay_unit: string;
  sort_order: number;
  is_active: boolean;
};

type TimeEntry = {
  id: string;
  clock_in: string;
  clock_out: string | null;
  duration_seconds: number | null;
  note: string | null;
  job_id: string | null;
  task_id: string | null;
  pay_rate_at_time: number | null;
  gross_pay: number | null;
  task_label_at_time: string | null;
  job_label_at_time: string | null;
};

type AuthMode = "signin" | "signup";
type QuickCategory =
  | "Travel time"
  | "Shop time"
  | "Jobsite"
  | "Yard time"
  | "Standby";

const QUICK_CATEGORIES: QuickCategory[] = [
  "Travel time",
  "Shop time",
  "Jobsite",
  "Yard time",
  "Standby",
];

type TimeTrackingPanelProps = {
  adminMode?: boolean;
};

const TimeTrackingPanel: React.FC<TimeTrackingPanelProps> = ({ adminMode = false }) => {
  const { user, loading } = useAuth();
  const { canAdmin } = usePermissions();
  const allowAdminControls = adminMode && canAdmin;
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [jobs, setJobs] = useState<JobTitle[]>([]);
  const [tasks, setTasks] = useState<JobTask[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [useFastClockIn, setUseFastClockIn] = useState(false);
  const [quickCategory, setQuickCategory] = useState<QuickCategory>("Travel time");
  const [note, setNote] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(false);

  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);

  const [filterJobId, setFilterJobId] = useState<string>("all");
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");

  // All signed-in users can use the time clock.
  // Admins (from org roles) can configure jobs and tasks.

  const isClockedIn = !!activeEntry && !activeEntry.clock_out;
  const requiresJobSelection = !useFastClockIn;
  const canStartEntry = useFastClockIn || (!!selectedJobId && !!selectedTaskId);
  const canSwitchEntry = useFastClockIn || (!!selectedJobId && !!selectedTaskId);
  const clockInDisabled =
    savingEntry ||
    loadingConfig ||
    (requiresJobSelection && (jobs.length === 0 || !selectedJobId || !selectedTaskId));
  const clockOutDisabled = savingEntry;
  const switchCategoryDisabled =
    savingEntry ||
    loadingConfig ||
    (!useFastClockIn && (jobs.length === 0 || !selectedJobId || !selectedTaskId));


  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filterJobId !== "all" && e.job_id !== filterJobId) return false;
      if (filterStart) {
        const start = new Date(filterStart + "T00:00:00");
        const ci = new Date(e.clock_in);
        if (ci < start) return false;
      }
      if (filterEnd) {
        const end = new Date(filterEnd + "T23:59:59");
        const ci = new Date(e.clock_in);
        if (ci > end) return false;
      }
      return true;
    });
  }, [entries, filterJobId, filterStart, filterEnd]);

  const totalHours = useMemo(() => {
    return filteredEntries.reduce((sum, e) => {
      if (!e.duration_seconds) return sum;
      return sum + e.duration_seconds / 3600;
    }, 0);
  }, [filteredEntries]);

  const totalGross = useMemo(() => {
    return filteredEntries.reduce((sum, e) => {
      if (!e.gross_pay) return sum;
      return sum + Number(e.gross_pay);
    }, 0);
  }, [filteredEntries]);

  
  const loadJobs = async () => {
    setLoadingConfig(true);
    try {
      const { data, error } = await supabase
        .from("job_titles")
        .select("id, name, code, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading jobs:", error.message);
        setJobs([]);
        return;
      }
      const nextJobs = (data ?? []) as JobTitle[];
      setJobs(nextJobs);

      if (nextJobs.length === 0) {
        setSelectedJobId("");
        setTasks([]);
        setSelectedTaskId("");
        return;
      }

      const nextJobId =
        nextJobs.find((job) => job.id === selectedJobId)?.id ?? nextJobs[0].id;
      setSelectedJobId(nextJobId);
      await loadTasks(nextJobId);
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadTasks = async (jobId: string) => {
    if (!jobId) {
      setTasks([]);
      setSelectedTaskId("");
      return;
    }
    const { data, error } = await supabase
      .from("job_tasks")
      .select("id, job_id, name, pay_rate, pay_unit, sort_order, is_active")
      .eq("job_id", jobId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error loading tasks:", error.message);
      setTasks([]);
      setSelectedTaskId("");
      return;
    }

    setTasks((data ?? []) as JobTask[]);
    if ((data ?? []).length > 0) {
      setSelectedTaskId((data as any[])[0].id);
    } else {
      setSelectedTaskId("");
    }
  };

  const loadEntries = async (authUser: any) => {
    setLoadingEntries(true);
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select(
          "id, clock_in, clock_out, duration_seconds, note, job_id, task_id, pay_rate_at_time, gross_pay, task_label_at_time, job_label_at_time"
        )
        .eq("user_id", authUser.id)
        .order("clock_in", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error loading time entries:", error.message);
        setEntries([]);
        setActiveEntry(null);
        return;
      }

      const rows = (data ?? []) as TimeEntry[];
      setEntries(rows);
      const open = rows.find((r) => !r.clock_out);
      setActiveEntry(open ?? null);
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setJobs([]);
      setTasks([]);
      setSelectedJobId("");
      setSelectedTaskId("");
      setEntries([]);
      setActiveEntry(null);
      return;
    }

    void loadJobs();
    void loadEntries(user);
  }, [user?.id, loading]);

  const handleAuthSubmit = async () => {
    const email = authEmail.trim();
    const password = authPassword.trim();

    if (!email || !password) {
      setAuthError("Enter both email and password.");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setAuthError(error.message);
          return;
        }
        // AuthContext will pick up the new session and trigger data load.
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setAuthError(error.message);
          return;
        }
        setAuthMode("signin");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleJobChange = async (jobId: string) => {
    setSelectedJobId(jobId);
    setSelectedTaskId("");
    await loadTasks(jobId);
  };

  const buildClockInPayload = () => {
    if (useFastClockIn) {
      return {
        job_id: null,
        task_id: null,
        pay_rate_at_time: 0,
        task_label_at_time: quickCategory,
        job_label_at_time: "Fast Clock-in",
      };
    }

    const job = jobs.find((j) => j.id === selectedJobId);
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!job || !task) return null;

    return {
      job_id: job.id,
      task_id: task.id,
      pay_rate_at_time: task.pay_rate ?? 0,
      task_label_at_time: task.name,
      job_label_at_time: job.name,
    };
  };

  const createEntry = async (
    entryPayload: NonNullable<ReturnType<typeof buildClockInPayload>>
  ) => {
    setSavingEntry(true);
    try {
      const clockIn = new Date().toISOString();

      const { data, error } = await supabase
        .from("time_entries")
        .insert(
          sanitizePayload({
            user_id: user.id,
            clock_in: clockIn,
            note: note || null,
            ...entryPayload,
          })
        )
        .select(
          "id, clock_in, clock_out, duration_seconds, note, job_id, task_id, pay_rate_at_time, gross_pay, task_label_at_time, job_label_at_time"
        )
        .single();

      if (error) {
        console.error("Error clocking in:", error.message);
        return;
      }

      const entry = data as TimeEntry;
      setActiveEntry(entry);
      setEntries((prev) => [entry, ...prev]);
      setNote("");
    } finally {
      setSavingEntry(false);
    }
  };

  const handleClockIn = async () => {
    if (!user) return;
    if (!canStartEntry) return;
    if (isClockedIn) return;

    const entryPayload = buildClockInPayload();
    if (!entryPayload) return;

    await createEntry(entryPayload);
  };

  const closeEntry = async (entryToClose: TimeEntry) => {
    setSavingEntry(true);
    try {
      const clockOut = new Date();
      const clockIn = new Date(entryToClose.clock_in);
      const durationSeconds = Math.max(
        0,
        Math.floor((clockOut.getTime() - clockIn.getTime()) / 1000)
      );

      const payRate = entryToClose.pay_rate_at_time ?? 0;
      const hours = durationSeconds / 3600;
      const grossPay = Number((hours * payRate).toFixed(2));

      const { data, error } = await supabase
        .from("time_entries")
        .update({
          clock_out: clockOut.toISOString(),
          duration_seconds: durationSeconds,
          gross_pay: grossPay,
        })
        .eq("id", entryToClose.id)
        .select(
          "id, clock_in, clock_out, duration_seconds, note, job_id, task_id, pay_rate_at_time, gross_pay, task_label_at_time, job_label_at_time"
        )
        .single();

      if (error) {
        console.error("Error clocking out:", error.message);
        return;
      }

      const updated = data as TimeEntry;
      setActiveEntry(null);
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      return updated;
    } finally {
      setSavingEntry(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !activeEntry || activeEntry.clock_out) return;
    await closeEntry(activeEntry);
  };

  const handleSwitchCategory = async () => {
    if (!isClockedIn || !activeEntry || savingEntry || !user) return;
    if (!canSwitchEntry) return;

    const currentJobLabel = activeEntry.job_label_at_time ?? "";
    const currentTaskLabel = activeEntry.task_label_at_time ?? "";
    const nextJobLabel = useFastClockIn ? "Fast Clock-in" : jobs.find((job) => job.id === selectedJobId)?.name ?? "";
    const nextTaskLabel = useFastClockIn ? quickCategory : tasks.find((task) => task.id === selectedTaskId)?.name ?? "";

    if (currentJobLabel === nextJobLabel && currentTaskLabel === nextTaskLabel) return;

    const entryPayload = buildClockInPayload();
    if (!entryPayload) return;

    await closeEntry(activeEntry);
    await createEntry(entryPayload);
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const formatHours = (seconds: number | null) => {
    if (!seconds) return "0.00";
    const hours = seconds / 3600;
    return hours.toFixed(2);
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="bg-black/40 backdrop-blur-md border border-orange-500/30 rounded-xl p-5">
          <h2 className="text-xl font-semibold text-white mb-2">
            Time clock &amp; timesheets
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Sign in or create an account to start tracking hours for travel
            time, job site time, and more. Once signed in, you can clock in /
            out and view your recent timesheets.
          </p>

          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-black/70 p-1 text-[11px] mb-4">
            <button
              type="button"
              onClick={() => setAuthMode("signin")}
              className={`px-3 py-1 rounded-full ${
                authMode === "signin"
                  ? "bg-orange-500 text-black font-semibold"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("signup")}
              className={`px-3 py-1 rounded-full ${
                authMode === "signup"
                  ? "bg-orange-500 text-black font-semibold"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Create account
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@yourcompany.com"
                  className="w-full rounded-md bg-black/80 border border-orange-500/40 text-xs text-gray-100 px-3 py-2 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md bg-black/80 border border-orange-500/40 text-xs text-gray-100 px-3 py-2 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="text-[11px] text-gray-400 space-y-2">
              <p>
                Use your admin email if you need to configure job names and pay
                rates. Crew members can sign in with their own email to clock
                in and out.
              </p>
              <p>
                Time entries are stored securely and can be exported later for
                payroll, invoicing, or compliance audits.
              </p>
            </div>
          </div>

          {authError && (
            <div className="mt-3 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2">
              <p className="text-[11px] text-red-200">{authError}</p>
            </div>
          )}

          <div className="flex items-center justify-end mt-4">
            <button
              type="button"
              disabled={authLoading}
              onClick={handleAuthSubmit}
              className="px-4 py-2 rounded-md bg-orange-500 text-black text-xs font-semibold hover:bg-orange-400 disabled:opacity-60"
            >
              {authLoading
                ? authMode === "signin"
                  ? "Signing in..."
                  : "Creating account..."
                : authMode === "signin"
                ? "Sign in"
                : "Create account"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function handleExportPdf(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 16;

    doc.setFontSize(14);
    doc.text("Timesheet", 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.text(`User: ${user?.email ?? "Unknown"}`, 14, y);
    doc.text(
      `Range: ${filterStart || "Any"} → ${filterEnd || "Any"}`,
      14,
      y + 6
    );
    doc.text(
      `Total hours: ${totalHours.toFixed(2)}    Estimated gross: $${totalGross.toFixed(
        2
      )}`,
      14,
      y + 12
    );
    y += 20;

    // Header row
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Date", 14, y);
    doc.text("Job / Task", 60, y);
    doc.text("Hours", pageWidth - 50, y, { align: "right" });
    doc.text("Pay", pageWidth - 14, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 6;

    const lineHeight = 6;
    filteredEntries.forEach((entry) => {
      // Add new page if needed
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 16;
      }

      const date = formatDateTime(entry.clock_in);
      const jobTask = `${entry.job_label_at_time ?? "—"} / ${entry.task_label_at_time ?? "—"}`;
      const hours = formatHours(entry.duration_seconds);
      const pay = entry.gross_pay != null ? `$${Number(entry.gross_pay).toFixed(2)}` : "—";

      doc.setFontSize(10);
      doc.text(date, 14, y);
      // Truncate long job/task to avoid overflow
      const maxJobTaskWidth = pageWidth - 140;
      const jtLines = doc.splitTextToSize(jobTask, maxJobTaskWidth);
      doc.text(jtLines, 60, y);
      doc.text(hours, pageWidth - 50, y, { align: "right" });
      doc.text(pay, pageWidth - 14, y, { align: "right" });

      // Move y by number of lines printed for job/task
      y += lineHeight * Math.max(1, jtLines.length);
    });

    const fileName = `timesheet-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  }

  function handleExportCsv(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    // CSV header
    const headers = ["Date", "Job / Task", "Hours", "Pay", "Note"];
    const rows: string[] = [];

    // Helper to escape a CSV field
    const escapeField = (v: string) => {
      if (v == null) return "";
      const s = String(v);
      if (s.includes('"') || s.includes(",") || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    filteredEntries.forEach((entry) => {
      const date = formatDateTime(entry.clock_in);
      const jobTask = `${entry.job_label_at_time ?? "—"} / ${entry.task_label_at_time ?? "—"}`;
      const hours = formatHours(entry.duration_seconds);
      const pay = entry.gross_pay != null ? `$${Number(entry.gross_pay).toFixed(2)}` : "—";
      const note = entry.note ?? "";

      rows.push(
        [date, jobTask, hours, pay, note].map(escapeField).join(",")
      );
    });

    const csvContent = [headers.map(escapeField).join(","), ...rows].join("\r\n");
    // Prepend BOM so Excel recognizes UTF-8
    const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-md border border-orange-500/30 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">
            Time clock &amp; timesheets
          </h2>
          <p className="text-sm text-gray-400">
            {allowAdminControls
              ? "Track travel time, yard time, and on-site hours per job. Entries are tied to each user account for clean payroll and reporting."
              : "Clock in fast, switch categories quickly, and review your own hours without any admin setup tools."}
          </p>
        </div>
        <div className="text-xs text-gray-300">
          <p>
            Signed in as{" "}
            <span className="font-mono text-orange-300">{user.email}</span>
          </p>
          <p className="text-[11px] text-gray-500">
            Clocked-in status:{" "}
            <span
              className={
                isClockedIn ? "text-emerald-400 font-semibold" : "text-gray-400"
              }
            >
              {isClockedIn ? "On the clock" : "Off the clock"}
            </span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr),minmax(0,1.2fr)]">
        {/* Left: time clock controls + current status */}
        <div className="space-y-4">
          <div className="bg-black/60 backdrop-blur-md border border-orange-500/25 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-orange-300 mb-1">
              Clock-in details
            </h3>

            {loadingConfig ? (
              <p className="text-xs text-gray-400">Loading job setup...</p>
            ) : (
              <div className="space-y-3">
                {jobs.length === 0 && (
                  <p className="text-xs text-gray-400">
                    {allowAdminControls
                      ? "No jobs found yet. Use the Job setup panel to create a job such as \"Day Shift - Route 220\" and add tasks like \"Travel time\" or \"Jobsite\"."
                      : "No jobs are listed yet. Use Fast Clock-in only if your job is not listed, then tell your admin which job should be added."}
                  </p>
                )}
                <div className="rounded-lg border border-orange-500/20 bg-black/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-orange-300">
                        Fast Clock-in
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Use this only if your job is not listed. You can still
                        record the category you are working in.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-gray-300">
                      <input
                        type="checkbox"
                        checked={useFastClockIn}
                        onChange={(e) => setUseFastClockIn(e.target.checked)}
                      />
                      Enable
                    </label>
                  </div>
                </div>

                {useFastClockIn ? (
                  <div>
                    <label className="block text-[11px] text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={quickCategory}
                      onChange={(e) => setQuickCategory(e.target.value as QuickCategory)}
                      className="w-full rounded-md bg-black/80 border border-orange-500/40 text-xs text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      {QUICK_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                <div>
                  <label className="block text-[11px] text-gray-300 mb-1">
                    Job
                  </label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => handleJobChange(e.target.value)}
                    className="w-full rounded-md bg-black/80 border border-orange-500/40 text-xs text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.name}
                        {job.code ? ` (${job.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-300 mb-1">
                    Task
                  </label>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full rounded-md bg-black/80 border border-orange-500/40 text-xs text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    {tasks.length === 0 ? (
                      <option value="">No tasks configured</option>
                    ) : (
                      tasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.name} — ${task.pay_rate.toFixed(2)}/hr
                        </option>
                      ))
                    )}
                  </select>
                </div>
                  </>
                )}
                <div>
                  <label className="block text-[11px] text-gray-300 mb-1">
                    Optional note
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="w-full rounded-md bg-black/80 border border-orange-500/40 text-xs text-gray-100 px-3 py-2 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="Example: Flagging lane closure near mile marker 135."
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-gray-500 max-w-xs">
                Clock in when you begin travel, yard, shop, standby, or jobsite work. Clock
                out as soon as that portion is complete.
              </p>
              <div className="flex items-center gap-2">
                {isClockedIn && (
                  <button
                    type="button"
                    disabled={switchCategoryDisabled}
                    onClick={handleSwitchCategory}
                    className="px-4 py-2 rounded-md text-xs font-semibold bg-orange-500 hover:bg-orange-400 text-black disabled:opacity-60"
                  >
                    Switch category
                  </button>
                )}
                <button
                  type="button"
                  disabled={isClockedIn ? clockOutDisabled : clockInDisabled}
                  onClick={isClockedIn ? handleClockOut : handleClockIn}
                  className={`px-4 py-2 rounded-md text-xs font-semibold ${
                    isClockedIn
                      ? "bg-red-500 hover:bg-red-400 text-white"
                      : "bg-emerald-500 hover:bg-emerald-400 text-black"
                  } disabled:opacity-60`}
                >
                  {savingEntry
                    ? isClockedIn
                      ? "Saving..."
                      : "Starting..."
                    : isClockedIn
                    ? "Clock out"
                    : "Clock in"}
                </button>
              </div>
            </div>
          </div>

          {/* Current entry overview */}
          <div className="bg-black/60 backdrop-blur-md border border-orange-500/20 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-orange-300 mb-2">
              Current status
            </h3>
            {isClockedIn && activeEntry ? (
              <div className="space-y-1 text-xs text-gray-300">
                <p>
                  <span className="text-gray-400">Job:</span>{" "}
                  {activeEntry.job_label_at_time || "—"}
                </p>
                <p>
                  <span className="text-gray-400">Task:</span>{" "}
                  {activeEntry.task_label_at_time || "—"}
                </p>
                <p>
                  <span className="text-gray-400">Clocked in at:</span>{" "}
                  {formatDateTime(activeEntry.clock_in)}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  When you clock out, hours and pay will be calculated
                  automatically based on the rate saved for this task.
                </p>
                <p className="text-[11px] text-gray-500">
                  To change jobs or categories, choose the next option above and
                  use <span className="text-orange-300">Switch category</span>.
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                {allowAdminControls
                  ? "You are currently off the clock. Select a job and task, then use the Clock in button to start tracking time."
                  : "You are currently off the clock. Choose your job and category, or use Fast Clock-in only when your job is not listed."}
              </p>
            )}
          </div>
        </div>

        {/* Right: admin setup + recent timesheet */}
        <div className="space-y-4">
          {allowAdminControls && (
            <JobSetupPanel
              jobs={jobs}
              onJobsChanged={async () => {
                if (user) {
                  await loadJobs();
                }
              }}
            />
          )}

          <div className="bg-black/60 backdrop-blur-md border border-orange-500/25 rounded-xl p-5">
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-orange-300">
                  Recent timesheet
                </h3>
                <div className="text-[11px] text-gray-400 text-right">
                  <p>Total hours: {totalHours.toFixed(2)}</p>
                  <p>
                    Estimated gross: ${totalGross.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Showing {filteredEntries.length} entr{filteredEntries.length === 1 ? "y" : "ies"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Job:</span>
                  <select
                    value={filterJobId}
                    onChange={(e) => setFilterJobId(e.target.value)}
                    className="rounded-md bg-black/80 border border-orange-500/40 px-2 py-1 text-[11px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="all">All jobs</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">From:</span>
                  <input
                    type="date"
                    value={filterStart}
                    onChange={(e) => setFilterStart(e.target.value)}
                    className="rounded-md bg-black/80 border border-orange-500/40 px-2 py-1 text-[11px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">To:</span>
                  <input
                    type="date"
                    value={filterEnd}
                    onChange={(e) => setFilterEnd(e.target.value)}
                    className="rounded-md bg-black/80 border border-orange-500/40 px-2 py-1 text-[11px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                {allowAdminControls && (
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterJobId("all");
                      setFilterStart("");
                      setFilterEnd("");
                    }}
                    className="text-[10px] text-gray-400 hover:text-gray-200"
                  >
                    Clear filters
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-2 py-1 rounded-md bg-black/80 border border-orange-500/40 text-[10px] text-orange-300 hover:bg-orange-500/10"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={(e) => void handleExportPdf(e)}
                    className="px-2 py-1 rounded-md bg-orange-500 text-[10px] text-black font-semibold hover:bg-orange-400"
                  >
                    Export PDF
                  </button>
                </div>
                )}
              </div>
            </div>

            {loadingEntries ? (
              <p className="text-xs text-gray-400">Loading entries...</p>
            ) : filteredEntries.length === 0 ? (
              <p className="text-xs text-gray-400">
                No time entries match the current filters. Adjust the job or date range.
              </p>
            ) : (
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-[11px] text-gray-300">
                  <thead className="text-gray-400 border-b border-orange-500/20">
                    <tr>
                      <th className="text-left py-1 pr-2">Date</th>
                      <th className="text-left py-1 pr-2">Job / Task</th>
                      <th className="text-right py-1 pr-2">Hours</th>
                      <th className="text-right py-1">Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((e) => (
                      <tr
                        key={e.id}
                        className="border-b border-white/5 last:border-0"
                      >
                        <td className="py-1 pr-2 align-top">
                          <div>{formatDateTime(e.clock_in)}</div>
                          {e.clock_out && (
                            <div className="text-[10px] text-gray-500">
                              out: {formatDateTime(e.clock_out)}
                            </div>
                          )}
                        </td>
                        <td className="py-1 pr-2 align-top">
                          <div>{e.job_label_at_time || "—"}</div>
                          <div className="text-[10px] text-gray-500">
                            {e.task_label_at_time || "—"}
                          </div>
                        </td>
                        <td className="py-1 pr-2 text-right align-top">
                          {formatHours(e.duration_seconds)}
                        </td>
                        <td className="py-1 text-right align-top">
                          {e.gross_pay != null
                            ? `$${Number(e.gross_pay).toFixed(2)}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface JobSetupPanelProps {
  jobs: JobTitle[];
  onJobsChanged: () => void;
}

const JobSetupPanel: React.FC<JobSetupPanelProps> = ({
  jobs,
  onJobsChanged,
}) => {
  const [jobName, setJobName] = useState("");
  const [jobCode, setJobCode] = useState("");
  const [savingJob, setSavingJob] = useState(false);

  const [taskName, setTaskName] = useState("");
  const [taskRate, setTaskRate] = useState("0");
  const [savingTask, setSavingTask] = useState(false);
  const [selectedJobForTask, setSelectedJobForTask] = useState<string>("");

  useEffect(() => {
    if (jobs.length > 0 && !selectedJobForTask) {
      setSelectedJobForTask(jobs[0].id);
    }
  }, [jobs, selectedJobForTask]);

  const handleCreateJob = async () => {
    const name = jobName.trim();
    if (!name) return;
    setSavingJob(true);
    try {
      const { error } = await supabase.from("job_titles").insert(
        sanitizePayload({
          name,
          code: jobCode.trim() || null,
        })
      );
      if (error) {
        console.error("Error creating job:", error.message);
        return;
      }
      setJobName("");
      setJobCode("");
      await onJobsChanged();
    } finally {
      setSavingJob(false);
    }
  };

  const handleCreateTask = async () => {
    const name = taskName.trim();
    if (!name || !selectedJobForTask) return;
    const rateNum = Number(taskRate || "0") || 0;
    setSavingTask(true);
    try {
      const { error } = await supabase.from("job_tasks").insert(
        sanitizePayload({
          job_id: selectedJobForTask,
          name,
          pay_rate: rateNum,
          pay_unit: "hour",
        })
      );
      if (error) {
        console.error("Error creating task:", error.message);
        return;
      }
      setTaskName("");
      setTaskRate("0");
      await onJobsChanged();
    } finally {
      setSavingTask(false);
    }
  };

  return (
    <div className="bg-black/60 backdrop-blur-md border border-orange-500/25 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-orange-300">
        Job &amp; task setup (admin)
      </h3>
      <p className="text-[11px] text-gray-400 mb-1">
        Define the jobs and tasks your crews will see when clocking in. Use
        simple, clear labels like &quot;Day Shift – Route 220&quot; or
        &quot;Night Flagger – I-81&quot;.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[11px] text-gray-300 font-semibold">
            Create job title
          </p>
          <div>
            <label className="block text-[11px] text-gray-300 mb-1">
              Job name
            </label>
            <input
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder='e.g. "Day Shift – Route 220"'
              className="w-full rounded-md bg-black/80 border border-orange-500/40 text-xs text-gray-100 px-3 py-2 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-300 mb-1">
              Optional code
            </label>
            <input
              value={jobCode}
              onChange={(e) => setJobCode(e.target.value)}
              placeholder="e.g. RTE-220-DAY"
              className="w-full rounded-md bg-black/80 border border-orange-500/40 text-xs text-gray-100 px-3 py-2 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <button
            type="button"
            disabled={savingJob}
            onClick={handleCreateJob}
            className="mt-1 px-3 py-2 rounded-md bg-orange-500 text-black text-[11px] font-semibold hover:bg-orange-400 disabled:opacity-60"
          >
            {savingJob ? "Saving..." : "Save job"}
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] text-gray-300 font-semibold">
            Create task for job
          </p>
          <div>
            <label className="block text-[11px] text-gray-300 mb-1">
              Job
            </label>
            <select
              value={selectedJobForTask}
              onChange={(e) => setSelectedJobForTask(e.target.value)}
              className="w-full rounded-md bg-black/80 border border-orange-500/40 text-xs text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {jobs.length === 0 ? (
                <option value="">No jobs yet</option>
              ) : (
                jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-300 mb-1">
              Task name
            </label>
            <input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder='e.g. "Travel time" or "Job site"'
              className="w-full rounded-md bg-black/80 border border-orange-500/40 text-xs text-gray-100 px-3 py-2 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-300 mb-1">
              Hourly rate (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={taskRate}
              onChange={(e) => setTaskRate(e.target.value)}
              className="w-full rounded-md bg-black/80 border border-orange-500/40 text-xs text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <button
            type="button"
            disabled={savingTask || jobs.length === 0}
            onClick={handleCreateTask}
            className="mt-1 px-3 py-2 rounded-md bg-orange-500 text-black text-[11px] font-semibold hover:bg-orange-400 disabled:opacity-60"
          >
            {savingTask ? "Saving..." : "Save task"}
          </button>
        </div>
      </div>

      {jobs.length > 0 && (
        <div className="mt-3 text-[11px] text-gray-400">
          <p className="mb-1">Configured jobs:</p>
          <ul className="list-disc list-inside space-y-1">
            {jobs.map((job) => (
              <li key={job.id}>
                {job.name}
                {job.code ? (
                  <span className="text-gray-500"> ({job.code})</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TimeTrackingPanel;
