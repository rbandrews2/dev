type CreateCheckoutPayload = {
  email?: string;
  company?: string;
  product_sku?: string;
};

type CreateCheckoutResponse = {
  ok: boolean;
  checkout_url: string;
  session_id: string;
};

export type PurchaseStatusResponse = {
  ok: boolean;
  ready: boolean;
  status: string;
  activation_code?: string;
  customer_email?: string | null;
  product_sku?: string;
  email_sent?: boolean;
  download_url?: string;
  activate_url?: string;
  support_url?: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEYS;

async function callPublicFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.message === "string" ? data.message :
      typeof data?.error === "string" ? data.error :
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function createCheckoutSession(payload: CreateCheckoutPayload) {
  return callPublicFunction<CreateCheckoutResponse>("create-checkout-session", payload);
}

export function getPurchaseStatus(sessionId: string, deliveryToken: string) {
  return callPublicFunction<PurchaseStatusResponse>("purchase-status", {
    session_id: sessionId,
    delivery_token: deliveryToken,
  });
}
