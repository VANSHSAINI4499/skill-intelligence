"""
Admin-specific Pydantic models.

Multi-tenant Firestore paths:
  universities/{universityId}
    admins/{adminId}
    students/{studentId}
    analytics/{studentId}
    algorithm_config/current
    company_requirements/{companyId}
    shortlists/{shortlistId}
"""

import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator


# ── University & Registration ─────────────────────────────────────────────────

class AdminRegisterRequest(BaseModel):
    universityName: str
    email:          str
    password:       str
    adminName:      str


class AdminRegisterResponse(BaseModel):
    universityId: str
    adminId:      str
    message:      str


class StudentRegisterRequest(BaseModel):
    universityId: str
    email:        str
    password:     str
    name:         str
    batch:        str    # "YYYY-YYYY"
    branch:       str
    cgpa:         float

    @field_validator("batch")
    @classmethod
    def validate_batch(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{4}$", v):
            raise ValueError("batch must be in format YYYY-YYYY (e.g. 2023-2027)")
        start, end = int(v[:4]), int(v[5:])
        if end - start != 4:
            raise ValueError("batch end year must equal start year + 4")
        return v

    @field_validator("cgpa")
    @classmethod
    def validate_cgpa(cls, v: float) -> float:
        if not (0.0 <= v <= 10.0):
            raise ValueError("cgpa must be between 0.0 and 10.0")
        return v


class StudentRegisterResponse(BaseModel):
    studentId:    str
    universityId: str
    message:      str


# ── Algorithm Config ──────────────────────────────────────────────────────────

class AlgorithmWeights(BaseModel):
    """Scoring weights editable by admins. All values are max-point allocations."""
    leetcode_easy:   float = 5.0
    leetcode_medium: float = 8.0
    leetcode_hard:   float = 12.0
    github_repos:    float = 5.0
    github_stars:    float = 5.0
    cgpa:            float = 10.0

    @property
    def total(self) -> float:
        return (
            self.leetcode_easy + self.leetcode_medium + self.leetcode_hard
            + self.github_repos + self.github_stars + self.cgpa
        )


class AlgorithmConfig(BaseModel):
    """Represents the universities/{id}/algorithm_config/current Firestore document."""
    weights:   AlgorithmWeights = Field(default_factory=AlgorithmWeights)
    updatedBy: Optional[str] = None


class UpdateAlgorithmConfigRequest(BaseModel):
    weights: AlgorithmWeights


class AlgorithmConfigResponse(BaseModel):
    weights:     AlgorithmWeights
    updatedBy:   Optional[str] = None
    lastUpdated: Optional[str] = None


# ── Company Requirements ──────────────────────────────────────────────────────

class CreateCompanyRequirementRequest(BaseModel):
    companyName:        str
    minCGPA:            float = 0.0
    minLeetCodeHard:    int   = 0
    minRepos:           int   = 0
    requiredTopics:     list[str] = Field(default_factory=list)
    preferredLanguages: list[str] = Field(default_factory=list)


class CompanyRequirementResponse(BaseModel):
    companyId:          str
    companyName:        str
    minCGPA:            float
    minLeetCodeHard:    int
    minRepos:           int
    requiredTopics:     list[str]
    preferredLanguages: list[str]
    createdAt:          Optional[str] = None


# ── Shortlists ────────────────────────────────────────────────────────────────

class GenerateShortlistRequest(BaseModel):
    companyId: str
    batch:     str        # "YYYY-YYYY"
    topN:      int = 20

    @field_validator("batch")
    @classmethod
    def validate_batch(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{4}$", v):
            raise ValueError("batch must be in format YYYY-YYYY (e.g. 2023-2027)")
        start, end = int(v[:4]), int(v[5:])
        if end - start != 4:
            raise ValueError("batch end year must equal start year + 4")
        return v


class RankedStudent(BaseModel):
    """Per-student detail row embedded in a shortlist response."""
    rank:             int
    uid:              str
    name:             Optional[str]   = None
    email:            Optional[str]   = None
    score:            float           = 0.0
    grade:            Optional[str]   = None
    cgpa:             Optional[float] = None
    leetcodeHard:     int             = 0
    githubRepos:      int             = 0
    githubUsername:   Optional[str]   = None
    leetcodeUsername: Optional[str]   = None
    batch:            Optional[str]   = None
    branch:           Optional[str]   = None


class ShortlistResponse(BaseModel):
    shortlistId:      str
    companyId:        str
    companyName:      Optional[str]       = None
    batch:            str
    generatedBy:      str
    selectedStudents: list[str]           = []
    rankedStudents:   list[RankedStudent] = []
    totalCandidates:  int                 = 0
    createdAt:        Optional[str]       = None


# ── Advanced Filter Models ────────────────────────────────────────────────────

class FilteredStudentDetail(BaseModel):
    """Enriched student row returned by GET /admin/filter-students."""
    uid:               str
    name:              Optional[str]   = None
    email:             Optional[str]   = None
    grade:             Optional[str]   = None
    score:             float           = 0.0
    cgpa:              Optional[float] = None
    batch:             Optional[str]   = None
    branch:            Optional[str]   = None
    isActive:          bool            = True
    githubUsername:    Optional[str]   = None
    leetcodeUsername:  Optional[str]   = None
    githubRepoCount:   int             = 0
    leetcodeHardCount: int             = 0
    topLanguage:       Optional[str]   = None
    solvedTopics:      list[str]       = []
    langDistribution:  dict[str, int]  = {}


class FilterStudentsResponse(BaseModel):
    totalStudents:     int
    filteredStudents:  list[FilteredStudentDetail]
    avgScore:          float
    gradeDistribution: dict[str, int]


# ── Batch Analytics ───────────────────────────────────────────────────────────

class BatchTopPerformer(BaseModel):
    uid:   str
    name:  Optional[str]   = None
    email: Optional[str]   = None
    score: float           = 0.0
    grade: Optional[str]   = None
    cgpa:  Optional[float] = None
    batch: Optional[str]   = None


class BatchAnalyticsResponse(BaseModel):
    batch:             str
    totalStudents:     int
    avgScore:          float
    avgCGPA:           float
    gradeDistribution: dict[str, int]
    topPerformers:     list[BatchTopPerformer]   # top 5
