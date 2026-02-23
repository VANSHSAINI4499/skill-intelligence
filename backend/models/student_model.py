from pydantic import BaseModel, Field
from typing import Optional


class AnalyzeStudentRequest(BaseModel):
    userId: str
    githubUsername: str
    leetcodeUsername: str
    cgpa: float
    semester: int


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


class LeetCodeStats(BaseModel):
    easy: int = 0
    medium: int = 0
    hard: int = 0


class AnalyticsData(BaseModel):
    github_totalRepos: int = 0
    github_totalStars: int = 0
    github_languageDistribution: dict[str, int] = Field(default_factory=dict)
    topRepositories: list[TopRepository] = Field(default_factory=list)
    leetcode_easy: int = 0
    leetcode_medium: int = 0
    leetcode_hard: int = 0


class AnalyzeStudentResponse(BaseModel):
    grade: str
    score: float
    analytics: AnalyticsData


class FilteredStudent(BaseModel):
    uid: str
    name: Optional[str] = None
    email: Optional[str] = None
    grade: Optional[str] = None
    score: Optional[float] = None
    githubUsername: Optional[str] = None
    leetcodeUsername: Optional[str] = None
    githubRepoCount: Optional[int] = 0
    leetcodeHardCount: Optional[int] = 0
    semester: Optional[int] = None
    cgpa: Optional[float] = None
