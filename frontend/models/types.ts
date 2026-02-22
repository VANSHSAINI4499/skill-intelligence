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

export interface AnalyticsData {
  github_totalRepos: number;
  github_totalStars: number;
  leetcode_easy: number;
  leetcode_medium: number;
  leetcode_hard: number;
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
