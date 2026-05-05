#!/usr/bin/env node
/**
 * Package a self-hostable WZOS bundle (sanitized).
 *
 * - Copies whitelisted artifacts into release/wzos-selfhosted-<version>/
 * - Attempts to create a tar.gz archive (uses system `tar` if available)
 * - Never copies .env* or secrets; relies on ENV.example
 *
 * Usage: node scripts/package-selfhost.js
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import process from "node:process";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Skipping missing path: ${src}`);
    return;
  }
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function main() {
  const cwd = process.cwd();
  const pkg = readJson(path.join(cwd, "package.json"));
  const version = pkg.version || "0.0.0";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `wzos-selfhosted-${version}-${stamp}`;
  const releaseRoot = path.join(cwd, "release");
  const outDir = path.join(releaseRoot, baseName);

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const whitelist = [
    { src: path.join(cwd, "dist"), dest: path.join(outDir, "dist") },
    { src: path.join(cwd, "README.md"), dest: path.join(outDir, "README.md") },
    { src: path.join(cwd, "docs", "SELFHOST-INSTALL.md"), dest: path.join(outDir, "docs", "SELFHOST-INSTALL.md") },
    { src: path.join(cwd, "src", "ENV.example"), dest: path.join(outDir, "ENV.example") },
    { src: path.join(cwd, "scripts", "install-wzos.js"), dest: path.join(outDir, "scripts", "install-wzos.js") },
  ];

  whitelist.forEach(({ src, dest }) => copyRecursive(src, dest));

  const archivePath = path.join(releaseRoot, `${baseName}.tar.gz`);
  try {
    execSync(`tar -czf "${archivePath}" "${baseName}"`, {
      cwd: releaseRoot,
      stdio: "ignore",
    });
    console.log(`Packaged: ${archivePath}`);
  } catch (err) {
    console.warn("Could not create tar.gz (is 'tar' available?). Bundle folder created instead:", outDir);
  }
}

main();
