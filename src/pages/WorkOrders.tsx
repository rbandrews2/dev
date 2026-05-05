import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clipboard, MapPin, Users, PlusCircle } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { usePermissions } from "@/hooks/usePermissions";

type JobTitle = {
  id: string;
  name: string;
};

type WorkOrderDraft = {
  id: string;
  jobId: string;
  jobName: string;
  description: string;
  location: string;
  crewLead: string;
  crewMembers: string;
  customer: string;
  customerContact: string;
  notes: string;
  createdAt: string;
};

const rosterSeed: { name: string; phone: string }[] = [
  { name: "Ava Thompson", phone: "(555) 201-1122" },
  { name: "Marcus Green", phone: "(555) 201-2211" },
  { name: "Samantha Lee", phone: "(555) 201-3344" },
  { name: "Diego Perez", phone: "(555) 201-4455" },
  { name: "Jasmine Chen", phone: "(555) 201-5566" },
  { name: "Liam Brooks", phone: "(555) 201-6677" },
  { name: "Olivia Carter", phone: "(555) 201-7788" },
  { name: "Noah Patel", phone: "(555) 201-8899" },
  { name: "Elena Rivera", phone: "(555) 201-9900" },
  { name: "Caleb Johnson", phone: "(555) 201-1010" },
];

const WORK_ORDER_STORAGE_KEY = "wzos_work_orders";

type WorkOrdersPageProps = {
  adminMode?: boolean;
};

