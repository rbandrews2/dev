import { SuperiorSecurity } from "./superiorSecurity";
import { SuperiorSecurityV2, createSecurityV2 } from "./superiorSecurityV2";

export const security = new SuperiorSecurity();
export const securityV2 = createSecurityV2();
export { SuperiorSecurityV2, createSecurityV2 };

type JsonLike = string | number | boolean | null | JsonLike[] | { [key: string]: JsonLike };

/**
 * Recursively sanitize a payload before persistence to help prevent XSS or
 * script injection in stored strings.
 */
export function sanitizePayload<T extends Record<string, unknown> | JsonLike>(payload: T): T {
  const sanitizeValue = (value: unknown): unknown => {
    if (typeof value === "string") return security.sanitizeInput(value);
    if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
    if (value && typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        sanitizeValue(val),
      ]);
      return Object.fromEntries(entries);
    }
    return value;
  };

  return sanitizeValue(payload) as T;
}
