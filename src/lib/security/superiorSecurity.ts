export type SecuritySeverity = "high" | "medium" | "low";

export type SecurityEvent = {
  type: string;
  timestamp: string;
  details: Record<string, unknown>;
  severity: SecuritySeverity;
};

export type PasswordStrengthResult = {
  isValid: boolean;
  score: number;
  strength: "strong" | "medium" | "weak";
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    special: boolean;
  };
};

export type FileValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export class SuperiorSecurity {
  private securityLog: SecurityEvent[] = [];
  private rateLimitStore = new Map<string, number[]>();
  private sessionStore = new Map<string, { csrfToken: string; createdAt: number }>();
  private encryptionKey: string;

  private readonly trustedDomains = [
    "supabase.co",
    "supabase.com",
    "supabase.io",
    "*.supabase.co",
    "googleapis.com",
    "maps.googleapis.com",
    "maps.google.com",
    "gstatic.com",
  ];

  private readonly trustedPaths = [
    "/rest/v1/",
    "/auth/v1/",
    "/storage/v1/",
    "/realtime/v1/",
    "/maps/api/js",
    "/maps/api/place",
    "/maps/api/geocode",
    "/maps/embed/v1/",
  ];

  constructor() {
    this.encryptionKey = this.generateEncryptionKey();
  }

  private get cryptoApi(): Crypto | null {
    if (typeof globalThis !== "undefined" && globalThis.crypto) return globalThis.crypto;
    if (typeof window !== "undefined" && window.crypto) return window.crypto;
    return null;
  }

  private createRandomBytes(length: number): Uint8Array {
    const api = this.cryptoApi;
    if (api) {
      const array = new Uint8Array(length);
      api.getRandomValues(array);
      return array;
    }

    // Fallback for environments without crypto (should not happen in the app)
    const fallback = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      fallback[i] = Math.floor(Math.random() * 256);
    }
    return fallback;
  }

  private generateEncryptionKey(): string {
    const bytes = this.createRandomBytes(32);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  isTrustedSource(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      for (const domain of this.trustedDomains) {
        if (domain.startsWith("*.")) {
          const baseDomain = domain.slice(2);
          if (hostname.endsWith(baseDomain)) return true;
        } else if (hostname.includes(domain)) {
          return true;
        }
      }

      for (const path of this.trustedPaths) {
        if (urlObj.pathname.includes(path)) return true;
      }

      return false;
    } catch (error) {
      this.logSecurityEvent("INVALID_URL", { error: (error as Error).message });
      return false;
    }
  }

  validateSupabaseRequest(headers: Record<string, string | undefined>): boolean {
    const hasApiKey = Boolean(headers.apikey || headers["x-api-key"]);
    const hasAuth = Boolean(headers.authorization);

    if (hasApiKey || hasAuth) {
      this.logSecurityEvent("SUPABASE_REQUEST_VALIDATED", {
        hasApiKey,
        hasAuth,
      });
      return true;
    }

    this.logSecurityEvent("SUPABASE_REQUEST_REJECTED", {});
    return false;
  }

  sanitizeInput<T>(input: T): T {
    if (typeof input !== "string") return input;

    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "/": "&#x2F;",
    };

    const sanitized = input.replace(/[&<>"'/]/g, (char) => replacements[char] ?? char);

    if (sanitized !== input) {
      this.logSecurityEvent("XSS_SANITIZED", { before: input.slice(0, 40), after: sanitized.slice(0, 40) });
    }

    return sanitized as T;
  }

  validateSQLParams(params: Record<string, unknown>): boolean {
    const sqlInjectionPattern =
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)|(-{2})|(\*)|(\bOR\b.*=.*)|(\bAND\b.*=.*)/gi;

    for (const param of Object.values(params)) {
      if (typeof param === "string" && sqlInjectionPattern.test(param)) {
        this.logSecurityEvent("SQL_INJECTION_ATTEMPT", { param: param.slice(0, 60) });
        return false;
      }
    }

    return true;
  }

  checkRateLimit(
    identifier: string,
    maxRequests = 100,
    windowMs = 60_000,
    sourceUrl?: string | null,
  ): boolean {
    if (sourceUrl && this.isTrustedSource(sourceUrl)) {
      this.logSecurityEvent("TRUSTED_SOURCE_BYPASSED", { identifier, sourceUrl });
      return true;
    }

    const now = Date.now();
    const requests = this.rateLimitStore.get(identifier) ?? [];
    const recentRequests = requests.filter((timestamp) => now - timestamp < windowMs);

    if (recentRequests.length >= maxRequests) {
      this.logSecurityEvent("RATE_LIMIT_EXCEEDED", { identifier, requests: recentRequests.length });
      this.rateLimitStore.set(identifier, recentRequests);
      return false;
    }

    recentRequests.push(now);
    this.rateLimitStore.set(identifier, recentRequests);
    return true;
  }

  generateCSRFToken(sessionId: string): string {
    const tokenBytes = this.createRandomBytes(32);
    const tokenString = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

    this.sessionStore.set(sessionId, {
      csrfToken: tokenString,
      createdAt: Date.now(),
    });

    return tokenString;
  }

  validateCSRFToken(sessionId: string, token: string): boolean {
    const session = this.sessionStore.get(sessionId);

    if (!session) {
      this.logSecurityEvent("INVALID_SESSION", { sessionId });
      return false;
    }

    if (session.csrfToken !== token) {
      this.logSecurityEvent("CSRF_TOKEN_MISMATCH", { sessionId });
      return false;
    }

    if (Date.now() - session.createdAt > 3_600_000) {
      this.logSecurityEvent("CSRF_TOKEN_EXPIRED", { sessionId });
      return false;
    }

    return true;
  }

  validatePasswordStrength(password: string): PasswordStrengthResult {
    const minLength = 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

    const checks = {
      length: password.length >= minLength,
      uppercase: hasUpperCase,
      lowercase: hasLowerCase,
      numbers: hasNumbers,
      special: hasSpecialChar,
    };

    const score = Object.values(checks).filter(Boolean).length;
    const strength = score >= 5 ? "strong" : score >= 4 ? "medium" : "weak";

    if (!score || strength === "weak") {
      this.logSecurityEvent("WEAK_PASSWORD_ATTEMPT", { length: password.length });
    }

    return {
      isValid: score >= 4 && checks.length,
      score,
      checks,
      strength,
    };
  }

  generateAuthToken(userId: string, expiresIn = 3_600_000): string {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ userId, iat: Date.now(), exp: Date.now() + expiresIn }));
    const signature = this.createSignature(`${header}.${payload}`);
    return `${header}.${payload}.${signature}`;
  }

  private createSignature(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return btoa(hash.toString(16));
  }

  validateFileUpload(file: { size: number; name: string }, allowedTypes: string[], maxSizeMB = 10): FileValidationResult {
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      this.logSecurityEvent("FILE_SIZE_EXCEEDED", { fileName: file.name, size: file.size });
      return { valid: false, reason: "File size exceeds limit" };
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedTypes.includes(fileExtension)) {
      this.logSecurityEvent("INVALID_FILE_TYPE", { fileName: file.name, type: fileExtension });
      return { valid: false, reason: "File type not allowed" };
    }

    const dangerousExtensions = ["exe", "bat", "cmd", "sh", "ps1", "app", "deb", "rpm"];
    if (dangerousExtensions.includes(fileExtension)) {
      this.logSecurityEvent("DANGEROUS_FILE_BLOCKED", { fileName: file.name });
      return { valid: false, reason: "Executable files not allowed" };
    }

    return { valid: true };
  }

  encryptData<T>(data: T): string {
    const jsonString = JSON.stringify(data);
    let encrypted = "";

    for (let i = 0; i < jsonString.length; i++) {
      const charCode = jsonString.charCodeAt(i);
      const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
      encrypted += String.fromCharCode(charCode ^ keyChar);
    }

    return btoa(encrypted);
  }

  decryptData<T>(encryptedData: string): T | null {
    try {
      const decoded = atob(encryptedData);
      let decrypted = "";

      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i);
        const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
        decrypted += String.fromCharCode(charCode ^ keyChar);
      }

      return JSON.parse(decrypted) as T;
    } catch (error) {
      this.logSecurityEvent("DECRYPTION_FAILED", { error: (error as Error).message });
      return null;
    }
  }

  logSecurityEvent(eventType: string, details: Record<string, unknown>): SecurityEvent {
    const event: SecurityEvent = {
      type: eventType,
      timestamp: new Date().toISOString(),
      details,
      severity: this.getEventSeverity(eventType),
    };

    this.securityLog.push(event);
    if (this.securityLog.length > 100) {
      this.securityLog.shift();
    }

    return event;
  }

  private getEventSeverity(eventType: string): SecuritySeverity {
    const highSeverity = ["SQL_INJECTION_ATTEMPT", "DANGEROUS_FILE_BLOCKED", "CSRF_TOKEN_MISMATCH"];
    const mediumSeverity = [
      "RATE_LIMIT_EXCEEDED",
      "INVALID_SESSION",
      "INVALID_FILE_TYPE",
      "FILE_SIZE_EXCEEDED",
      "WEAK_PASSWORD_ATTEMPT",
    ];
    const lowSeverity = ["TRUSTED_SOURCE_BYPASSED", "SUPABASE_REQUEST_VALIDATED", "XSS_SANITIZED"];

    if (highSeverity.includes(eventType)) return "high";
    if (mediumSeverity.includes(eventType)) return "medium";
    if (lowSeverity.includes(eventType)) return "low";
    return "low";
  }

  getSecurityLog(): SecurityEvent[] {
    return [...this.securityLog].reverse();
  }

  getSecurityStats(): { total: number; high: number; medium: number; low: number } {
    const total = this.securityLog.length;
    const high = this.securityLog.filter((e) => e.severity === "high").length;
    const medium = this.securityLog.filter((e) => e.severity === "medium").length;
    const low = this.securityLog.filter((e) => e.severity === "low").length;
    return { total, high, medium, low };
  }
}
