#!/usr/bin/env node
/**
 * Preflight check to ensure activation keys are configured for build/CI.
 *
 * Fails when:
 * - VITE_ACTIVATION_PUBLIC_KEY is missing
 * - or still contains the placeholder string
 *
 * Skip with: ALLOW_MISSING_PUBLIC_KEY=1
 */

import process from "node:process";

const allowMissing = process.env.ALLOW_MISSING_PUBLIC_KEY === "1";
const publicKey = (process.env.VITE_ACTIVATION_PUBLIC_KEY || "").trim();

if (allowMissing) {
  console.log("Skipping activation public key check (ALLOW_MISSING_PUBLIC_KEY=1).");
  process.exit(0);
}

if (!publicKey) {
  console.error("VITE_ACTIVATION_PUBLIC_KEY is not set. Set it or export ALLOW_MISSING_PUBLIC_KEY=1 to bypass.");
  process.exit(1);
}

if (publicKey.includes("REPLACE_WITH_YOUR_PUBLIC_KEY")) {
  console.error("VITE_ACTIVATION_PUBLIC_KEY still contains the placeholder. Set a real public key.");
  process.exit(1);
}

console.log("Activation public key present.");