export default function WorkOrdersPage({ adminMode = false }: WorkOrdersPageProps) {
  const navigate = useNavigate();
  const { canAdmin } = usePermissions();
  const canManageWorkOrders = adminMode && canAdmin;
  const [jobs, setJobs] = useState<JobTitle[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [form, setForm] = useState({
    jobId: "",
    jobName: "",
    description: "",
    location: "",
    crewLead: "",
    crewMembers: "",
    customer: "",
    customerContact: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [savedWorkOrders, setSavedWorkOrders] = useState<WorkOrderDraft[]>([]);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoadingJobs(true);
      try {
        const { data, error } = await supabase
          .from("job_titles")
          .select("id, name")
          .eq("is_active", true)
          .order("created_at", { ascending: true });
        if (error) throw error;
        const list = (data ?? []) as JobTitle[];
        setJobs(list);
        if (list.length > 0) {
          setForm((prev) => ({ ...prev, jobId: list[0].id, jobName: list[0].name }));
        }
      } catch (err: any) {
        console.warn("Unable to load jobs", err?.message);
        setJobs([]);
      } finally {
        setLoadingJobs(false);
      }
    };
    void fetchJobs();
  }, []);

  useEffect(() => {
    try {
      const existingRaw = localStorage.getItem(WORK_ORDER_STORAGE_KEY);
      const existing: WorkOrderDraft[] = existingRaw ? JSON.parse(existingRaw) : [];
      setSavedWorkOrders(Array.isArray(existing) ? existing : []);
    } catch {
      setSavedWorkOrders([]);
    }
  }, []);

  const roster = useMemo(() => {
    // Demonstrate handling up to 200 entries by repeating the seed safely.
    const repeats = 20;
    return Array.from({ length: repeats })
      .flatMap(() => rosterSeed)
      .slice(0, 200);
  }, []);

  const jobOptions = jobs.length
    ? jobs
    : [{ id: "none", name: "Create a job first" }];

  const handleChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "jobId") {
      const match = jobs.find((j) => j.id === value);
      if (match) setForm((prev) => ({ ...prev, jobName: match.name }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageWorkOrders) {
      setStatus("Only admins or owners can create work orders. Ask your admin to create it for you.");
      return;
    }
    if (!form.jobId || form.jobId === "none") {
      setStatus("Select an existing job from Time Clock (or create one there first).");
      return;
    }
    const id = `WO-${Date.now()}`;
    const draft: WorkOrderDraft = {
      id,
      jobId: form.jobId,
      jobName: form.jobName || "Work Order",
      description: form.description,
      location: form.location,
      crewLead: form.crewLead,
      crewMembers: form.crewMembers,
      customer: form.customer,
      customerContact: form.customerContact,
      notes: form.notes,
      createdAt: new Date().toISOString(),
    };
    try {
      setSaving(true);
      const existingRaw = localStorage.getItem(WORK_ORDER_STORAGE_KEY);
      const existing: WorkOrderDraft[] = existingRaw ? JSON.parse(existingRaw) : [];
      const next = [draft, ...existing].slice(0, 25);
      localStorage.setItem(WORK_ORDER_STORAGE_KEY, JSON.stringify(next));
      setSavedWorkOrders(next);
      setStatus("Work order created and visible on the dashboard.");
      setTimeout(() => navigate("/work-orders"), 400);
    } catch (err) {
      console.error(err);
      setStatus("Could not save the work order locally.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-amber-50">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl border border-amber-400/40 bg-black/60 flex items-center justify-center text-amber-300">
          <Clipboard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Work Orders</h1>
          <p className="text-sm text-amber-100/80">
            {adminMode
              ? "Create, assign, and share work orders with your crews."
              : "Review work orders assigned by your admin team."}
          </p>
        </div>
      </div>

      {!adminMode && (
        <GlassCard className="p-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-amber-200/70">Crew view</p>
            <h2 className="text-xl font-semibold text-white">Active work orders</h2>
          </div>
          {savedWorkOrders.length === 0 ? (
            <p className="text-sm text-amber-100/75">
              No work orders have been published yet. Admins and owners create work orders in the Admin Console.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {savedWorkOrders.map((order) => (
                <div key={order.id} className="rounded-xl border border-amber-500/20 bg-black/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-white">{order.jobName}</div>
                    <span className="text-xs text-amber-200">{order.id}</span>
                  </div>
                  <p className="mt-1 text-sm text-amber-100/75">{order.description || "No description provided."}</p>
                  <div className="mt-3 text-xs text-amber-100/65">
                    <div>Location: {order.location || "TBD"}</div>
                    <div>Crew lead: {order.crewLead || "Unassigned"}</div>
                    <div>Created: {new Date(order.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {adminMode && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-200/70">Work order form</p>
              <h2 className="text-xl font-semibold text-white">Details</h2>
            </div>
          </div>

          {!canManageWorkOrders && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
              Work order creation is limited to admins and owners. You can still view saved drafts below on the dashboard.
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col text-sm text-amber-100/90 gap-1">
                Job name (from Time Clock jobs)
                <select
                  value={form.jobId}
                  onChange={handleChange("jobId")}
                  className="rounded-md bg-black/70 border border-amber-500/30 px-3 py-2 text-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  disabled={loadingJobs || !canManageWorkOrders}
                >
                  {jobOptions.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.name}
                    </option>
                  ))}
                </select>
                {loadingJobs && <span className="text-xs text-amber-200/70">Loading jobs…</span>}
              </label>

              <label className="flex flex-col text-sm text-amber-100/90 gap-1">
                Crew lead
                <input
                  type="text"
                  value={form.crewLead}
                  onChange={handleChange("crewLead")}
                  placeholder="Lead name"
                  className="rounded-md bg-black/70 border border-amber-500/30 px-3 py-2 text-amber-50 placeholder:text-amber-200/50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  disabled={!canManageWorkOrders}
                />
              </label>

              <label className="flex flex-col text-sm text-amber-100/90 gap-1">
                Crew members
                <input
                  type="text"
                  value={form.crewMembers}
                  onChange={handleChange("crewMembers")}
                  placeholder="Comma-separated names"
                  className="rounded-md bg-black/70 border border-amber-500/30 px-3 py-2 text-amber-50 placeholder:text-amber-200/50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  disabled={!canManageWorkOrders}
                />
              </label>

              <label className="flex flex-col text-sm text-amber-100/90 gap-1">
                Customer
                <input
                  type="text"
                  value={form.customer}
                  onChange={handleChange("customer")}
                  placeholder="Customer or agency"
                  className="rounded-md bg-black/70 border border-amber-500/30 px-3 py-2 text-amber-50 placeholder:text-amber-200/50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  disabled={!canManageWorkOrders}
                />
              </label>

              <label className="flex flex-col text-sm text-amber-100/90 gap-1">
                Customer contact
                <input
                  type="text"
                  value={form.customerContact}
                  onChange={handleChange("customerContact")}
                  placeholder="Email or phone"
                  className="rounded-md bg-black/70 border border-amber-500/30 px-3 py-2 text-amber-50 placeholder:text-amber-200/50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  disabled={!canManageWorkOrders}
                />
              </label>

              <label className="flex flex-col text-sm text-amber-100/90 gap-1">
                Job location
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.location}
                    onChange={handleChange("location")}
                    placeholder="Address, mile marker, or GPS"
                    className="flex-1 rounded-md bg-black/70 border border-amber-500/30 px-3 py-2 text-amber-50 placeholder:text-amber-200/50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    disabled={!canManageWorkOrders}
                  />
                  <Link
                    to="/navigation"
                    className="shrink-0 px-3 py-2 rounded-md border border-amber-400/40 bg-amber-500/10 text-amber-100 text-xs font-semibold hover:bg-amber-500/20"
                  >
                    Open navigation
                  </Link>
                </div>
              </label>
            </div>

            <label className="flex flex-col text-sm text-amber-100/90 gap-1">
              Job description
              <input
                type="text"
                value={form.description}
                onChange={handleChange("description")}
                placeholder="Short scope of work"
                className="rounded-md bg-black/70 border border-amber-500/30 px-3 py-2 text-amber-50 placeholder:text-amber-200/50 focus:outline-none focus:ring-1 focus:ring-amber-400"
                disabled={!canManageWorkOrders}
              />
            </label>

            <label className="flex flex-col text-sm text-amber-100/90 gap-1">
              Notes
              <Textarea
                value={form.notes}
                onChange={handleChange("notes")}
                placeholder="Add site hazards, staging details, equipment needs, etc."
                className="min-h-[120px] bg-black/70 border border-amber-500/30 text-amber-50 placeholder:text-amber-200/50 focus-visible:ring-amber-400"
                disabled={!canManageWorkOrders}
              />
            </label>

            <div className="flex flex-wrap gap-3 justify-between items-center">
              <div className="text-sm text-amber-100/70 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Map the job to navigation for the crew
              </div>
              <Button
                type="submit"
                disabled={saving || !canManageWorkOrders}
                className="bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-60 gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                {saving ? "Creating..." : "Create work order"}
              </Button>
            </div>

            {status && <p className="text-sm text-amber-100/80">{status}</p>}
          </form>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-300" />
              <h3 className="text-lg font-semibold text-white">Employee Roster</h3>
            </div>
            <p className="text-xs text-amber-100/70">
              1-200 entries supported; displaying current roster sample.
            </p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-amber-500/15 bg-black/50 divide-y divide-amber-500/10">
              {roster.map((person, idx) => (
                <div key={`${person.name}-${idx}`} className="flex items-center justify-between px-3 py-2 text-sm text-amber-50">
                  <span>{person.name}</span>
                  <span className="text-amber-200/80">{person.phone}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
      )}
    </div>
  );
}
