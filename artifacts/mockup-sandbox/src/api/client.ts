import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { getTokens, setTokens, clearTokens } from "./tokens";
import { ApiError, type ApiErrorBody } from "./errors";

const BASE_RAW = import.meta.env.VITE_API_BASE_URL ?? "";
const BASE = BASE_RAW.replace(/\/$/, "");

if (!BASE) {
  // eslint-disable-next-line no-console
  console.warn(
    "[api] VITE_API_BASE_URL is not set. Set it in .env (frontend root) before making API calls.",
  );
}

/** Public app-root URL (without /api/v1) — used by Echo for /broadcasting/auth. */
export const APP_BASE_URL = BASE;

/** Axios instance for all /api/v1/* calls. */
export const api: AxiosInstance = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: {
    Accept: "application/json",
    "Accept-Language": "ar",
    "Content-Type": "application/json",
  },
});

// ─── Request: attach bearer token + idempotency key for mutations ───────────
const SAFE_METHODS = new Set(["get", "head", "options"]);

function generateIdempotencyKey(): string {
  // crypto.randomUUID is widely supported in modern browsers (Vite targets es2022)
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Fallback (non-cryptographic but unique enough for idempotency)
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

api.interceptors.request.use((config) => {
  const t = getTokens();
  if (t?.accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${t.accessToken}`;
  }

  // Auto-attach Idempotency-Key on mutations unless the caller already set one.
  const method = (config.method ?? "get").toLowerCase();
  if (!SAFE_METHODS.has(method) && config.headers) {
    if (!config.headers["Idempotency-Key"] && !config.headers["idempotency-key"]) {
      config.headers["Idempotency-Key"] = generateIdempotencyKey();
    }
  }
  return config;
});

/** Manually attach an Idempotency-Key (overrides the auto-generated one). */
export function withIdempotencyKey(key: string): { headers: { "Idempotency-Key": string } } {
  return { headers: { "Idempotency-Key": key } };
}

// ─── Response: 401 → refresh-once → retry; normalize errors ──────────────────
let refreshing: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const t = getTokens();
  if (!t?.refreshToken) return null;
  try {
    const res = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${BASE}/api/v1/auth/refresh`,
      { refreshToken: t.refreshToken },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );
    setTokens({
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
    });
    return res.data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { __retried?: boolean };

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<ApiErrorBody>) => {
    const cfg = err.config as RetriableConfig | undefined;
    const status = err.response?.status;
    const body = err.response?.data;
    const url = cfg?.url ?? "";

    if (
      status === 401 &&
      cfg &&
      !cfg.__retried &&
      !url.includes("/auth/refresh") &&
      !url.includes("/auth/login")
    ) {
      cfg.__retried = true;
      refreshing ??= performRefresh();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        if (cfg.headers) cfg.headers.Authorization = `Bearer ${newToken}`;
        return api(cfg);
      }
      // Refresh failed — broadcast a logout so AuthContext clears state and routes to /login.
      window.dispatchEvent(new CustomEvent("asab:auth:logout"));
    }

    if (body && typeof body === "object" && "error" in body) {
      throw new ApiError(body as ApiErrorBody, status ?? 0);
    }

    // No structured body — network or non-JSON response.
    throw new ApiError(
      {
        error: {
          code: "NETWORK_ERROR",
          message: err.message,
          messageAr: "تعذر الاتصال بالخادم",
        },
      },
      status ?? 0,
    );
  },
);

/** List-envelope shape used by every list endpoint. */
export interface Page<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Download a file from an authenticated endpoint via blob + virtual click. */
export async function downloadBlob(
  url: string,
  filename: string,
  params?: object,
): Promise<void> {
  const res = await api.get(url, { params, responseType: "blob" });
  const blob = res.data as Blob;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
