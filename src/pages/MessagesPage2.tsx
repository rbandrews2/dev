import React, { useState, useRef, useEffect } from "react";
import { useOrgMessages } from "@/hooks/useOrgMessages";
import { useAuth } from "@/contexts/AuthContext";
import AuthLandingCard from "@/components/auth/AuthLandingCard";

type AuthSnapshot = {
  user: { email?: string | null } | null;
};

const MessagesPage: React.FC = () => {
  const { user } = useAuth() as AuthSnapshot;
  const {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    unreadCount,
    markAllRead,
  } = useOrgMessages();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    markAllRead();
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, user, markAllRead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage({
      subject,
      body,
      isAnnouncement,
    });
    setSubject("");
    setBody("");
    setIsAnnouncement(false);
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col gap-6 text-amber-50 pb-10">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300/80">Crew Messaging</p>
          <h1 className="text-3xl font-semibold text-white">Stay synced with your crew.</h1>
          <p className="text-amber-100/75 text-sm max-w-2xl">
            You need to be signed in to see your crew&apos;s message feed.
          </p>
        </header>

        <div className="w-full max-w-5xl space-y-4">
          <div className="rounded-2xl border border-amber-500/30 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl border border-amber-400/40 bg-amber-500/10 flex items-center justify-center text-amber-200">
                💬
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Crew Messaging</h2>
                <p className="text-sm text-amber-100/75">
                  Sign in to view and post messages to your organization feed.
                </p>
              </div>
            </div>
          </div>

          <div className="w-full">
            <AuthLandingCard
              title="Sign in or create an account"
              subtitle="Access your crew messages, forms, and navigation in one login."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-amber-50">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.18em] text-amber-300/80">
          Crew Messaging {unreadCount > 0 ? `• ${unreadCount} new` : ""}
        </p>
        <h1 className="text-3xl font-semibold text-white">Post a Message to Your Crew</h1>
        <p className="text-sm text-amber-100/75">
          Use this feed for quick updates, yard notes, shift changes, and toolbox talk reminders.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-black/70 via-zinc-950 to-black p-5 space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.45)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-amber-100/75">
            Posting as <span className="font-semibold text-amber-200">{user?.email}</span>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-amber-100/80">
            <input
              type="checkbox"
              checked={isAnnouncement}
              onChange={(e) => setIsAnnouncement(e.target.checked)}
              className="h-4 w-4 rounded border border-amber-500/40 bg-black text-amber-400 focus:ring-amber-400"
            />
            Mark as announcement (highlighted)
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-amber-100/80">Subject (optional)</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-amber-500/30 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-amber-100/50 focus:border-amber-400 focus:outline-none"
            placeholder="e.g. Night shift line-up, lane closure update"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-amber-100/80">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-amber-500/30 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-amber-100/50 focus:border-amber-400 focus:outline-none"
            placeholder="Keep it clear and professional. This goes to your organization feed."
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black shadow-[0_10px_30px_rgba(255,193,7,0.25)] disabled:opacity-50"
          >
            {sending ? "Posting…" : "Post Message"}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-black/70 via-zinc-950 to-black p-5 shadow-[0_0_30px_rgba(0,0,0,0.45)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Organization Message Feed</h2>
            <p className="text-sm text-amber-100/75">Keep it clear and professional.</p>
          </div>
          <span className="text-xs text-amber-100/70">
            {messages.length} {messages.length === 1 ? "message" : "messages"}
          </span>
        </div>

        <div className="space-y-3">
          {loading && <p className="text-sm text-amber-100/70">Loading messages…</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!loading && !messages.length && !error && (
            <p className="text-sm text-amber-100/70">No messages yet.</p>
          )}

          {messages.map((msg) => {
            const announcement = Boolean(msg.is_announcement);
            const subjectText = (msg.subject || "").trim() || "No subject";
            const timestamp = new Date(msg.created_at).toLocaleString();
            return (
              <div
                key={msg.id}
                className="rounded-xl border border-amber-500/30 bg-black/60 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-white">{subjectText}</p>
                    <p className="text-[11px] text-amber-100/70">
                      {timestamp} • {msg.sender_email || msg.sender_id || "Crew member"}
                    </p>
                  </div>
                  {announcement && (
                    <span className="inline-flex items-center rounded-full border border-amber-500/60 bg-amber-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-100">
                      Announcement
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-amber-100/80 whitespace-pre-wrap">{msg.body}</p>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </section>
    </div>
  );
};

export default MessagesPage;
