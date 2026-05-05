import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import FeatureTile from "@/components/FeatureTile";
import { CalendarClock, ClipboardList } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";

export default function SchedulingIndex() {
  const [dates, setDates] = useState<string[]>([]);
  const defaultDate = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    supabase
      .from("schedules")
      .select("date")
      .order("date", { ascending: true })
      .then(({ data }) => {
        const unique = [...new Set((data ?? []).map((d) => d.date))];
        setDates(unique);
      });
  }, []);

  const tiles = [
    {
      title: "Daily Views",
      description: "Jump into specific dates pulled from Supabase.",
      icon: <ClipboardList className="w-5 h-5" />,
      to: `/scheduling/day/${dates[0] || defaultDate}`,
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-yellow-100">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl border border-yellow-400/40 bg-black/60 flex items-center justify-center text-yellow-300 shadow-[0_10px_28px_rgba(0,0,0,0.45)]">
          <CalendarClock className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-wide">
            Scheduling
          </h1>
          <p className="text-sm text-yellow-100/75">
            Consistent glass tiles + amber accents for the scheduling hub.
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <FeatureTile key={tile.title} {...tile} />
        ))}
      </div>

      <GlassCard className="p-4 space-y-3">
        <div className="text-sm uppercase tracking-[0.12em] text-yellow-200/80">
          Upcoming dates
        </div>
        {dates.length === 0 ? (
          <div className="text-yellow-100/70 text-sm">
            No dates found yet. Add schedules in the editor to populate this list.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dates.map((d) => (
              <Link
                key={d}
                to={`/scheduling/day/${d}`}
                className="block rounded-xl border border-yellow-400/25 bg-black/40 px-4 py-3 hover:border-yellow-300/50 transition-colors"
              >
                <div className="font-semibold text-yellow-100">{d}</div>
                <div className="text-xs text-yellow-100/70">Tap for daily view</div>
              </Link>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
