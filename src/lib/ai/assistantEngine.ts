// src/lib/ai/assistantEngine.ts
// Assistant client backed by Supabase Edge Functions.

import { supabase } from "@/lib/supabase";

export type AssistantContextInfo = {
  route?: string;
  module?: string;
  userEmail?: string;
  organization?: string;
  organizationId?: string;
  role?: string;
  extraContext?: string;
};

export type AssistantRequest = {
  message: string;
  imageBase64?: string | null;
  context?: AssistantContextInfo;
};

export type AssistantResponse = {
  reply: string;
  rawText?: string;
  error?: string;
};

// Cache sessions per org+module to reduce roundtrips.
const sessionCache = new Map<string, string>();

function buildCacheKey(ctx?: AssistantContextInfo) {
  const org = ctx?.organizationId ?? "no-org";
  const mod = ctx?.module ?? "default";
  return `${org}:${mod}`;
}

function inferMime(imageBase64?: string | null): string {
  if (!imageBase64) return "image/png";
  const match = imageBase64.match(/^data:(.*?);base64,/);
  return match?.[1] || "image/png";
}

export async function sendToAI(req: AssistantRequest): Promise<AssistantResponse> {
  const { message, imageBase64, context } = req;
  const trimmed = (message ?? "").trim();

  if (!trimmed) {
    return { reply: "Please type a question or message before sending." };
  }

  if (!context?.organizationId) {
    return {
      reply: "Join or select an organization to use the assistant.",
      error: "missing_org",
    };
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session?.access_token) {
      return { reply: "Sign in to use the assistant.", error: "not_signed_in" };
    }

    const accessToken = sessionData.session.access_token;
    const sessionId = await ensureSession(context, accessToken);

    if (imageBase64) {
      return await sendVision(sessionId, trimmed, imageBase64, context, accessToken);
    }

    const { data, error } = await supabase.functions.invoke<{ reply?: string }>(
      "assistant-message-send",
      {
        body: {
          assistant_session_id: sessionId,
          message: trimmed,
          page_context: {
            route: context.route,
            module: context.module,
            userEmail: context.userEmail,
            organization: context.organization,
            role: context.role,
            extraContext: context.extraContext,
          },
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (error) {
      console.error("[Assistant] message-send error", error);
      return {
        reply: "I had trouble processing that request. Please try again.",
        error: error.message ?? error.name ?? "invoke_error",
      };
    }

    if (data?.reply) {
      return { reply: data.reply, rawText: data.reply };
    }

    return {
      reply: "I had trouble processing that request. Please try again.",
      error: "empty_reply",
    };
  } catch (err) {
    console.error("[Assistant] sendToAI error", err);
    return {
      reply: "I had trouble processing that request. Please try again.",
      error: err instanceof Error ? err.message : "runtime_error",
    };
  }
}

async function ensureSession(context: AssistantContextInfo, accessToken: string): Promise<string> {
  const key = buildCacheKey(context);
  const cached = sessionCache.get(key);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke<{
    assistant_session_id: string;
  }>("assistant-session-init", {
    body: {
      organization_id: context.organizationId!,
      module: context.module ?? "dashboard",
      route: context.route ?? "/",
      device: "desktop",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      page_context: {
        userEmail: context.userEmail,
        organization: context.organization,
        role: context.role,
        extraContext: context.extraContext,
      },
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) throw error;

  const sessionId = data?.assistant_session_id as string | undefined;
  if (!sessionId) {
    throw new Error("missing_assistant_session_id");
  }

  sessionCache.set(key, sessionId);
  return sessionId;
}

async function sendVision(
  assistant_session_id: string,
  prompt: string,
  imageBase64: string,
  context: AssistantContextInfo,
  accessToken: string,
): Promise<AssistantResponse> {
  const mimeType = inferMime(imageBase64);

  const { data, error } = await supabase.functions.invoke<{ reply?: string }>(
    "assistant-vision-describe",
    {
      body: {
        assistant_session_id,
        imageBase64,
        mimeType,
        prompt,
        page_context: {
          route: context.route,
          module: context.module,
          extraContext: context.extraContext,
        },
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (error) {
    throw error;
  }

  if (data?.reply) return { reply: data.reply, rawText: data.reply };
  return { reply: "I could not describe that image.", error: "empty_reply" };
}
