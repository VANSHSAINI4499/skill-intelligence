// ── AI Chat type definitions ─────────────────────────────────────────────────

export type AiMode = "gap_analysis" | "upgrade_plan" | "interview";

export interface ChatRequest {
  mode: AiMode;
  message: string;
}

export interface GapReport {
  studentId:            string;
  batch:                string;
  studentScore:         number;
  batchAvgScore:        number;
  overallGap:           number;
  percentileEstimate:   number;
  studentGrade:         string;
  weakSkills:           string[];
  strongSkills:         string[];
  recommendationLevel:  "Low" | "Medium" | "High";
  batchSize:            number;
}

export interface ChatResponse {
  mode:       AiMode;
  reply:      string;
  gapReport?: GapReport;
}

// ── Local chat message (stored in component state only) ──────────────────────

export type MessageRole = "user" | "ai";

export interface ChatMessage {
  id:         string;
  role:       MessageRole;
  content:    string;
  mode:       AiMode;
  gapReport?: GapReport;
  timestamp:  Date;
}
