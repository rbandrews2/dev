import { mapsConfig, requireMapsApiKey } from "./config";
import { security, securityV2 } from "@/lib/security";

export type MapRequestOptions = {
  endpoint: string;
  params?: Record<string, string | number | boolean | undefined | null>;
  responseType?: "json" | "text";
  timeoutMs?: number;
  signal?: AbortSignal;
};

type NormalizedError = {
  message: string;
  status?: number;
  endpoint: string;
};

function buildUrl(endpoint: string, params?: MapRequestOptions["params"]) {
  const key = requireMapsApiKey();
  const search = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      search.set(k, String(v));
    });
  }
  if (!search.has("key")) search.set("key", key);
  const base = mapsConfig.MAPS_BASE_URL.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${path}?${search.toString()}`;
}

function normalizeError(endpoint: string, status?: number, err?: unknown): NormalizedError {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown maps error";
  return { message, status, endpoint };
}

export async function mapsClientRequest<T = unknown>(options: MapRequestOptions): Promise<T> {
  const { endpoint, params, responseType = "json", timeoutMs = mapsConfig.REQUEST_TIMEOUT_MS, signal } =
    options;
  const url = buildUrl(endpoint, params);

  const attemptFetch = async (attempt: number): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (signal) {
        signal.addEventListener("abort", () => controller.abort(), { once: true });
      }

      const res = await securityV2.secureFetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        const errorObj = normalizeError(endpoint, res.status, await res.text());
        security.logSecurityEvent("MAPS_REQUEST_FAILED", { ...errorObj, attempt });
        devLogMapsFailure({
          provider: mapsConfig.MAPS_PROVIDER,
          endpoint,
          status: res.status,
          attempt,
          message: errorObj.message,
        });
        if (attempt < mapsConfig.RETRY_COUNT) return attemptFetch(attempt + 1);
        throw new Error(`${errorObj.message} (${errorObj.status ?? "no status"})`);
      }

      if (responseType === "text") return (await res.text()) as T;
      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timer);
      security.logSecurityEvent("MAPS_REQUEST_ERROR", {
        endpoint,
        attempt,
        error: err instanceof Error ? err.message : String(err),
      });
      devLogMapsFailure({
        provider: mapsConfig.MAPS_PROVIDER,
        endpoint,
        attempt,
        error: err,
      });
      if (attempt < mapsConfig.RETRY_COUNT) return attemptFetch(attempt + 1);
      throw err;
    }
  };

  return attemptFetch(0);
}

export function devLogMapsFailure(details: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.debug("[maps] request failed", details);
  }
}

export async function loadMapsScript(libraries = "places"): Promise<void> {
  const url = buildUrl("/maps/api/js", { libraries });

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", (err) => reject(err));
      return;
    }

    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      security.logSecurityEvent("MAPS_SCRIPT_TIMEOUT", { url });
      devLogMapsFailure({ url, reason: "timeout" });
      script.remove();
      reject(new Error("Maps script load timed out"));
    }, mapsConfig.REQUEST_TIMEOUT_MS);

    script.src = url;
    script.async = true;
    script.onload = () => {
      clearTimeout(timeout);
      security.logSecurityEvent("MAPS_SCRIPT_LOADED", { url });
      resolve();
    };
    script.onerror = (err) => {
      clearTimeout(timeout);
      security.logSecurityEvent("MAPS_SCRIPT_ERROR", { url, error: String(err) });
      devLogMapsFailure({ url, error: err });
      reject(new Error("Maps script failed to load. Check API key and referrer settings."));
    };
    document.head.appendChild(script);
  });
}
