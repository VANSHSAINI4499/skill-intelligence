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
  leetcodeHardCount?: number;
  createdAt: any; // Timestamp
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
