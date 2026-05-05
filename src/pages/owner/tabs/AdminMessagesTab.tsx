import { useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { echoChatApi } from "@/lib/echochat/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EchoChatWidget } from "@/components/echochat";

export default function AdminMessagesTab() {
  const { activeOrgId, user } = useAuth();
  const [subject, setSubject] = useState("All hands announcement");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function sendToEveryone() {
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (!trimmedSubject || !trimmedBody) {
      setStatus("Subject and message are required.");
      return;
    }
    if (!activeOrgId) {
      setStatus("Select an organization before sending an announcement.");
      return;
    }

    setSending(true);
    setStatus(null);
    try {
      const { data, error } = await supabase
        .from("organization_members")
        .select("user_id, email")
        .eq("organization_id", activeOrgId)
        .not("user_id", "is", null)
        .not("email", "is", null)
        .range(0, 999);

      if (error) throw error;
      const participants = Array.from(
        new Set((data ?? []).map((row) => row.user_id).filter(Boolean) as string[])
      );
      if (user?.id && !participants.includes(user.id)) {
        participants.unshift(user.id);
      }

      const conversation = await echoChatApi.createConversation(trimmedSubject, participants);
      if (!conversation) {
        throw new Error("EchoChat could not create the broadcast conversation.");
      }

      const message = await echoChatApi.sendMessage(conversation.id, trimmedBody);
      if (!message) {
        throw new Error("EchoChat could not send the announcement.");
      }

      setBody("");
      setStatus(`Announcement sent to ${participants.length} user${participants.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error("EchoChat broadcast failed", error);
      setStatus(error instanceof Error ? error.message : "Unable to send this announcement.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">EchoChat Broadcast</h2>
          <p className="text-sm text-zinc-400">
            Create an all-user EchoChat conversation and post the announcement immediately.
          </p>
        </div>
        <div className="grid gap-3">
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" />
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Message to every user"
            className="min-h-[140px]"
          />
          <div className="flex items-center gap-3">
            <Button onClick={() => void sendToEveryone()} disabled={sending} className="gap-2">
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : "Send to every user"}
            </Button>
            {status && <p className="text-sm text-amber-100/80">{status}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <EchoChatWidget className="border-0 bg-black/55 shadow-none" />
      </section>
    </div>
  );
}
