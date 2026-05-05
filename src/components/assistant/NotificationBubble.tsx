import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export default function NotificationBubble() {
  const { role } = useOrg(); // role === "org_creator" = admin
  const [count, setCount] = useState<number>(0);

  async function loadUnread() {
    const { data, error } = await supabase
      .from("system_events")
      .select("id")
      .eq("read", false);

    if (!error && data) setCount(data.length);
  }

  useEffect(() => {
    if (role !== "org_creator") return; // Only admins
    loadUnread();

    // Live updates via Realtime
    const channel = supabase
      .channel("system_events_ch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_events" },
        loadUnread
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role]);

  if (role !== "org_creator") return null; // Not visible to employees

  if (count === 0) return null; // Only show bubble when alerts exist

  return (
    <div
      className="
        absolute bottom-20 right-6 
        bg-red-600 text-white font-bold 
        w-7 h-7 rounded-full 
        flex items-center justify-center 
        shadow-lg border border-black/30
        animate-pulse
        z-50
      "
    >
      {count}
    </div>
  );
}
