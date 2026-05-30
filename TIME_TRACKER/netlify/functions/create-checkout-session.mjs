const stripeApi = async (path, body, secretKey) => {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Stripe request failed.');
  }

  return data;
};

const env = (key) => Netlify.env.get(key);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const getSupabaseUser = async (supabaseUrl, anonKey, token) => {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  return response.json();
};

const supabaseRequest = async (path, options = {}) => {
  const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');

  const response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message ?? 'Supabase request failed.');
  }
  return data;
};

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  const stripeSecretKey = env('STRIPE_SECRET_KEY');
  const setupPriceId = env('STRIPE_SETUP_PRICE_ID');
  const monthlyPriceId = env('STRIPE_MONTHLY_PRICE_ID');
  const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const supabaseAnonKey = env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY');
  const siteUrl = env('SITE_URL') || 'https://clock.superiorllc.org';
  const productId = env('STRIPE_PRODUCT_ID') || 'prod_USsnAqnFjc2KIa';

  if (!stripeSecretKey || !setupPriceId || !monthlyPriceId || !supabaseUrl || !supabaseAnonKey) {
    return json({ error: 'Billing is not fully configured.' }, 500);
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return json({ error: 'Missing Supabase session.' }, 401);
  }

  const user = await getSupabaseUser(supabaseUrl, supabaseAnonKey, token);
  if (!user?.id) {
    return json({ error: 'Invalid Supabase session.' }, 401);
  }

  const { companyId } = await req.json();
  if (!companyId) {
    return json({ error: 'Missing company ID.' }, 400);
  }

  const membership = await supabaseRequest(
    `/memberships_2?select=role&company_id=eq.${encodeURIComponent(companyId)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`
  );

  if (!membership?.[0] || !['owner', 'admin'].includes(membership[0].role)) {
    return json({ error: 'Only a company admin can start billing.' }, 403);
  }

  await supabaseRequest('/company_billing_2?on_conflict=company_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      company_id: companyId,
      stripe_product_id: productId,
      status: 'pending',
    }),
  });

  const session = await stripeApi(
    '/checkout/sessions',
    {
      mode: 'subscription',
      success_url: `${siteUrl}/?checkout=success`,
      cancel_url: `${siteUrl}/?checkout=cancelled`,
      client_reference_id: companyId,
      customer_email: user.email ?? '',
      'line_items[0][price]': monthlyPriceId,
      'line_items[0][quantity]': '1',
      'line_items[1][price]': setupPriceId,
      'line_items[1][quantity]': '1',
      'metadata[company_id]': companyId,
      'metadata[user_id]': user.id,
      'metadata[product_id]': productId,
      'subscription_data[metadata][company_id]': companyId,
      'subscription_data[metadata][product_id]': productId,
    },
    stripeSecretKey
  );

  return json({ url: session.url });
};

export const config = {
  path: '/api/create-checkout-session',
  method: ['POST'],
};
