/**
 * adminService.ts — Admin REST API calls
 * ────────────────────────────────────────
 * All endpoints require role="admin" custom claim in the Firebase token.
 *
 * Endpoints (all prefixed with /api/admin):
 *   GET    /students                      — list / filter students
 *   GET    /students/{id}                 — single student detail
 *   GET    /batch-analytics/{batch}       — batch KPIs
 *   GET    /algorithm-config              — read weights
 *   PUT    /algorithm-config              — update weights
 *   GET    /company-requirements          — list
 *   POST   /company-requirements          — create
 *   PATCH  /company-requirements/{id}     — update / soft-delete
 *   POST   /shortlists                    — generate shortlist
 *   GET    /shortlists                    — list
 *   GET    /shortlists/{id}               — single shortlist
 */

import { apiRequest, buildQS } from "@/services/apiClient";
import {
  AdminFilterParams,
  AlgorithmConfigResponse,
  AlgorithmWeights,
  BatchAnalytics,
  CompanyRequirement,
  CreateCompanyRequirementPayload,
  FilterStudentsResponse,
  GenerateShortlistPayload,
  PatchCompanyRequirementPayload,
  ShortlistResult,
} from "@/models/types";

// ── Service ────────────────────────────────────────────────────────────────────

export const adminService = {
  // ─── Students ────────────────────────────────────────────────────────────────

  /** GET /admin/students — list / filter */
  async getStudents(params: AdminFilterParams = {}): Promise<FilterStudentsResponse> {
    const qs = buildQS(params as Record<string, unknown>);
    return apiRequest<FilterStudentsResponse>(`/admin/students${qs}`);
  },

  /** GET /admin/students/{id} */
  async getStudent(studentId: string): Promise<Record<string, unknown>> {
    return apiRequest<Record<string, unknown>>(`/admin/students/${studentId}`);
  },

  // ─── Batch Analytics ──────────────────────────────────────────────────────────

  /** GET /admin/batch-analytics/{batch} */
  async getBatchAnalytics(batch: string): Promise<BatchAnalytics> {
    return apiRequest<BatchAnalytics>(`/admin/batch-analytics/${encodeURIComponent(batch)}`);
  },

  // ─── Algorithm Config ─────────────────────────────────────────────────────────

  /** GET /admin/algorithm-config */
  async getAlgorithmConfig(): Promise<AlgorithmConfigResponse> {
    return apiRequest<AlgorithmConfigResponse>("/admin/algorithm-config");
  },

  /** PUT /admin/algorithm-config */
  async updateAlgorithmConfig(weights: AlgorithmWeights): Promise<AlgorithmConfigResponse> {
    return apiRequest<AlgorithmConfigResponse>("/admin/algorithm-config", {
      method: "PUT",
      body: JSON.stringify({ weights }),
    });
  },

  // ─── Company Requirements ─────────────────────────────────────────────────────

  /** GET /admin/company-requirements */
  async getCompanyRequirements(includeAll = false): Promise<CompanyRequirement[]> {
    const qs = includeAll ? "?include_all=true" : "";
    return apiRequest<CompanyRequirement[]>(`/admin/company-requirements${qs}`);
  },

  /** POST /admin/company-requirements */
  async createCompanyRequirement(
    payload: CreateCompanyRequirementPayload,
  ): Promise<CompanyRequirement> {
    return apiRequest<CompanyRequirement>("/admin/company-requirements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * PATCH /admin/company-requirements/{id}
   * Pass `{ isActive: false }` to soft-delete.
   */
  async updateCompanyRequirement(
    companyId: string,
    patch: PatchCompanyRequirementPayload,
  ): Promise<CompanyRequirement> {
    return apiRequest<CompanyRequirement>(
      `/admin/company-requirements/${companyId}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  },

  /** Convenience: soft-delete a company requirement */
  async deactivateCompanyRequirement(companyId: string): Promise<CompanyRequirement> {
    return adminService.updateCompanyRequirement(companyId, { isActive: false });
  },

  // ─── Shortlists ───────────────────────────────────────────────────────────────

  /** POST /admin/shortlists */
  async generateShortlist(payload: GenerateShortlistPayload): Promise<ShortlistResult> {
    return apiRequest<ShortlistResult>("/admin/shortlists", {
      method: "POST",
      body: JSON.stringify({
        companyId: payload.companyId,
        batch:     payload.batch,
        limit:     payload.limit ?? 20,
      }),
    });
  },

  /** GET /admin/shortlists */
  async getShortlists(batch?: string, companyId?: string): Promise<ShortlistResult[]> {
    const qs = buildQS({ batch, company_id: companyId });
    return apiRequest<ShortlistResult[]>(`/admin/shortlists${qs}`);
  },

  /** GET /admin/shortlists/{id} */
  async getShortlist(shortlistId: string): Promise<ShortlistResult> {
    return apiRequest<ShortlistResult>(`/admin/shortlists/${shortlistId}`);
  },
};
