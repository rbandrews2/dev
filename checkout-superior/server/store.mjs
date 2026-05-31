import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const storePath = path.resolve(process.env.AUTHORIZATION_STORE_PATH || "./data/authorizations.json");
const { Pool } = pg;

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
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

export async function appendAuthorization(record) {
  if (pool) {
    const dbRecord = toDbRecord(record);
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
  }

  const records = await readStore();
  records.push(record);
  await writeStore(records);
  return record;
}

appendAuthorization.get = async (id) => {
  if (pool) {
    const result = await pool.query("select * from checkout_authorizations where id = $1", [id]);
    return fromDbRecord(result.rows[0]);
  }

  const records = await readStore();
  return records.find((record) => record.id === id);
};

export async function markAuthorizationPaid(id, patch) {
  if (!id) return;
  if (pool) {
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
    return;
  }

  const records = await readStore();
  const next = records.map((record) =>
    record.id === id ? { ...record, ...patch, status: "paid" } : record
  );
  await writeStore(next);
}
