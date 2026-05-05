#!/usr/bin/env node
/**
 * WZOS Activation CLI
 *
 * Usage:
 *   node scripts/wzos-activate.js --code <activation-code> [--output <path>] [--org <name>] [--contact <email>]
 *
 * - Activation code format: <base64url(payload)>.<base64url(signature)>
 * - Signature: RSA-SHA256 over the raw payload bytes (adjust if you use a different algorithm).
 * - Public key: inject via ACTIVATION_PUBLIC_KEY env var or replace the placeholder below.
 * - Output: writes a sanitized license file (no secrets) that the app can read; default is public/license.json
 *
 * This script is offline-only and never transmits activation data.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createPublicKey, randomUUID, verify as cryptoVerify } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OUTPUT = path.resolve(__dirname, "../public/license.json");
const PUBLIC_KEY = (process.env.ACTIVATION_PUBLIC_KEY || "").trim() || `-----BEGIN PUBLIC KEY-----
REPLACE_WITH_YOUR_PUBLIC_KEY
-----END PUBLIC KEY-----`;

function base64UrlToBuffer(value) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function parseArgs(argv) {
  const args = { output: DEFAULT_OUTPUT };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--code":
        args.code = next;
        i++;
        break;
      case "--output":
        args.output = path.resolve(next);
        i++;
        break;
      case "--org":
        args.org = next;
        i++;
        break;
      case "--contact":
        args.contact = next;
        i++;
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        break;
    }
  }
  return args;
}

function showHelp() {
  console.log(`
WZOS Activation CLI

Usage:
  node scripts/wzos-activate.js --code <activation-code> [--output <path>] [--org <name>] [--contact <email>]

Options:
  --code     Activation code in format <base64url(payload)>.<base64url(signature)> (required)
  --output   Where to write the license file (default: public/license.json)
  --org      Optional organization name to include in the license record
  --contact  Optional contact email to include in the license record
  -h, --help Show this help message
`);
}

function loadPublicKey() {
  if (PUBLIC_KEY.includes("REPLACE_WITH_YOUR_PUBLIC_KEY")) {
    console.warn("Warning: Replace the placeholder PUBLIC KEY or set ACTIVATION_PUBLIC_KEY before use.");
  }
  return createPublicKey(PUBLIC_KEY);
}

function verifyActivationCode(code, publicKey) {
  if (!code || typeof code !== "string") {
    throw new Error("Activation code is required (--code).");
  }
  const segments = code.split(".");
  if (segments.length !== 2) {
    throw new Error("Invalid activation code format. Expecting <payload>.<signature> (base64url).");
  }
  const [payloadB64Url, signatureB64Url] = segments;
  const payloadBuf = base64UrlToBuffer(payloadB64Url);
  const signatureBuf = base64UrlToBuffer(signatureB64Url);

  const ok = cryptoVerify("sha256", payloadBuf, publicKey, signatureBuf);
  if (!ok) {
    throw new Error("Activation code signature verification failed.");
  }

  let payload;
  try {
    payload = JSON.parse(payloadBuf.toString("utf8"));
  } catch (err) {
    throw new Error("Activation payload is not valid JSON.");
  }

  if (!payload.org) {
    console.warn("Note: payload.org missing; include org for better traceability.");
  }

  return { payload, signature: signatureB64Url, rawPayload: payloadBuf.toString("utf8") };
}

function writeLicense({ payload, signature, output, org, contact }) {
  const license = {
    id: payload.licenseId || randomUUID(),
    org: org || payload.org || null,
    contact: contact || payload.contact || null,
    issuedAt: payload.issuedAt || null,
    expiresAt: payload.expiresAt || null,
    plan: payload.plan || null,
    seats: payload.seats || null,
    activation: {
      payload,
      signature,
      activatedAt: new Date().toISOString(),
    },
    meta: {
      note: "Store securely. This file holds no secrets; it proves license ownership.",
      format: "wzos-license-v1",
    },
  };

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(license, null, 2), "utf8");
  return output;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const publicKey = loadPublicKey();
  const { payload, signature } = verifyActivationCode(args.code, publicKey);
  const outputPath = writeLicense({
    payload,
    signature,
    output: args.output,
    org: args.org,
    contact: args.contact,
  });

  console.log(`Activation succeeded. License written to: ${outputPath}`);
}

try {
  await main();
} catch (err) {
  console.error(`Activation failed: ${err.message}`);
  process.exit(1);
}
