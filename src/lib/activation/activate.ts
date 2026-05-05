import { getInstallationId } from "./installation";

export type ActivationResponse = {
  ok?: boolean;
  activated?: boolean;
  locked?: boolean;
  attempts_left?: number;
  message?: string;
};

export async function activateApp(code: string): Promise<ActivationResponse> {
  const installation_id = getInstallationId();

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEYS,
      },
      body: JSON.stringify({
        installation_id,
        activation_code: code,
      }),
    }
  );

  const data = await res.json();

  return {
    status: res.status,
    ...data,
  } as ActivationResponse;
}
