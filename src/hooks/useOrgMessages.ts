
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sanitizePayload } from "@/lib/security";

export type Message = {
  id: string;
  org_id: string;
  sender_id: string;
  sender_email?: string;
  subject?: string | null;
  is_announcement?: boolean | null;
  body: string;
  created_at: string;
};

type AuthSnapshot = {
  user: { id?: string; email?: string } | null;
  profile?: { org_id?: string | null } | null;
  activeOrgId?: string | null;
};

export function useOrgMessages() {
  const queryClient = useQueryClient();
  const { user, profile, activeOrgId } = useAuth() as AuthSnapshot;

  // Prefer actively selected org; fall back to legacy profile org id.
  const orgId = (activeOrgId || profile?.org_id) as string | undefined;
  const userId = user?.id as string | undefined;
  const senderEmail = user?.email as string | undefined;

  const orgKey = orgId ?? "none";
  const lastSeenKey = `wzos_last_seen_${orgKey}`;
  const lastSeen = Number(localStorage.getItem(lastSeenKey) || 0);

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["messages", orgKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true });

      if (error) throw new Error("Unable to load messages.");
      return data ?? [];
    },
    enabled: !!orgId,
    refetchInterval: 5000,
  });

  let unreadCount = 0;
  if (data?.length) {
    for (const msg of data) {
      const created = new Date(msg.created_at).getTime();
      if (created > lastSeen && msg.sender_id !== userId) {
          unreadCount++;
      }
    }

    if (unreadCount > 0) {
      const latest = data[data.length - 1];
      if (latest.sender_id !== userId) {
        toast("New crew message", {
          description:
            latest.body.length > 80
              ? latest.body.slice(0, 77) + "…"
              : latest.body,
        });
      }
    }
  }

  const { mutateAsync: sendMutation, isPending: sending } = useMutation({
    mutationFn: async (input: { subject?: string | null; body: string; isAnnouncement: boolean }) => {
      const payload = sanitizePayload({
        org_id: orgId,
        sender_id: userId,
        sender_email: senderEmail ?? null,
        body: input.body,
        subject: input.subject ?? null,
        is_announcement: input.isAnnouncement,
      });
      const { error } = await supabase.from("messages").insert(payload);
      if (error) throw new Error("Unable to send message.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", orgKey] });
    },
  });

  const sendMessage = async ({
    subject,
    body,
    isAnnouncement,
  }: {
    subject?: string;
    body: string;
    isAnnouncement: boolean;
  }) => {
    const trimmed = (body ?? "").trim();
    if (!trimmed || !orgId || !userId) {
      toast.error("Select an organization before posting a message.");
      return;
    }
    await sendMutation({
      body: trimmed,
      subject: subject?.trim() || null,
      isAnnouncement,
    });
  };

  const markAllRead = () => {
    localStorage.setItem(lastSeenKey, String(Date.now()));
  };

  return {
    messages: data ?? [],
    loading: isLoading,
    sending,
    error: error ? error.message : null,
    sendMessage,
    unreadCount,
    markAllRead,
  };
}
