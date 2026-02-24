/**
 * Admin API Service
 * All requests include a Firebase ID-token in the Authorization header.
 * No Firestore access — all data flows through the FastAPI backend.
 */

import { auth } from "@/lib/firebase";
import {
  AdminFilterParams,
  AlgorithmConfigResponse,
  AlgorithmWeights,
  CompanyRequirement,
  CreateCompanyRequirementPayload,
  FilterStudentsResponse,
  GenerateShortlistPayload,
  ShortlistResult,
} from "@/models/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000/api";

export class AdminApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AdminApiError";
  }
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await auth.currentUser?.getIdToken(/* forceRefresh */ false);
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new AdminApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQS(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== false) {
      qs.set(k, String(v));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// ─── Students ─────────────────────────────────────────────────────────────────

export const adminApiService = {
  async filterStudents(params: AdminFilterParams): Promise<FilterStudentsResponse> {
    const qs = buildQS(params as Record<string, unknown>);
    return adminFetch<FilterStudentsResponse>(`/admin/filter-students${qs}`);
  },

  // ─── Algorithm Config ────────────────────────────────────────────────────────

  async getAlgorithmConfig(): Promise<AlgorithmConfigResponse> {
    return adminFetch<AlgorithmConfigResponse>("/admin/algorithm-config");
  },

  async updateAlgorithmConfig(
    weights: AlgorithmWeights
  ): Promise<AlgorithmConfigResponse> {
    return adminFetch<AlgorithmConfigResponse>("/admin/update-algorithm", {
      method: "PUT",
      body: JSON.stringify({ weights }),
    });
  },

  // ─── Company Requirements ────────────────────────────────────────────────────

  async getCompanyRequirements(): Promise<CompanyRequirement[]> {
    return adminFetch<CompanyRequirement[]>("/admin/company-requirements");
  },

  async createCompanyRequirement(
    payload: CreateCompanyRequirementPayload
  ): Promise<CompanyRequirement> {
    return adminFetch<CompanyRequirement>("/admin/company-requirements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteCompanyRequirement(companyId: string): Promise<void> {
    await adminFetch<void>(`/admin/company-requirements/${companyId}`, {
      method: "DELETE",
    });
  },

  // ─── Shortlists ───────────────────────────────────────────────────────────────

  async generateShortlist(
    payload: GenerateShortlistPayload
  ): Promise<ShortlistResult> {
    return adminFetch<ShortlistResult>("/admin/generate-shortlist", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getShortlists(): Promise<ShortlistResult[]> {
    return adminFetch<ShortlistResult[]>("/admin/shortlists");
  },
};
