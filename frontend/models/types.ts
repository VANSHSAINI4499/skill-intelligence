export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  semester?: number | null;
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
  updatedAt?: any;
  createdAt: any; // Timestamp
}

// Merged dashboard view — profile + live analytics
export interface DashboardData extends UserProfile {
  analytics?: AnalyticsData;
}

export interface StudentAnalytics {
  leetcodeDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  languageDistribution: {
    [key: string]: number;
  };
}

// ── FastAPI backend types ────────────────────────────────────────────────────

export interface AnalyzeStudentPayload {
  userId: string;
  githubUsername: string;
  leetcodeUsername: string;
  cgpa: number;
  semester: number;
}

export interface TopRepository {
  name: string;
  stars: number;
  html_url: string;
  language: string | null;
}

// ── LeetCode deep analytics ──────────────────────────────────────────────────

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
  // flat legacy fields
  leetcode_easy: number;
  leetcode_medium: number;
  leetcode_hard: number;
  // deep analytics block
  leetcode?: LeetCodeDeepStats;
}

export interface AnalyzeStudentResponse {
  grade: string;
  score: number;
  analytics: AnalyticsData;
}

export interface FilterStudentsParams {
  grade?: string;
  minRepos?: number;
  minHard?: number;
}

// ── Admin types ───────────────────────────────────────────────────────────────

export interface FilteredStudentDetail {
  uid: string;
  name?: string;
  email?: string;
  grade?: string;
  score: number;
  cgpa?: number;
  semester?: number;
  batch?: string;
  branch?: string;
  isActive: boolean;
  githubUsername?: string;
  leetcodeUsername?: string;
  githubRepoCount: number;
  leetcodeHardCount: number;
  topLanguage?: string;
  solvedTopics: string[];
  langDistribution: Record<string, number>;
}

export interface FilterStudentsResponse {
  totalStudents: number;
  filteredStudents: FilteredStudentDetail[];
  avgScore: number;
  gradeDistribution: Record<string, number>;
}

export interface AdminFilterParams {
  batch?: string;
  branch?: string;
  grade?: string;
  activeOnly?: boolean;
  minScore?: number;
  maxScore?: number;
  minCgpa?: number;
  minHard?: number;
  minRepos?: number;
  language?: string;
  topicTag?: string;
}

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

export interface CreateCompanyRequirementPayload {
  companyName: string;
  minCgpa?: number;
  minHard?: number;
  minRepos?: number;
  requiredTopics?: string[];
  preferredLanguages?: string[];
}

export interface CompanyRequirement {
  id: string;
  companyName: string;
  minCgpa?: number;
  minHard?: number;
  minRepos?: number;
  requiredTopics: string[];
  preferredLanguages: string[];
  createdAt?: string;
}

export interface GenerateShortlistPayload {
  companyId: string;
  batch: string;
  topN?: number;
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
