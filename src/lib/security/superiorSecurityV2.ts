/**
 * WZOS Superior Security V2.0
 * Hardened, production-ready security utilities for the Work Zone OS PWA/SAAS.
 *
 * Design goals:
 * - Strict outbound allowlisting for trusted services (Supabase, Google, OpenAI) with runtime extensibility.
 * - Integrity + confidentiality helpers (HMAC signing, AES-GCM encryption) using WebCrypto when available.
 * - Vault storage with at-rest encryption for sensitive client-side payloads (e.g., cached employee data).
 * - Input sanitization, nonce/CSRF helpers, request rate limiting, and structured audit logging.
 * - Zero hardcoded secrets: draw from env/config and caller-provided secrets only.
 *
 * NOTE: Secrets must come from runtime configuration (e.g., env vars, secure storage). Do not hardcode keys.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type SecurityEventSeverity = "high" | "medium" | "low";

export type SecurityEvent = {
  type: string;
  at: string;
  severity: SecurityEventSeverity;
  details: Record<string, unknown>;
};

export type TrustedService = {
  name: string;
  hosts: string[];
  paths?: string[];
};

export type RateLimitOptions = {
  capacity: number;
  refillPerSecond: number;
};

export type SecurityConfig = {
  allowlist: TrustedService[];
  signingSecret?: string;
  vaultSecret?: string;
  defaultRateLimit?: RateLimitOptions;
};

type NonceRecord = { nonce: string; expiresAt: number };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const base64Encode = (bytes: Uint8Array): string => {
  if (typeof btoa === "function") {
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }
  // Node / non-browser
  return Buffer.from(bytes).toString("base64");
};

const base64Decode = (value: string): Uint8Array => {
  if (typeof atob === "function") {
    const binary = atob(value);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  }
  return Uint8Array.from(Buffer.from(value, "base64"));
};

const getCrypto = (): Crypto | null => {
  // Browser and modern runtimes expose crypto.subtle.
  if (typeof globalThis !== "undefined" && (globalThis as any).crypto?.subtle) {
    return (globalThis as any).crypto as Crypto;
  }
  return null;
};

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const cryptoApi = getCrypto();
  if (!cryptoApi?.subtle) throw new Error("WebCrypto not available for AES-GCM operations.");

  const salt = encoder.encode("wzos-superior-security-v2");
  const keyMaterial = await cryptoApi.subtle.importKey("raw", encoder.encode(secret), "PBKDF2", false, [
    "deriveKey",
  ]);
  return cryptoApi.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 150_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function hmacSha256(secret: string, payload: string): Promise<string> {
  const cryptoApi = getCrypto();
  if (!cryptoApi?.subtle) throw new Error("WebCrypto not available for HMAC operations.");

  const key = await cryptoApi.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await cryptoApi.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64Encode(new Uint8Array(signature));
}

export class SuperiorSecurityV2 {
  private readonly allowlist: TrustedService[];
  private readonly signingSecret?: string;
  private readonly vaultSecret?: string;
  private readonly defaultRateLimit: RateLimitOptions;
  private readonly rateLimiter = new Map<string, { tokens: number; last: number }>();
  private readonly nonces = new Map<string, NonceRecord>();
  private readonly audit: SecurityEvent[] = [];
  private readonly auditLimit = 300;

  constructor(config: SecurityConfig) {
    this.allowlist = config.allowlist;
    this.signingSecret = config.signingSecret;
    this.vaultSecret = config.vaultSecret;
    this.defaultRateLimit = config.defaultRateLimit ?? { capacity: 120, refillPerSecond: 2 };
  }

  //
  // Trust & allowlisting
  //
  isTrustedUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return this.allowlist.some((svc) => {
        const hostAllowed = svc.hosts.some((h) => this.matchHost(parsed.hostname, h));
        if (!hostAllowed) return false;
        if (!svc.paths || svc.paths.length === 0) return true;
        return svc.paths.some((p) => parsed.pathname.startsWith(p));
      });
    } catch (err) {
      this.log("INVALID_URL", "medium", { url, error: (err as Error).message });
      return false;
    }
  }

  private matchHost(hostname: string, rule: string): boolean {
    if (rule.startsWith("*.")) {
      return hostname === rule.slice(2) || hostname.endsWith(`.${rule.slice(2)}`);
    }
    return hostname === rule;
  }

  //
  // Rate limiting
  //
  enforceRateLimit(key: string, opts: RateLimitOptions = this.defaultRateLimit): boolean {
    const now = Date.now() / 1000;
    const state = this.rateLimiter.get(key) ?? { tokens: opts.capacity, last: now };
    const elapsed = now - state.last;
    state.tokens = Math.min(opts.capacity, state.tokens + elapsed * opts.refillPerSecond);
    state.last = now;
    if (state.tokens < 1) {
      this.log("RATE_LIMITED", "medium", { key, capacity: opts.capacity });
      this.rateLimiter.set(key, state);
      return false;
    }
    state.tokens -= 1;
    this.rateLimiter.set(key, state);
    return true;
  }

  //
  // Nonce / CSRF helpers
  //
  createNonce(ttlMs = 15 * 60 * 1000): string {
    const cryptoApi = getCrypto();
    const raw = cryptoApi?.getRandomValues(new Uint8Array(16)) ?? crypto.getRandomValues(new Uint8Array(16));
    const nonce = base64Encode(raw);
    this.nonces.set(nonce, { nonce, expiresAt: Date.now() + ttlMs });
    return nonce;
  }

  validateNonce(nonce: string): boolean {
    const record = this.nonces.get(nonce);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
      this.nonces.delete(nonce);
      return false;
    }
    this.nonces.delete(nonce);
    return true;
  }

  //
  // Integrity & confidentiality
  //
  async signPayload(payload: unknown, secret = this.signingSecret): Promise<string> {
    if (!secret) throw new Error("Signing secret missing.");
    const canonical = JSON.stringify(payload);
    return hmacSha256(secret, canonical);
  }

  async verifySignature(payload: unknown, signature: string, secret = this.signingSecret): Promise<boolean> {
    if (!secret) return false;
    try {
      const expected = await this.signPayload(payload, secret);
      return expected === signature;
    } catch (err) {
      this.log("SIGNATURE_VERIFY_FAILED", "medium", { error: (err as Error).message });
      return false;
    }
  }

  async encrypt<T>(payload: T, secret = this.vaultSecret): Promise<string> {
    if (!secret) throw new Error("Vault secret missing.");
    const cryptoApi = getCrypto();
    if (!cryptoApi?.subtle) throw new Error("WebCrypto not available for encryption.");

    const key = await deriveAesKey(secret);
    const iv = cryptoApi.getRandomValues(new Uint8Array(12));
    const ciphertext = await cryptoApi.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(payload)));
    return `${base64Encode(iv)}.${base64Encode(new Uint8Array(ciphertext))}`;
  }

  async decrypt<T>(sealed: string, secret = this.vaultSecret): Promise<T | null> {
    if (!secret) return null;
    const cryptoApi = getCrypto();
    if (!cryptoApi?.subtle) return null;
    const [ivPart, ctPart] = sealed.split(".");
    if (!ivPart || !ctPart) return null;
    try {
      const key = await deriveAesKey(secret);
      const iv = Uint8Array.from(base64Decode(ivPart));
      const ciphertext = Uint8Array.from(base64Decode(ctPart));
      const plaintext = await cryptoApi.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
      return JSON.parse(decoder.decode(new Uint8Array(plaintext))) as T;
    } catch (err) {
      this.log("DECRYPT_FAIL", "medium", { error: (err as Error).message });
      return null;
    }
  }

  //
  // Vault storage (encrypted localStorage)
  //
  async putVault(key: string, value: unknown, storage: Storage = globalThis.localStorage): Promise<void> {
    const sealed = await this.encrypt(value);
    storage.setItem(this.vaultKey(key), sealed);
  }

  async getVault<T>(key: string, storage: Storage = globalThis.localStorage): Promise<T | null> {
    const sealed = storage.getItem(this.vaultKey(key));
    if (!sealed) return null;
    return this.decrypt<T>(sealed);
  }

  clearVault(key: string, storage: Storage = globalThis.localStorage): void {
    storage.removeItem(this.vaultKey(key));
  }

  private vaultKey(key: string): string {
    return `wzos.v2.vault.${key}`;
  }

  //
  // Sanitization & hashing
  //
  sanitize(input: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "/": "&#x2F;",
    };
    return input.replace(/[&<>"'/]/g, (c) => map[c] ?? c);
  }

  sanitizeDeep<T>(payload: T): T {
    if (typeof payload === "string") return this.sanitize(payload) as unknown as T;
    if (Array.isArray(payload)) return payload.map((v) => this.sanitizeDeep(v)) as unknown as T;
    if (payload && typeof payload === "object") {
      const entries = Object.entries(payload as Record<string, unknown>).map(([k, v]) => [k, this.sanitizeDeep(v)]);
      return Object.fromEntries(entries) as unknown as T;
    }
    return payload;
  }

  async hash(input: string): Promise<string> {
    const cryptoApi = getCrypto();
    if (!cryptoApi?.subtle) throw new Error("WebCrypto not available for hashing.");
    const digest = await cryptoApi.subtle.digest("SHA-256", encoder.encode(input));
    return base64Encode(new Uint8Array(digest));
  }

  //
  // Secure fetch wrapper
  //
  async secureFetch(input: RequestInfo | URL, init: RequestInit = {}, opts?: { allowUntrusted?: boolean }): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

    if (!opts?.allowUntrusted && !this.isTrustedUrl(url)) {
      this.log("UNTRUSTED_REQUEST_BLOCKED", "high", { url });
      throw new Error(`Blocked request to untrusted host: ${url}`);
    }

    if (!this.enforceRateLimit(`fetch:${new URL(url).hostname}`)) {
      throw new Error("Rate limited");
    }

    const headers = new Headers(init.headers || {});
    headers.set("X-WZOS-Trace", crypto.randomUUID ? crypto.randomUUID() : `trace-${Date.now()}`);

    if (this.signingSecret) {
      const bodyForSign = typeof init.body === "string" ? init.body : init.body ? JSON.stringify(init.body) : "";
      const signature = await this.signPayload(`${init.method || "GET"}:${url}:${bodyForSign}`);
      headers.set("X-WZOS-Signature", signature);
    }

    return fetch(input, { ...init, headers });
  }

  //
  // Audit log
  //
  log(type: string, severity: SecurityEventSeverity, details: Record<string, unknown>): SecurityEvent {
    const event: SecurityEvent = { type, at: new Date().toISOString(), severity, details };
    this.audit.push(event);
    if (this.audit.length > this.auditLimit) this.audit.shift();
    return event;
  }

  getAuditLog(): SecurityEvent[] {
    return [...this.audit].reverse();
  }
}

export const createSecurityV2 = (config?: Partial<SecurityConfig>) => {
  const allowlist: TrustedService[] = [
    {
      name: "supabase",
      hosts: [
        new URL(import.meta.env.VITE_SUPABASE_URL || "https://example.supabase.co").hostname,
        "supabase.co",
        "supabase.com",
      ],
      paths: ["/auth/v1", "/rest/v1", "/storage/v1", "/realtime/v1"],
    },
    {
      name: "google",
      hosts: ["googleapis.com", "maps.googleapis.com", "maps.google.com", "youtube.com", "i.ytimg.com", "www.youtube.com"],
    },
    {
      name: "openai",
      hosts: ["api.openai.com"],
      paths: ["/v1/chat/completions", "/v1/embeddings"],
    },
    {
      name: "wzos-api",
      hosts: [new URL(import.meta.env.VITE_API_BASE_URL || "https://api.superiorllc.org/api").hostname],
    },
    {
      name: "github-static",
      hosts: ["raw.githubusercontent.com", "github.com"],
      paths: ["/OpenDataUSA/state-maps"],
    },
  ];

  return new SuperiorSecurityV2({
    allowlist,
    // Browser bundles should not source HMAC or vault master secrets from Vite env vars.
    // Pass those explicitly in server-side contexts only.
    ...config,
  });
};
