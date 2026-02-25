/**
 * authService.ts — Registration endpoints
 * ─────────────────────────────────────────
 * POST /api/auth/admin-register    — create a new university + admin account
 * POST /api/auth/student-register  — create a student account
 *
 * ⚠️  After calling either method the client MUST refresh the Firebase token
 *     so the new custom claims (universityId + role) are available:
 *
 *       await auth.currentUser?.getIdToken(true);
 */

import { apiRequest } from "@/services/apiClient";

// ── Request / Response shapes ─────────────────────────────────────────────────

export interface AdminRegisterRequest {
  email: string;
  password: string;
  adminName: string;       // maps to backend AdminRegisterRequest.adminName
  universityName: string;
}

export interface AdminRegisterResponse {
  universityId: string;  // UUID — share this with students
  adminId: string;
  message: string;
}

export interface StudentRegisterRequest {
  email: string;
  password: string;
  name: string;
  universityId: string;    // required — the UUID returned from admin-register
  batch: string;           // "YYYY-YYYY"
  branch: string;
  cgpa: number;
}

export interface StudentRegisterResponse {
  uid: string;
  universityId: string;
  email: string;
  name: string;
  role: "student";
  batch: string;
  message: string;
}

// ── Service ────────────────────────────────────────────────────────────────────

export const authService = {
  async registerAdmin(
    payload: AdminRegisterRequest,
  ): Promise<AdminRegisterResponse> {
    return apiRequest<AdminRegisterResponse>("/auth/admin-register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async registerStudent(
    payload: StudentRegisterRequest,
  ): Promise<StudentRegisterResponse> {
    return apiRequest<StudentRegisterResponse>("/auth/student-register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
