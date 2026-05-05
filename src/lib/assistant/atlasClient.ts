import { supabase } from "@/lib/supabase";
import { buildAtlasFallbackReply } from "./assistantKnowledge";

export type AtlasChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AtlasSecurityEvent = {
  type: "warning" | "error" | "info";
  message: string;
  timestamp: string;
};

export type AtlasChatResponse = {
  reply: string;
  securityEvents: AtlasSecurityEvent[];
  usage?: unknown;
  model?: string;
};

type ChatPayload = {
  messages: AtlasChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  pageContext?: Record<string, unknown>;
};

function normalizeReply(data: any) {
  const reply =
    typeof data?.reply === "string"
      ? data.reply
      : Array.isArray(data?.content)
      ? data.content
          .map((item: any) =>
            typeof item === "string"
              ? item
              : typeof item?.text === "string"
              ? item.text
              : typeof item?.content === "string"
              ? item.content
              : "",
          )
          .filter(Boolean)
          .join("\n")
      : typeof data?.content?.text === "string"
      ? data.content.text
      : typeof data?.content === "string"
      ? data.content
      : "";

  return reply || "";
}

export async function chatWithAtlas(payload: ChatPayload): Promise<AtlasChatResponse> {
  try {
    const { data, error } = await supabase.functions.invoke<{
      reply?: string;
      content?: unknown;
      securityEvents?: AtlasSecurityEvent[];
      usage?: unknown;
      model?: string;
    }>("assistant-message-send", {
      body: {
        messages: payload.messages,
        message: payload.messages[payload.messages.length - 1]?.content,
        systemPrompt: payload.systemPrompt,
        maxTokens: payload.maxTokens,
        page_context: payload.pageContext,
      },
    });

    if (error) {
      throw new Error(error.message ?? "assistant_message_send_failed");
    }

    const reply = normalizeReply(data);
    return {
      reply:
        reply ||
        buildAtlasFallbackReply(
          payload.messages[payload.messages.length - 1]?.content ?? "",
          payload.pageContext,
        ),
      securityEvents: data?.securityEvents ?? [],
      usage: data?.usage,
      model: data?.model,
    };
  } catch (error) {
    console.warn("[AtlasAssistant] using client fallback", error);
    return {
      reply: buildAtlasFallbackReply(
        payload.messages[payload.messages.length - 1]?.content ?? "",
        payload.pageContext,
      ),
      securityEvents: [],
      model: "client-fallback",
    };
  }
}

export async function logSecurityEvents(events: AtlasSecurityEvent[]) {
  if (!events.length) return;
  try {
    console.warn("[AtlasAssistant] security events", events);
  } catch (err) {
    console.warn("[AtlasAssistant] failed to log security events", err);
  }
}

export async function validateContext(payload: Record<string, unknown>) {
  try {
    return payload;
  } catch (err) {
    console.warn("[AtlasAssistant] context validation failed", err);
    return null;
  }
}
