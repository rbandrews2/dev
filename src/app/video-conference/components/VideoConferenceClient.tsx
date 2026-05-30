"use client";

import { useMemo, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { ZoomEmbed } from "./ZoomEmbed";
import { Video, ExternalLink } from "lucide-react";

const envMeetingId =
  (import.meta.env.VITE_VIDEO_CONFERENCE_MEETING_ID as string | undefined)?.trim() ||
  (import.meta.env.NEXT_PUBLIC_VIDEO_CONFERENCE_MEETING_ID as string | undefined)?.trim() ||
  "";

const envPasscode =
  (import.meta.env.VITE_VIDEO_CONFERENCE_PASSCODE as string | undefined)?.trim() ||
  (import.meta.env.NEXT_PUBLIC_VIDEO_CONFERENCE_PASSCODE as string | undefined)?.trim() ||
  "";

export default function VideoConferenceClient() {
  const enabled =
    (import.meta.env.VITE_VIDEO_CONFERENCE_ENABLED as string | undefined ??
      import.meta.env.NEXT_PUBLIC_VIDEO_CONFERENCE_ENABLED ??
      "true")
      .toString()
      .toLowerCase() !== "false";

  const [meetingId, setMeetingId] = useState(envMeetingId);
  const [passcode, setPasscode] = useState(envPasscode);
  const [displayName, setDisplayName] = useState("Work Zone OS User");
  const [forceStart, setForceStart] = useState(false);

  const joinUrl = useMemo(() => {
    if (!meetingId) return "";
    const pwd = passcode ? `?pwd=${encodeURIComponent(passcode)}` : "";
    return `https://zoom.us/j/${encodeURIComponent(meetingId)}${pwd}`;
  }, [meetingId, passcode]);

  const handleStartVideo = () => {
    if (!meetingId) {
      alert("Enter a Zoom meeting ID first.");
      return;
    }
    setForceStart(true);
    if (joinUrl) {
      window.open(joinUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-6 text-orange-50">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl border border-orange-400/40 bg-black/60 flex items-center justify-center text-orange-300">
          <Video className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Video Conference</h1>
          <p className="text-sm text-orange-100/80">
            Enter a Zoom meeting ID (and passcode, if required).
          </p>
        </div>
      </div>

      <GlassCard className="p-5 space-y-5">
        {!enabled && (
          <div className="rounded-lg border border-orange-500/30 bg-black/50 px-3 py-2 text-sm text-orange-100/80">
            Video conferencing is locked by config, but you can still preview a meeting below.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col text-sm text-orange-100/90">
            Meeting ID
            <input
              type="text"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              placeholder="e.g., 123 4567 8901"
              className="mt-1 rounded-md bg-black/70 border border-orange-500/30 px-3 py-2 text-orange-50 placeholder:text-orange-200/50 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </label>

          <label className="flex flex-col text-sm text-orange-100/90">
            Passcode (optional)
            <input
              type="text"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Passcode if required"
              className="mt-1 rounded-md bg-black/70 border border-orange-500/30 px-3 py-2 text-orange-50 placeholder:text-orange-200/50 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </label>

          <label className="flex flex-col text-sm text-orange-100/90">
            Display name
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you'll appear in Zoom"
              className="mt-1 rounded-md bg-black/70 border border-orange-500/30 px-3 py-2 text-orange-50 placeholder:text-orange-200/50 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleStartVideo}
            className="px-4 py-2 rounded-md bg-orange-500 text-black font-semibold hover:bg-orange-400 transition"
          >
            Start Video
          </button>
        </div>

        {meetingId ? (
          <ZoomEmbed meetingId={meetingId} passcode={passcode} displayName={displayName} />
        ) : null}

        {joinUrl && (
          <a
            href={joinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs text-orange-200 underline hover:text-orange-100"
          >
            Open in Zoom client <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </GlassCard>
    </div>
  );
}
