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

type OrgMessage = {
  id: string;
  organization_id: string | null;
  sender_id: string;
  sender_email: string | null;
  subject: string | null;
  body: string;
  is_announcement: boolean;
  created_at: string;
};

const MessagingPanel: React.FC = () => {
  const { user, organization } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  const [messages, setMessages] = useState<OrgMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const canSend =
    !!user && !!organization && body.trim().length > 0 && !sending;

  const loadMessages = async () => {
    if (!organization) {
      setMessages([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("org_messages")
      .select(
        "id, organization_id, sender_id, sender_email, subject, body, is_announcement, created_at"
      )
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error loading messages:", error);
      setLoading(false);
      return;
    }
    setMessages((data ?? []) as OrgMessage[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadMessages();
  }, [organization?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend || !user || !organization) return;
    try {
      setSending(true);
      const payload = sanitizePayload({
        organization_id: organization.id,
        sender_id: user.id,
        sender_email: user.email ?? null,
        subject: subject || null,
        body,
        is_announcement: isAnnouncement,
      });
      const { error } = await supabase.from("org_messages").insert(payload);
      if (error) {
        console.error("Error sending message:", error);
        return;
      }
      setSubject("");
      setBody("");
      setIsAnnouncement(false);
      await loadMessages();
    } finally {
      setSending(false);
    }
  };

  const formatTime = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  if (!user) {
    return (
      <Card className="bg-black/40 border border-amber-500/30 text-white p-6">
        <h3 className="text-xl font-semibold text-amber-300 mb-2">
          Crew Messaging
        </h3>
        <p className="text-sm text-gray-300">
          You need to be signed in to see your crew&apos;s message feed.
        </p>
      </Card>
    );
  }

  if (!organization) {
    return (
      <Card className="bg-black/40 border border-amber-500/30 text-white p-6">
        <h3 className="text-xl font-semibold text-amber-300 mb-2">
          Crew Messaging
        </h3>
        <p className="text-sm text-gray-300">
          Join or create an organization to enable internal crew messaging.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compose */}
      <Card className="bg-black/40 border border-amber-500/30 text-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-amber-300">
              Post a Message to Your Crew
            </h3>
            <p className="text-xs sm:text-sm text-gray-300">
              Use this feed for quick updates, yard notes, shift changes, and toolbox talk reminders.
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-amber-500/60 text-amber-200 text-[10px] sm:text-[11px] bg-black/40"
          >
            Posting as {user.email ?? "user"}
          </Badge>
        </div>

        <form onSubmit={handleSend} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-gray-300">Subject (optional)</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Night shift line-up, lane closure update"
                className="bg-black/60 border-gray-700 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isAnnouncement"
                type="checkbox"
                checked={isAnnouncement}
                onChange={(e) => setIsAnnouncement(e.target.checked)}
                className="w-4 h-4"
              />
              <label
                htmlFor="isAnnouncement"
                className="text-[11px] text-gray-300"
              >
                Mark as announcement (highlighted)
              </label>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-300">Message</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="bg-black/60 border-gray-700 text-sm min-h-[80px]"
              placeholder="Keep it clear and professional. This goes to your organization feed."
              required
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!canSend}
              className="bg-amber-500 hover:bg-amber-400 text-black text-sm px-6"
            >
              {sending ? "Sending..." : "Post Message"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Feed */}
      <Card className="bg-black/40 border border-amber-500/30 text-white p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h3 className="text-lg font-semibold text-amber-300">
            Organization Message Feed
          </h3>
          <span className="text-[11px] text-gray-400">
            {loading
              ? "Loading..."
              : `${messages.length} message${messages.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <ScrollArea className="h-[260px] sm:h-[320px] pr-2">
          <div className="space-y-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg border px-3 py-2 space-y-1 ${
                  m.is_announcement
                    ? "border-amber-500/60 bg-amber-500/10"
                    : "border-gray-800 bg-black/60"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-100">
                      {m.subject || "No subject"}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {formatTime(m.created_at)} • {m.sender_email ?? "user"}
                    </p>
                  </div>
                  {m.is_announcement && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/60 text-amber-300 text-[10px] px-2 py-0.5 bg-black/40"
                    >
                      Announcement
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-gray-200 whitespace-pre-line">
                  {m.body}
                </p>
              </div>
            ))}
            {messages.length === 0 && !loading && (
              <p className="text-xs text-gray-400">
                No messages yet. Be the first to post a crew update.
              </p>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default MessagingPanel;
