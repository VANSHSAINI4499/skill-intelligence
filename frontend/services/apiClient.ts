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

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await auth.currentUser?.getIdToken(/* forceRefresh */ false);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let detail: string;
    try {
      const body = await res.json();
      detail = body?.detail ?? JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => res.statusText);
    }
    throw new ApiError(res.status, detail);
  }

  // 204 No Content — return undefined without calling .json()
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

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
