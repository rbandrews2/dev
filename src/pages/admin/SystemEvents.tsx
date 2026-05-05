
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function SystemEventsPage() {
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase
      .from("system_events")
      .select("*")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  }

  async function markAllRead() {
    await supabase.from("system_events").update({ read: true }).eq("read", false);
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">System Events</h1>
        <button onClick={markAllRead} className="px-3 py-1 border rounded">
          Mark all read
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="border border-white/10 rounded p-2">
            <div className="font-medium">{r.title}</div>
            <div className="text-xs opacity-70">{r.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
