const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function generateActivationCode(length = 15): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export function normalizeActivationCode(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export async function sha256Hex(input: string): Promise<string> {
  const data = textEncoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64Encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64Decode(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey("raw", textEncoder.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: textEncoder.encode("wzos-commerce-v1"),
      iterations: 200_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function sealSecret(secret: string, plaintext: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, textEncoder.encode(plaintext));
  return `${base64Encode(iv)}.${base64Encode(new Uint8Array(ciphertext))}`;
}

export async function openSecret(secret: string, sealed: string): Promise<string> {
  const [ivPart, cipherPart] = sealed.split(".");
  if (!ivPart || !cipherPart) throw new Error("Malformed sealed secret");
  const key = await deriveKey(secret);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64Decode(ivPart) },
    key,
    base64Decode(cipherPart),
  );
  return textDecoder.decode(new Uint8Array(plaintext));
}

export function createDeliveryToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}
