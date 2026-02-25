/**
 * studentService.ts — Student-scoped API calls
 * ──────────────────────────────────────────────
 * All endpoints require a valid Firebase ID-token with role="student".
 * The server derives the student's UID from the token — never pass userId
 * in the request body.
 *
 * Endpoints:
 *   GET  /api/student/profile      — read own profile
 *   PUT  /api/student/profile      — partial update (merge=true on server)
 *   POST /api/student/analyze      — run GitHub + LeetCode pipeline
 */

import { apiRequest } from "@/services/apiClient";
import { AnalyticsData, UserProfile } from "@/models/types";

// ── Request / Response shapes ─────────────────────────────────────────────────

export interface StudentProfileUpdate {
  githubUsername?: string;
  leetcodeUsername?: string;
  cgpa?: number;
  batch?: string;
  branch?: string;
  name?: string;
}

export interface StudentAnalyzePayload {
  githubUsername: string;
  leetcodeUsername: string;
  cgpa: number;
  batch: string;    // "YYYY-YYYY"
  branch: string;
}

export interface StudentAnalyzeResponse {
  grade: string;
  score: number;
  analytics: AnalyticsData;
}

// ── Service ────────────────────────────────────────────────────────────────────

export const studentService = {
  /** GET /api/student/profile */
  async getProfile(): Promise<UserProfile> {
    return apiRequest<UserProfile>("/student/profile");
  },

  /** GET /api/student/analytics — restore stored deep stats on page load */
  async getAnalytics(): Promise<AnalyticsData> {
    return apiRequest<AnalyticsData>("/student/analytics");
  },

  /** PUT /api/student/profile — partial update */
  async updateProfile(update: StudentProfileUpdate): Promise<UserProfile> {
    return apiRequest<UserProfile>("/student/profile", {
      method: "PUT",
      body: JSON.stringify(update),
    });
  },

  /**
   * POST /api/student/analyze
   * Fetches fresh GitHub + LeetCode data, recalculates the score,
   * writes analytics to Firestore, and returns the results.
   *
   * Timeout is 90 s because LeetCode detail fetches are throttled
   * (3 concurrent, 150–500 ms jitter per batch → ~20–40 s expected).
   */
  async analyze(payload: StudentAnalyzePayload): Promise<StudentAnalyzeResponse> {
    return apiRequest<StudentAnalyzeResponse>(
      "/student/analyze",
      { method: "POST", body: JSON.stringify(payload) },
      90_000,   // 90 second timeout
    );
  },
};
