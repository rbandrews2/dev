#!/usr/bin/env node
/**
 * Guided installer for WZOS (non-Docker).
 *
 * - Tells the user what info they need.
 * - Prompts for Supabase + activation details.
 * - Writes .env.production (backing up any existing file).
 * - Optionally installs deps, builds, runs activation.
 *
 * Usage: node scripts/install-wzos.js
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(prompt, { required = false, defaultValue = "" } = {}) {
  return new Promise((resolve) => {
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    rl.question(`${prompt}${suffix}: `, (answer) => {
      const val = answer.trim() || defaultValue;
      if (required && !val) {
        console.log("This field is required. Please provide a value.");
        resolve(ask(prompt, { required, defaultValue }));
      } else {
        resolve(val);
      }
    });
  });
}

function writeEnvFile(envPath, values) {
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, `${envPath}.bak`);
    console.log(`Backed up existing env to ${envPath}.bak`);
  }
  const lines = Object.entries(values)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
  console.log(`Wrote ${envPath}`);
}

function run(cmd, args, opts = {}) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  }
}

async function main() {
  console.log("\nWelcome to the WZOS guided installer.\n");
  console.log("You will need:");
  console.log("  - Supabase URL (Project settings -> API -> Project URL)");
  console.log("  - Supabase anon key (Project settings -> API -> anon public)");
  console.log("  - Supabase project name (for your reference)");
  console.log("  - Google Maps API key (optional, from Google Cloud)\n");

  console.log('Press Enter to continue when you have this info ready (or Ctrl+C to exit).');
  await ask("Continue", { defaultValue: "" });

  const supabaseUrl = await ask("Supabase URL", { required: true });
  const supabaseAnon = await ask("Supabase anon key", { required: true });
  const supabaseProject = await ask("Supabase project name (for reference)", { defaultValue: "" });
  const mapsKey = await ask("Google Maps API key (optional)", { defaultValue: "" });
  const envPath = path.join(process.cwd(), ".env.production");
  const envValues = {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnon,
    VITE_SUPABASE_PROJECT: supabaseProject,
    VITE_GOOGLE_MAPS_API_KEY: mapsKey,
  };

  writeEnvFile(envPath, envValues);

  const doInstall = (await ask("Install dependencies now? (Y/n)", { defaultValue: "Y" })).toLowerCase() !== "n";
  if (doInstall) {
    run("npm", ["install"]);
  }

  const doBuild = (await ask("Build the app now? (Y/n)", { defaultValue: "Y" })).toLowerCase() !== "n";
  if (doBuild) {
    run("npm", ["run", "build"]);
  }

  console.log("\nDone. To start locally:");
  console.log("  npm run preview   # serves the built app");
  console.log("or");
  console.log("  npm run dev       # dev server\n");
}

main()
  .catch((err) => {
    console.error(`Installer error: ${err.message}`);
    process.exit(1);
  })
  .finally(() => rl.close());
