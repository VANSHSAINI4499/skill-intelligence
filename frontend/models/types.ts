/**
 * types.ts — Shared TypeScript interfaces for the Skill Intelligence Platform
 * ─────────────────────────────────────────────────────────────────────────────
 * Keep in sync with the FastAPI Pydantic models in backend/models/.
 */

// ─── Core user ────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: "student" | "admin";
  batch?: string | null;           // "YYYY-YYYY"
  branch?: string | null;
  cgpa?: number | null;
  githubUsername?: string;
  leetcodeUsername?: string;
  grade?: string;
  score?: number;
  githubRepoCount?: number;
  githubStarCount?: number;
  leetcodeEasyCount?: number;
  leetcodeMediumCount?: number;
  leetcodeHardCount?: number;
  isActive?: boolean;
  updatedAt?: unknown;
  createdAt?: unknown;
}

/** Merged dashboard view — profile + live analytics */
export interface DashboardData extends UserProfile {
  analytics?: AnalyticsData;
}

// ─── Analytics data (returned from /student/analyze) ─────────────────────────

export interface TopRepository {
  name: string;
  stars: number;
  html_url: string;
  language: string | null;
}

export interface RecentSubmission {
  title: string;
  titleSlug: string;
  timestamp: number;
  lang: string;
  difficulty: string;
  topicTags: string[];
}

export interface LeetCodeDifficulty {
  easy: number;
  medium: number;
  hard: number;
}

export interface LeetCodeDeepStats {
  totalSolved: number;
  difficulty: LeetCodeDifficulty;
  languageStats: Record<string, number>;
  topicTags: Record<string, number>;
  recentSubmissions: RecentSubmission[];
}

export interface AnalyticsData {
  github_totalRepos: number;
  github_totalStars: number;
  github_languageDistribution: Record<string, number>;
  topRepositories: TopRepository[];
  leetcode_easy: number;
  leetcode_medium: number;
  leetcode_hard: number;
  leetcode?: LeetCodeDeepStats;
}

export interface AnalyzeStudentResponse {
  grade: string;
  score: number;
  analytics: AnalyticsData;
}

// ─── Student analyze payload (POST /student/analyze) ─────────────────────────

export interface AnalyzeStudentPayload {
  githubUsername: string;
  leetcodeUsername: string;
  cgpa: number;
  batch: string;    // "YYYY-YYYY"
  branch: string;
}

// ─── Admin filter params (GET /admin/students) ────────────────────────────────

export interface AdminFilterParams {
  batch?: string;
  branch?: string;
  grade?: string;
  activeOnly?: boolean;
  sortBy?: "score" | "name" | "cgpa";
  order?: "asc" | "desc";
  minScore?: number;
  maxScore?: number;
  minCgpa?: number;
  minHard?: number;
  minRepos?: number;
}

// ─── Student list (GET /admin/students) ──────────────────────────────────────

export interface FilteredStudentDetail {
  uid: string;
  name?: string;
  email?: string;
  grade?: string;
  score: number;
  cgpa?: number;
  batch?: string;
  branch?: string;
  isActive: boolean;
  githubUsername?: string;
  leetcodeUsername?: string;
  githubRepoCount: number;
  leetcodeHardCount: number;
}

export interface FilterStudentsResponse {
  totalStudents: number;
  filteredStudents: FilteredStudentDetail[];
  avgScore: number;
  gradeDistribution: Record<string, number>;
}

// ─── Batch analytics (GET /admin/batch-analytics/{batch}) ────────────────────

export interface BatchTopPerformer {
  uid: string;
  name?: string;
  email?: string;
  score: number;
  grade?: string;
  cgpa?: number;
  batch?: string;
}

export interface BatchAnalytics {
  batch: string;
  totalStudents: number;
  avgScore: number;
  avgCGPA: number;
  gradeDistribution: Record<string, number>;
  topPerformers: BatchTopPerformer[];
}

// ─── Algorithm config (GET/PUT /admin/algorithm-config) ──────────────────────

export interface AlgorithmWeights {
  leetcode_easy: number;
  leetcode_medium: number;
  leetcode_hard: number;
  github_repos: number;
  github_stars: number;
  cgpa: number;
}

export interface AlgorithmConfigResponse {
  weights: AlgorithmWeights;
  updatedAt?: string;
  updatedBy?: string;
}

// ─── Company requirements ─────────────────────────────────────────────────────

export interface CreateCompanyRequirementPayload {
  companyName: string;
  minCGPA?: number;
  minLeetCodeHard?: number;
  minRepos?: number;
  requiredTopics?: string[];
  preferredLanguages?: string[];
}

export interface PatchCompanyRequirementPayload {
  companyName?: string;
  minCGPA?: number;
  minLeetCodeHard?: number;
  minRepos?: number;
  requiredTopics?: string[];
  preferredLanguages?: string[];
  isActive?: boolean;
}

export interface CompanyRequirement {
  companyId: string;
  companyName: string;
  minCGPA?: number;
  minLeetCodeHard?: number;
  minRepos?: number;
  requiredTopics: string[];
  preferredLanguages: string[];
  createdAt?: string;
}

// ─── Shortlists ───────────────────────────────────────────────────────────────

/** POST /admin/shortlists request body */
export interface GenerateShortlistPayload {
  companyId: string;
  batch: string;
  limit?: number;    // default 20
}

export interface RankedStudent {
  rank: number;
  uid: string;
  name?: string;
  email?: string;
  score: number;
  grade?: string;
  cgpa?: number;
  leetcodeHard: number;
  githubRepos: number;
  githubUsername?: string;
  leetcodeUsername?: string;
  batch?: string;
  branch?: string;
}

export interface ShortlistResult {
  shortlistId: string;
  companyId: string;
  companyName?: string;
  batch: string;
  generatedBy: string;
  selectedStudents: string[];
  rankedStudents: RankedStudent[];
  totalCandidates: number;
  createdAt?: string;
}

// ─── FilterStudentsParams — legacy alias ──────────────────────────────────────
/** @deprecated Use AdminFilterParams */
export type FilterStudentsParams = AdminFilterParams;
