import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sanitizePayload } from "@/lib/security";

type ZoomMeeting = {
  id: string;
  organization_id: string;
  title: string;
  url: string;
  description: string | null;
  is_recurring: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
};

const ZoomMeetingCenter: React.FC = () => {
  const { user, organization, isAdmin } = useAuth();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isRecurring, setIsRecurring] = useState(true);

  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave =
    !!isAdmin &&
    !!organization &&
    title.trim().length > 0 &&
    url.trim().length > 0 &&
    !saving;

  const loadMeetings = async () => {
    if (!organization) {
      setMeetings([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("zoom_meetings")
      .select(
        "id, organization_id, title, url, description, is_recurring, is_active, created_by, created_at"
      )
      .eq("organization_id", organization.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error loading Zoom meetings:", error);
      setLoading(false);
      return;
    }
    setMeetings((data ?? []) as ZoomMeeting[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadMeetings();
  }, [organization?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !organization) return;
    try {
      setSaving(true);
      const payload = {
        organization_id: organization.id,
        title,
        url,
        description: description || null,
        is_recurring: isRecurring,
        is_active: true,
        created_by: user?.id ?? null,
      };
      const securePayload = sanitizePayload(payload);
      const { error } = await supabase.from("zoom_meetings").insert(securePayload);
      if (error) {
        console.error("Error saving Zoom meeting:", error);
        return;
      }
      setTitle("");
      setUrl("");
      setDescription("");
      setIsRecurring(true);
      await loadMeetings();
    } finally {
      setSaving(false);
    }
  };

  const formatCreated = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  if (!organization) {
    return (
      <Card className="bg-black/40 border border-amber-500/30 text-white p-6">
        <h3 className="text-xl font-semibold text-amber-300 mb-2">
          Zoom Meeting Center
        </h3>
        <p className="text-sm text-gray-300">
          Join or create an organization to configure Zoom meeting links for toolbox talks and briefings.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin config */}
      {isAdmin && (
        <Card className="bg-black/40 border border-amber-500/30 text-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xl font-semibold text-amber-300">
                Configure Zoom Meetings
              </h3>
              <p className="text-xs sm:text-sm text-gray-300">
                Save your recurring Zoom links so your crews always know where to join toolbox talks and safety briefings.
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-amber-500/60 text-amber-200 text-[10px] sm:text-[11px] bg-black/40"
            >
              Admin configuration
            </Badge>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-300">Meeting title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monday Toolbox Talk, Weekly Supervisor Briefing"
                  className="bg-black/60 border-gray-700 text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-300">Zoom meeting URL</label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className="bg-black/60 border-gray-700 text-sm"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-300">Description (optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-black/60 border-gray-700 text-sm min-h-[60px]"
                placeholder="Short note about who should join and what to expect."
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  id="isRecurring"
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isRecurring" className="text-[11px] text-gray-300">
                  This is a recurring / standing meeting
                </label>
              </div>
              <Button
                type="submit"
                disabled={!canSave}
                className="bg-amber-500 hover:bg-amber-400 text-black text-sm px-6"
              >
                {saving ? "Saving..." : "Save Meeting Link"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* List of meetings with embedded client view */}
      <Card className="bg-black/40 border border-amber-500/30 text-white p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-amber-300">
              Zoom Meeting Links
            </h3>
            <p className="text-xs sm:text-sm text-gray-300">
              Active Zoom links configured for {organization.name}. Crew can join via the embedded view or open in the Zoom client.
            </p>
          </div>
          <span className="text-[11px] text-gray-400">
            {loading
              ? "Loading..."
              : `${meetings.length} meeting${meetings.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <ScrollArea className="h-[260px] sm:h-[320px] pr-2">
          <div className="space-y-3">
            {meetings.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-gray-800 bg-black/60 px-3 py-3 space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-100">{m.title}</p>
                    <p className="text-[11px] text-gray-400">
                      {m.is_recurring ? "Recurring" : "One-time"} • Created{" "}
                      {formatCreated(m.created_at)}
                    </p>
                    {m.description && (
                      <p className="text-[11px] text-gray-300 mt-1 line-clamp-2">
                        {m.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      type="button"
                      className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs px-4 py-1"
                      onClick={() =>
                        window.open(m.url, "_blank", "noopener,noreferrer")
                      }
                    >
                      Open in Zoom
                    </Button>
                    {m.is_recurring && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/60 text-emerald-300 text-[10px] px-2 py-0.5 bg-black/40"
                      >
                        Recurring
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Embedded client attempt */}
                <div className="mt-2 rounded-lg border border-amber-500/30 bg-black/70 overflow-hidden">
                  <div className="px-3 py-2 border-b border-amber-500/20 flex items-center justify-between">
                    <p className="text-[11px] text-amber-200">
                      Embedded meeting view
                    </p>
                    <p className="text-[10px] text-gray-500">
                      If Zoom blocks embedding, use &quot;Open in Zoom&quot; instead.
                    </p>
                  </div>
                  <div className="aspect-video w-full">
                    <iframe
                      src={m.url}
                      className="w-full h-full"
                      title={m.title}
                      allow="camera; microphone; fullscreen; display-capture"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            ))}
            {meetings.length === 0 && !loading && (
              <p className="text-xs text-gray-400">
                No Zoom meetings configured yet. Admins can add links above.
              </p>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default ZoomMeetingCenter;
