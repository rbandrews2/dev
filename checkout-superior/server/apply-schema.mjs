import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "schema.sql");
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error("DATABASE_URL is required. Set it before running npm run db:schema.");
  process.exit(1);
}

if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
  console.error("DATABASE_URL must be a Postgres connection string.");
  process.exit(1);
}

const { Client } = pg;
const client = new Client({
  connectionString: databaseUrl,
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : {
          rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false"
        }
});

try {
  const sql = await fs.readFile(schemaPath, "utf8");
  await client.connect();
  await client.query(sql);
  console.log("Database schema applied successfully.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
