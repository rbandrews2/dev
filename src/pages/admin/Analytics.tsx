
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AdminAnalyticsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("analytics_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Analytics</h1>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="border border-white/10 rounded p-2">
              <div className="text-sm">{r.event_name}</div>
              <div className="text-xs opacity-70">{r.path}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
