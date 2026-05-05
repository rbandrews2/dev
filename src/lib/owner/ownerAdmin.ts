import { supabase } from "@/lib/supabase";

async function functionErrorMessage(error: unknown, fallback: string) {
  const maybeContext = (error as { context?: unknown } | null)?.context;
  if (maybeContext instanceof Response) {
    try {
      const body = await maybeContext.clone().json();
      if (typeof body?.error === "string" && body.error.trim()) return body.error;
      if (typeof body?.message === "string" && body.message.trim()) return body.message;
    } catch {
      // Fall through to the SDK message.
    }
  }

  return error instanceof Error && error.message ? error.message : fallback;
}

export async function ownerAdmin<T = any>(
  action: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase.functions.invoke<T>("owner-admin", {
    body: { action, ...(payload ?? {}) },
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
  });

  if (error) {
    throw new Error(await functionErrorMessage(error, "Owner admin request failed"));
  }

  return data as T;
}
