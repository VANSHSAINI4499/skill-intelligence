import {
  AnalyzeStudentPayload,
  AnalyzeStudentResponse,
  FilterStudentsParams,
  UserProfile,
} from "@/models/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export const apiService = {
  /** POST /api/analyze-student — runs the full ranking pipeline */
  async analyzeStudent(payload: AnalyzeStudentPayload): Promise<AnalyzeStudentResponse> {
    return apiFetch<AnalyzeStudentResponse>("/analyze-student", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** GET /api/filter-students — admin student table */
  async filterStudents(params: FilterStudentsParams): Promise<UserProfile[]> {
    const qs = new URLSearchParams();
    if (params.grade && params.grade !== "All") qs.set("grade", params.grade);
    if (params.minRepos) qs.set("minRepos", String(params.minRepos));
    if (params.minHard)  qs.set("minHard",  String(params.minHard));
    return apiFetch<UserProfile[]>(`/filter-students?${qs.toString()}`);
  },
};
