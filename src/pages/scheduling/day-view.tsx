import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type DayEvent = {
  id: string;
  title: string;
  time: string;
  window: string;
  crew: string;
  location: string;
  status: "scheduled" | "active" | "complete" | "standby";
  notes?: string;
};

type ScheduleAssignmentRow = {
  event_id: string;
  organization_members?: {
    member_name?: string | null;
    email?: string | null;
  } | null;
};

const sampleDays: Record<
  string,
  {
    headline: string;
    summary: string;
    events: DayEvent[];
  }
> = {
  "2025-12-19": {
    headline: "Night Ops + Bridge Demo",
    summary: "Lane closures, inspections, and traffic control teams staged.",
    events: [
      {
        id: "evt-1",
        title: "Bridge Deck Demo",
        time: "06:30",
        window: "06:30 - 09:00",
        crew: "Crew Alpha",
        location: "I-81 SB Mile 45",
        status: "active",
        notes: "Pavement cores and dust suppression.",
      },
      {
        id: "evt-2",
        title: "Lane Closure Setup",
        time: "07:15",
        window: "07:15 - 08:00",
        crew: "Traffic Ops",
        location: "US-22 Eastbound",
        status: "scheduled",
        notes: "Flaggers staged at county line.",
      },
      {
        id: "evt-3",
        title: "Signal Inspection",
        time: "09:30",
        window: "09:30 - 11:30",
        crew: "Crew Bravo",
        location: "Township Route 12",
        status: "scheduled",
        notes: "Thermal camera + sensor checks.",
      },
      {
        id: "evt-4",
        title: "Guardrail Repair",
        time: "12:00",
        window: "12:00 - 14:00",
        crew: "Crew Charlie",
        location: "Depot Bay 6",
        status: "standby",
      },
      {
        id: "evt-5",
        title: "QA Walkthrough",
        time: "15:30",
        window: "15:30 - 16:15",
        crew: "Safety / QA",
        location: "I-81 SB Mile 45",
        status: "complete",
        notes: "Punchlist closed, photos uploaded.",
      },
    ],
  },
  fallback: {
    headline: "Crew Readiness + Safety Checks",
    summary: "Sample data auto-populates when no user data has been entered.",
    events: [
      {
        id: "evt-a",
        title: "Staging & Toolbox Talk",
        time: "06:00",
        window: "06:00 - 06:30",
        crew: "All Crews",
        location: "District Yard",
        status: "active",
        notes: "Heat illness briefing and PPE check.",
      },
      {
        id: "evt-b",
        title: "Lane Closure Setup",
        time: "07:00",
        window: "07:00 - 08:00",
        crew: "Traffic Ops",
        location: "US-22 Eastbound",
        status: "scheduled",
      },
      {
        id: "evt-c",
        title: "Bridge Inspection",
        time: "09:00",
        window: "09:00 - 11:00",
        crew: "Bridge Team",
        location: "I-78 Overpass",
        status: "scheduled",
      },
      {
        id: "evt-d",
        title: "Guardrail Repair",
        time: "13:00",
        window: "13:00 - 15:00",
        crew: "Crew Charlie",
        location: "Depot Bay 6",
        status: "standby",
      },
      {
        id: "evt-e",
        title: "QA Walkthrough",
        time: "16:00",
        window: "16:00 - 17:00",
        crew: "Safety / QA",
        location: "I-78 Overpass",
        status: "complete",
      },
    ],
  },
};

const statusStyles: Record<DayEvent["status"], string> = {
  active: "text-orange-200 bg-orange-500/15 border-orange-300/30",
  scheduled: "text-white bg-white/5 border-white/10",
  complete: "text-emerald-200 bg-emerald-500/10 border-emerald-400/30",
  standby: "text-orange-200 bg-orange-500/10 border-orange-400/25",
};

const calendarOptionClass =
  "inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-black/40 px-3 py-2 text-sm text-orange-100/80 transition-all hover:border-orange-200/80 hover:shadow-[0_0_18px_rgba(255,239,0,0.6)] hover:-translate-y-0.5";

function readableDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function DayViewPage() {
  const { date } = useParams();
  const { activeOrgId } = useAuth();
  const fallbackDate = new Date().toISOString().slice(0, 10);
  const selectedDate = date ?? fallbackDate;

  const fallbackData = useMemo(() => sampleDays[selectedDate] ?? sampleDays["fallback"], [selectedDate]);
  const [headline, setHeadline] = useState(fallbackData.headline);
  const [summary, setSummary] = useState(fallbackData.summary);
  const [events, setEvents] = useState<DayEvent[]>(fallbackData.events);

  useEffect(() => {
    async function load() {
      if (!activeOrgId) {
        setHeadline(fallbackData.headline);
        setSummary(fallbackData.summary);
        setEvents(fallbackData.events);
        return;
      }

      try {
        const start = new Date(`${selectedDate}T00:00:00`);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const { data: scheduleRows, error } = await supabase
          .from("schedule_events")
          .select("id, title, details, event_type, visibility, start_time, end_time, location")
          .eq("organization_id", activeOrgId)
          .gte("start_time", start.toISOString())
          .lt("start_time", end.toISOString())
          .order("start_time", { ascending: true });

        if (error) throw error;

        if (!scheduleRows || scheduleRows.length === 0) {
          setHeadline(fallbackData.headline);
          setSummary(fallbackData.summary);
          setEvents(fallbackData.events);
          return;
        }

        const eventIds = scheduleRows.map((e) => e.id);
        const { data: assignmentRows } = await supabase
          .from("schedule_assignments")
          .select("event_id, organization_members!inner(member_name, email)")
          .in("event_id", eventIds);

        const crewMap = new Map<string, string>();
        ((assignmentRows || []) as ScheduleAssignmentRow[]).forEach((row) => {
          const member = row.organization_members?.member_name || row.organization_members?.email;
          if (!member) return;
          const current = crewMap.get(row.event_id);
          crewMap.set(row.event_id, current ? `${current}, ${member}` : member);
        });

        const mapped: DayEvent[] = scheduleRows.map((ev) => {
          const startTime = ev.start_time ? new Date(ev.start_time) : null;
          const endTime = ev.end_time ? new Date(ev.end_time) : null;
          const window = startTime
            ? `${startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${
                endTime ? ` - ${endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""
              }`
            : "Scheduled";
          return {
            id: ev.id,
            title: ev.title || "Scheduled work",
            time: startTime ? startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
            window,
            crew: crewMap.get(ev.id) || "Unassigned",
            location: ev.location || "TBD",
            status: "scheduled",
            notes: ev.details || undefined,
          };
        });

        setHeadline("Today's Schedule");
        setSummary("Live data from your schedules. Sample data shows only when none exists.");
        setEvents(mapped);
      } catch (err) {
        console.error("Day view load error", err);
        toast.error("Could not load schedules. Showing sample data.");
        setHeadline(fallbackData.headline);
        setSummary(fallbackData.summary);
        setEvents(fallbackData.events);
      }
    }

    load();
  }, [selectedDate, activeOrgId, fallbackData.headline, fallbackData.summary, fallbackData.events]);

  return (
    <div className="space-y-6 text-orange-100 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl border border-orange-400/40 bg-black/60 flex items-center justify-center text-orange-300 shadow-[0_10px_28px_rgba(0,0,0,0.45)]">
          <CalendarDays className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-wide">
            Day View - {readableDate(selectedDate)}
          </h1>
        </div>
      </div>

      <GlassCard className="p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.12em] text-orange-200/70">Headline</p>
            <h2 className="text-xl font-semibold text-white">{headline}</h2>
            <p className="text-sm text-orange-100/75">{summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={calendarOptionClass}>
              <Clock className="w-4 h-4" />
              Day
            </button>
            <button className={calendarOptionClass}>
              <CalendarDays className="w-4 h-4" />
              Week
            </button>
            <button className={calendarOptionClass}>
              <ShieldCheck className="w-4 h-4" />
              Safety Overlay
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-orange-500/25 bg-black/50 p-4">
            <p className="text-xs text-orange-100/70">Live crews</p>
            <p className="text-2xl font-semibold text-white">4</p>
          </div>
          <div className="rounded-xl border border-orange-500/25 bg-black/50 p-4">
            <p className="text-xs text-orange-100/70">Active work windows</p>
            <p className="text-2xl font-semibold text-white">5</p>
          </div>
          <div className="rounded-xl border border-orange-500/25 bg-black/50 p-4">
            <p className="text-xs text-orange-100/70">Safety checks</p>
            <p className="text-2xl font-semibold text-white">QA + PPE logged</p>
          </div>
          <div className="rounded-xl border border-orange-500/25 bg-black/50 p-4">
            <p className="text-xs text-orange-100/70">Exports</p>
            <p className="text-2xl font-semibold text-white">CSV / Sheets / PDF</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-200" />
                <h3 className="text-lg font-semibold text-white">Timeline</h3>
              </div>
              <span className="text-xs px-3 py-1 rounded-full border border-orange-500/30 text-orange-200 bg-orange-500/10">
                Live data
              </span>
            </div>

            <div className="relative border-l border-orange-400/20 pl-4 space-y-4">
              {events.map((event) => (
                <div key={event.id} className="relative">
                  <span className="absolute -left-5 top-2 h-2.5 w-2.5 rounded-full bg-orange-400 shadow-[0_0_16px_rgba(255,239,0,0.6)]" />
                  <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-orange-200 font-semibold">
                          {event.window}
                        </span>
                        <span
                          className={`text-[11px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border ${statusStyles[event.status]}`}
                        >
                          {event.status}
                        </span>
                      </div>
                      <h4 className="text-white font-semibold text-base">{event.title}</h4>
                      <p className="text-sm text-orange-100/80 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </p>
                      <p className="text-sm text-orange-100/80 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {event.crew}
                      </p>
                      {event.notes && (
                        <p className="text-xs text-orange-100/70">Note: {event.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-200" />
              <h3 className="text-lg font-semibold text-white">Resourcing snapshot</h3>
            </div>
            <ul className="space-y-2 text-sm text-orange-100/80">
              <li>ƒ?› Crew Alpha: Active on site ƒ?" bridge deck demo, 7 personnel.</li>
              <li>ƒ?› Traffic Ops: Flaggers staged, two trucks, amber beacons online.</li>
              <li>ƒ?› Safety / QA: QA walkthrough at 15:30 with photo upload required.</li>
              <li>ƒ?› Signals: Sensors calibrated; backup generator on standby.</li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
