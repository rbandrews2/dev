import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const storePath = path.resolve(process.env.AUTHORIZATION_STORE_PATH || "./data/authorizations.json");
const subscriptionStorePath = path.resolve(
  process.env.SUBSCRIPTION_STORE_PATH || "./data/subscriptions.json"
);
const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL?.trim();
let databaseConfigError = null;

function databaseConfigurationError(message) {
  const error = new Error(message);
  error.status = 503;
  return error;
}

function validateDatabaseUrl(value) {
  if (!value) return null;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw databaseConfigurationError(
      "Database is misconfigured. DATABASE_URL must be a valid PostgreSQL connection string."
    );
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw databaseConfigurationError(
      "Database is misconfigured. DATABASE_URL must start with postgres:// or postgresql://, not an HTTPS project URL."
    );
  }

  if (parsed.hostname === "db.https") {
    throw databaseConfigurationError(
      "Database is misconfigured. DATABASE_URL resolved to host db.https. Use the managed Postgres connection string, not a dashboard or project URL."
    );
  }

  return value;
}

function configuredDatabaseUrl() {
  try {
    return validateDatabaseUrl(databaseUrl);
  } catch (error) {
    databaseConfigError = error;
    return null;
  }
}

function assertDatabaseConfigured() {
  if (databaseConfigError) throw databaseConfigError;
}

function friendlyDatabaseError(error) {
  if (error?.code === "ENOTFOUND" || error?.message?.includes("getaddrinfo ENOTFOUND")) {
    return databaseConfigurationError(
      "Database host could not be resolved. Check DATABASE_URL in Render and use the Postgres connection string from your database provider."
    );
  }

  if (error?.code === "ENETUNREACH" || error?.message?.includes("connect ENETUNREACH")) {
    return databaseConfigurationError(
      "Database network is unreachable. If this database is hosted on Supabase, use the IPv4-compatible Supavisor pooler connection string or enable Supabase IPv4, then update DATABASE_URL in Render."
    );
  }

  if (
    error?.code === "ETIMEDOUT" ||
    error?.code === "ECONNREFUSED" ||
    error?.message?.includes("Connection terminated due to connection timeout")
  ) {
    return databaseConfigurationError(
      "Database connection failed. Check DATABASE_URL, SSL settings, and database network access in Render."
    );
  }

  if (error?.code === "28P01" || error?.message?.includes("password authentication failed")) {
    return databaseConfigurationError(
      "Database credentials were rejected. Check the username and password in DATABASE_URL."
    );
  }

  if (error?.code === "3D000") {
    return databaseConfigurationError(
      "Database name was not found. Check the database path in DATABASE_URL."
    );
  }

  if (error?.code === "42P01") {
    return databaseConfigurationError(
      "Database schema is missing. Run server/schema.sql against the production database."
    );
  }

  return error;
}

const validDatabaseUrl = configuredDatabaseUrl();

const pool = validDatabaseUrl
  ? new Pool({
      connectionString: validDatabaseUrl,
      connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS || 10000),
      ssl:
        process.env.DATABASE_SSL === "false"
          ? false
          : {
              rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false"
            }
    })
  : null;

function toDbRecord(record) {
  return {
    id: record.id,
    customer_name: record.customerName,
    customer_email: record.customerEmail,
    customer_phone: record.customerPhone || null,
    amount_cents: record.amountCents,
    service_fee_cents: record.serviceFeeCents,
    total_cents: record.totalCents,
    currency: record.business.currency,
    withdrawal_date: record.withdrawalDate,
    description: record.description,
    signature_accepted: record.signatureAccepted,
    authorization_version: record.authorizationVersion,
    business_snapshot: record.business,
    ip_address: record.ipAddress,
    user_agent: record.userAgent,
    status: record.status,
    created_at: record.createdAt
  };
}

function fromDbRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone || "",
    amountCents: row.amount_cents,
    serviceFeeCents: row.service_fee_cents,
    totalCents: row.total_cents,
    withdrawalDate: row.withdrawal_date instanceof Date
      ? row.withdrawal_date.toISOString().slice(0, 10)
      : row.withdrawal_date,
    description: row.description,
    signatureAccepted: row.signature_accepted,
    authorizationVersion: row.authorization_version,
    business: row.business_snapshot,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    paymentIntentId: row.payment_intent_id,
    amountReceived: row.amount_received_cents,
    paidAt: row.paid_at instanceof Date ? row.paid_at.toISOString() : row.paid_at
  };
}

function fromCustomerProfileRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerEmail: row.customer_email,
    customerName: row.customer_name || "",
    customerPhone: row.customer_phone || "",
    stripeCustomerId: row.stripe_customer_id,
    defaultPaymentMethodId: row.default_payment_method_id || "",
    sourcePaymentIntentId: row.source_payment_intent_id || "",
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

function fromSubscriptionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerProfileId: row.customer_profile_id,
    customerEmail: row.customer_email,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    defaultPaymentMethodId: row.default_payment_method_id,
    sourcePaymentIntentId: row.source_payment_intent_id || "",
    priceId: row.price_id || "",
    amountCents: row.amount_cents,
    currency: row.currency,
    interval: row.interval,
    intervalCount: row.interval_count,
    description: row.description,
    status: row.status,
    currentPeriodStart:
      row.current_period_start instanceof Date
        ? row.current_period_start.toISOString()
        : row.current_period_start,
    currentPeriodEnd:
      row.current_period_end instanceof Date
        ? row.current_period_end.toISOString()
        : row.current_period_end,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

async function readStore() {
  try {
    return JSON.parse(await fs.readFile(storePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeStore(records) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(records, null, 2));
}

async function readSubscriptionStore() {
  try {
    return JSON.parse(await fs.readFile(subscriptionStorePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return { customerProfiles: [], subscriptions: [] };
    throw error;
  }
}

async function writeSubscriptionStore(records) {
  await fs.mkdir(path.dirname(subscriptionStorePath), { recursive: true });
  await fs.writeFile(subscriptionStorePath, JSON.stringify(records, null, 2));
}

export async function appendAuthorization(record) {
  assertDatabaseConfigured();

  if (pool) {
    const dbRecord = toDbRecord(record);
    try {
      const result = await pool.query(
        `insert into checkout_authorizations (
          id,
          customer_name,
          customer_email,
          customer_phone,
          amount_cents,
          service_fee_cents,
          total_cents,
          currency,
          withdrawal_date,
          description,
          signature_accepted,
          authorization_version,
          business_snapshot,
          ip_address,
          user_agent,
          status,
          created_at
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        returning *`,
        [
          dbRecord.id,
          dbRecord.customer_name,
          dbRecord.customer_email,
          dbRecord.customer_phone,
          dbRecord.amount_cents,
          dbRecord.service_fee_cents,
          dbRecord.total_cents,
          dbRecord.currency,
          dbRecord.withdrawal_date,
          dbRecord.description,
          dbRecord.signature_accepted,
          dbRecord.authorization_version,
          dbRecord.business_snapshot,
          dbRecord.ip_address,
          dbRecord.user_agent,
          dbRecord.status,
          dbRecord.created_at
        ]
      );
      return fromDbRecord(result.rows[0]);
    } catch (error) {
      throw friendlyDatabaseError(error);
    }
  }

  const records = await readStore();
  records.push(record);
  await writeStore(records);
  return record;
}

appendAuthorization.get = async (id) => {
  assertDatabaseConfigured();

  if (pool) {
    try {
      const result = await pool.query("select * from checkout_authorizations where id = $1", [id]);
      return fromDbRecord(result.rows[0]);
    } catch (error) {
      throw friendlyDatabaseError(error);
    }
  }

  const records = await readStore();
  return records.find((record) => record.id === id);
};

export async function markAuthorizationPaid(id, patch) {
  if (!id) return;
  assertDatabaseConfigured();

  if (pool) {
    try {
      await pool.query(
        `update checkout_authorizations
          set status = 'paid',
              payment_intent_id = $2,
              amount_received_cents = $3,
              paid_at = $4,
              updated_at = now()
          where id = $1`,
        [id, patch.paymentIntentId, patch.amountReceived, patch.paidAt]
      );
    } catch (error) {
      throw friendlyDatabaseError(error);
    }
    return;
  }

  const records = await readStore();
  const next = records.map((record) =>
    record.id === id ? { ...record, ...patch, status: "paid" } : record
  );
  await writeStore(next);
}

export async function upsertCustomerPaymentProfile(profile) {
  assertDatabaseConfigured();

  if (pool) {
    try {
      const result = await pool.query(
        `insert into checkout_customer_profiles (
          customer_email,
          customer_name,
          customer_phone,
          stripe_customer_id,
          default_payment_method_id,
          source_payment_intent_id
        ) values ($1, $2, $3, $4, $5, $6)
        on conflict (stripe_customer_id) do update set
          customer_email = excluded.customer_email,
          customer_name = excluded.customer_name,
          customer_phone = excluded.customer_phone,
          default_payment_method_id = coalesce(excluded.default_payment_method_id, checkout_customer_profiles.default_payment_method_id),
          source_payment_intent_id = coalesce(excluded.source_payment_intent_id, checkout_customer_profiles.source_payment_intent_id),
          updated_at = now()
        returning *`,
        [
          profile.customerEmail,
          profile.customerName || null,
          profile.customerPhone || null,
          profile.stripeCustomerId,
          profile.defaultPaymentMethodId || null,
          profile.sourcePaymentIntentId || null
        ]
      );
      return fromCustomerProfileRow(result.rows[0]);
    } catch (error) {
      throw friendlyDatabaseError(error);
    }
  }

  const records = await readSubscriptionStore();
  const now = new Date().toISOString();
  const current = records.customerProfiles.find(
    (item) => item.stripeCustomerId === profile.stripeCustomerId
  );
  const nextProfile = {
    id: current?.id || crypto.randomUUID(),
    ...current,
    ...profile,
    createdAt: current?.createdAt || now,
    updatedAt: now
  };
  records.customerProfiles = [
    ...records.customerProfiles.filter((item) => item.id !== nextProfile.id),
    nextProfile
  ];
  await writeSubscriptionStore(records);
  return nextProfile;
}

export async function getCustomerPaymentProfileByEmail(email) {
  assertDatabaseConfigured();

  if (pool) {
    try {
      const result = await pool.query(
        "select * from checkout_customer_profiles where lower(customer_email) = lower($1)",
        [email]
      );
      return fromCustomerProfileRow(result.rows[0]);
    } catch (error) {
      throw friendlyDatabaseError(error);
    }
  }

  const records = await readSubscriptionStore();
  return records.customerProfiles.find(
    (item) => item.customerEmail.toLowerCase() === email.toLowerCase()
  );
}

export async function upsertSubscriptionRecord(subscription) {
  assertDatabaseConfigured();

  if (pool) {
    try {
      const result = await pool.query(
        `insert into checkout_subscriptions (
          customer_profile_id,
          customer_email,
          stripe_customer_id,
          stripe_subscription_id,
          default_payment_method_id,
          source_payment_intent_id,
          price_id,
          amount_cents,
          currency,
          interval,
          interval_count,
          description,
          status,
          current_period_start,
          current_period_end
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        on conflict (stripe_subscription_id) do update set
          default_payment_method_id = excluded.default_payment_method_id,
          status = excluded.status,
          current_period_start = excluded.current_period_start,
          current_period_end = excluded.current_period_end,
          updated_at = now()
        returning *`,
        [
          subscription.customerProfileId || null,
          subscription.customerEmail,
          subscription.stripeCustomerId,
          subscription.stripeSubscriptionId,
          subscription.defaultPaymentMethodId,
          subscription.sourcePaymentIntentId || null,
          subscription.priceId || null,
          subscription.amountCents,
          subscription.currency,
          subscription.interval,
          subscription.intervalCount,
          subscription.description,
          subscription.status,
          subscription.currentPeriodStart || null,
          subscription.currentPeriodEnd || null
        ]
      );
      return fromSubscriptionRow(result.rows[0]);
    } catch (error) {
      throw friendlyDatabaseError(error);
    }
  }

  const records = await readSubscriptionStore();
  const now = new Date().toISOString();
  const current = records.subscriptions.find(
    (item) => item.stripeSubscriptionId === subscription.stripeSubscriptionId
  );
  const nextSubscription = {
    id: current?.id || crypto.randomUUID(),
    ...current,
    ...subscription,
    createdAt: current?.createdAt || now,
    updatedAt: now
  };
  records.subscriptions = [
    ...records.subscriptions.filter((item) => item.id !== nextSubscription.id),
    nextSubscription
  ];
  await writeSubscriptionStore(records);
  return nextSubscription;
}

export async function updateSubscriptionStatus(stripeSubscriptionId, patch) {
  if (!stripeSubscriptionId) return;
  assertDatabaseConfigured();

  if (pool) {
    try {
      await pool.query(
        `update checkout_subscriptions
          set status = coalesce($2, status),
              current_period_start = coalesce($3, current_period_start),
              current_period_end = coalesce($4, current_period_end),
              updated_at = now()
          where stripe_subscription_id = $1`,
        [
          stripeSubscriptionId,
          patch.status || null,
          patch.currentPeriodStart || null,
          patch.currentPeriodEnd || null
        ]
      );
    } catch (error) {
      throw friendlyDatabaseError(error);
    }
    return;
  }

  const records = await readSubscriptionStore();
  records.subscriptions = records.subscriptions.map((record) =>
    record.stripeSubscriptionId === stripeSubscriptionId
      ? { ...record, ...patch, updatedAt: new Date().toISOString() }
      : record
  );
  await writeSubscriptionStore(records);
}
