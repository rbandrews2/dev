import crypto from "node:crypto";

function base64url(bytes = 48) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function hex(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

const generated = {
  WZOS_WEBHOOK_SIGNING_SECRET: base64url(48),
  WZOS_VAULT_MASTER_KEY: base64url(48),
  QUICKBOOKS_WEBHOOK_VERIFIER: base64url(32),
  QUICKBOOKS_TIME_WEBHOOK_VERIFIER: base64url(32),
  WZOS_INTERNAL_ROTATION_ID: hex(16),
};

console.log("# Generated Work Zone OS integration secrets");
for (const [key, value] of Object.entries(generated)) {
  console.log(`${key}=${value}`);
}

console.log("");
console.log("# Supply these values manually from each provider dashboard:");
console.log("QUICKBOOKS_CLIENT_ID=");
console.log("QUICKBOOKS_CLIENT_SECRET=");
console.log("QUICKBOOKS_REDIRECT_URI=");
console.log("QUICKBOOKS_TIME_CLIENT_ID=");
console.log("QUICKBOOKS_TIME_CLIENT_SECRET=");
console.log("QUICKBOOKS_TIME_REDIRECT_URI=");
console.log("GOOGLE_DRIVE_CLIENT_SECRET=");
console.log("GOOGLE_DRIVE_REDIRECT_URI=");
console.log("MICROSOFT_GRAPH_CLIENT_SECRET=");
console.log("MICROSOFT_TENANT_ID=");
console.log("MICROSOFT_REDIRECT_URI=");
