"use client";

import { useMemo } from "react";

export function ZoomEmbed({
  meetingId,
  passcode,
  displayName,
}: {
  meetingId: string;
  passcode?: string;
  displayName?: string;
}) {
  const src = useMemo(() => {
    const name = encodeURIComponent(displayName || "Work Zone OS User");
    const pwd = passcode?.trim() ? `&pwd=${encodeURIComponent(passcode.trim())}` : "";
    return `https://zoom.us/wc/join/${encodeURIComponent(meetingId)}?uname=${name}${pwd}`;
  }, [meetingId, passcode, displayName]);

  return (
    <div className="w-full">
      <div className="text-xs opacity-70 mb-2">
        Meeting: <span className="font-medium">{meetingId}</span>
      </div>

      {/* Smaller, mobile-safe embed (no 100vh) */}
      <div className="relative w-full h-[60vh] md:h-[70vh] rounded-xl overflow-hidden border border-white/10 bg-black/20">
        <iframe
          src={src}
          className="absolute inset-0 w-full h-full border-0"
          allow="camera; microphone; fullscreen; speaker; display-capture"
          allowFullScreen
          referrerPolicy="no-referrer"
          title="Zoom Video Conference"
        />
      </div>

      <div className="text-[11px] opacity-60 mt-2">
        If the meeting does not load, confirm the meeting ID and passcode and re-join.
      </div>
    </div>
  );
}
