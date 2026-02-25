/**
 * apiClient.ts — Shared HTTP client
 * ───────────────────────────────────
 * - Automatically attaches the Firebase ID-token as `Authorization: Bearer …`
 * - Throws ApiError (with HTTP status) for non-2xx responses
 * - Re-export `buildQS` helper used by every service
 *
 * Usage:
 *   import { apiRequest, buildQS } from "@/services/apiClient";
 */

import { auth } from "@/lib/firebase";

export const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000/api";

// ── Error type ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

/**
 * @param timeoutMs  Abort after this many ms. Default 30 000 (30 s).
 *                   Pass 0 to disable. Use 90 000 for slow endpoints like /analyze.
 */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 30_000,
): Promise<T> {
  const token = await auth.currentUser?.getIdToken(/* forceRefresh */ false);

  // AbortController so long requests don't hang the UI forever
  const controller = new AbortController();
  const timer = timeoutMs > 0
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch (err: unknown) {
    if (timer) clearTimeout(timer);
    // AbortError → user-friendly timeout message
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(408, `Request timed out after ${timeoutMs / 1000}s. The backend may be processing — try again in a moment.`);
    }
    // Network error (backend down, no internet, etc.)
    throw new ApiError(0, "Cannot reach the server. Check that the backend is running on port 5000.");
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!res.ok) {
    let detail: string;
    try {
      const body = await res.json();
      // FastAPI may return { detail: string } or { detail: [{msg, loc, type}] }
      if (typeof body?.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body?.detail)) {
        detail = body.detail.map((e: {msg?: string}) => e.msg ?? JSON.stringify(e)).join("; ");
      } else {
        detail = JSON.stringify(body);
      }
    } catch {
      detail = await res.text().catch(() => res.statusText);
    }
    // Attach HTTP status code to message for clarity
    const label = HTTP_LABELS[res.status] ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, `${label}: ${detail}`);
  }

  // 204 No Content — return undefined without calling .json()
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// Friendly labels for common HTTP status codes
const HTTP_LABELS: Record<number, string> = {
  400: "Bad request",
  401: "Unauthorized — please log in again",
  403: "Forbidden",
  404: "Not found",
  408: "Timeout",
  422: "Validation error",
  429: "Rate limited — too many requests",
  500: "Server error",
  502: "Backend unreachable",
  503: "Backend unavailable",
};

// ── Query-string builder ──────────────────────────────────────────────────────

/**
 * Converts a plain object to `?key=value&…`.
 * Skips keys whose values are `undefined`, `null`, `""`, or `false`.
 */
export function buildQS(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== false) {
      qs.set(k, String(v));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}
