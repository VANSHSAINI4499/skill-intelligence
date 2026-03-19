import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional


class AnalyzeStudentRequest(BaseModel):
    userId:           str
    githubUsername:   str
    leetcodeUsername: str
    cgpa:             float
    batch:            str            # "YYYY-YYYY" (required)
    branch:           Optional[str] = None

    # semester kept as optional for backwards-compat with any existing clients
    semester: Optional[int] = None

    @field_validator("batch")
    @classmethod
    def validate_batch(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{4}$", v):
            raise ValueError("batch must be in format YYYY-YYYY (e.g. 2023-2027)")
        start, end = int(v[:4]), int(v[5:])
        if end - start != 4:
            raise ValueError("batch end year must equal start year + 4")
        return v


class TopRepository(BaseModel):
    name: str
    stars: int
    html_url: str
    language: Optional[str] = None


class GitHubStats(BaseModel):
    totalRepos: int = 0
    totalStars: int = 0
    languageDistribution: dict[str, int] = Field(default_factory=dict)
    topRepositories: list[TopRepository] = Field(default_factory=list)


# ── LeetCode deep analytics models ───────────────────────────────────────────

class RecentSubmission(BaseModel):
    title: str
    titleSlug: str
    timestamp: int
    lang: str
    difficulty: str = ""
    topicTags: list[str] = Field(default_factory=list)


class LeetCodeDifficulty(BaseModel):
    easy: int = 0
    medium: int = 0
    hard: int = 0


class LeetCodeDeepStats(BaseModel):
    totalSolved: int = 0
    difficulty: LeetCodeDifficulty = Field(default_factory=LeetCodeDifficulty)
    languageStats: dict[str, int] = Field(default_factory=dict)
    topicTags: dict[str, int] = Field(default_factory=dict)
    recentSubmissions: list[RecentSubmission] = Field(default_factory=list)


class LeetCodeStats(BaseModel):
    easy: int = 0
    medium: int = 0
    hard: int = 0
    deep: LeetCodeDeepStats = Field(default_factory=LeetCodeDeepStats)


class AnalyticsData(BaseModel):
    github_totalRepos: int = 0
    github_totalStars: int = 0
    github_languageDistribution: dict[str, int] = Field(default_factory=dict)
    topRepositories: list[TopRepository] = Field(default_factory=list)
    leetcode_easy: int = 0
    leetcode_medium: int = 0
    leetcode_hard: int = 0
    leetcode: LeetCodeDeepStats = Field(default_factory=LeetCodeDeepStats)


class AnalyzeStudentResponse(BaseModel):
    grade: str
    score: float
    analytics: AnalyticsData


class FilteredStudent(BaseModel):
    uid:              str
    name:             Optional[str]   = None
    email:            Optional[str]   = None
    grade:            Optional[str]   = None
    score:            Optional[float] = None
    githubUsername:   Optional[str]   = None
    leetcodeUsername: Optional[str]   = None
    githubRepoCount:  Optional[int]   = 0
    leetcodeHardCount:Optional[int]   = 0
    batch:            Optional[str]   = None   # "YYYY-YYYY"
    branch:           Optional[str]   = None
    cgpa:             Optional[float] = None
    isActive:         Optional[bool]  = True
    role:             Optional[str]   = "student"


class GapAnalysisResponse(BaseModel):
    studentScore:      float
    group:             str
    groupAverage:      float
    batchAverage:      float
    groupGap:          float
    batchGap:          float
    groupStudentCount: int
    batchStudentCount: int
