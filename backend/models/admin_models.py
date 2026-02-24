"""
Admin-specific Pydantic models.

Collections managed here:
  algorithm_config/current   — scoring weights controlled by admins
  company_requirements/{id}   — per-company hiring criteria
  shortlists/{id}             — generated candidate shortlists
"""

from typing import Optional
from pydantic import BaseModel, Field


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
    """Represents the algorithm_config/current Firestore document."""
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
    batch:     str        # e.g. "2026"
    topN:      int = 20   # maximum students to include in the shortlist


class RankedStudent(BaseModel):
    """Per-student detail row embedded in a shortlist response."""
    rank:             int
    uid:              str
    name:             Optional[str]  = None
    email:            Optional[str]  = None
    score:            float          = 0.0
    grade:            Optional[str]  = None
    cgpa:             Optional[float]= None
    leetcodeHard:     int            = 0
    githubRepos:      int            = 0
    githubUsername:   Optional[str]  = None
    leetcodeUsername: Optional[str]  = None
    batch:            Optional[str]  = None
    branch:           Optional[str]  = None


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


# ── Advanced filter models ────────────────────────────────────────────────────

class FilteredStudentDetail(BaseModel):
    """Enriched student row returned by GET /admin/filter-students."""
    uid:              str
    name:             Optional[str]   = None
    email:            Optional[str]   = None
    grade:            Optional[str]   = None
    score:            float           = 0.0
    cgpa:             Optional[float] = None
    semester:         Optional[int]   = None
    batch:            Optional[str]   = None
    branch:           Optional[str]   = None
    isActive:         bool            = True
    githubUsername:   Optional[str]   = None
    leetcodeUsername: Optional[str]   = None
    githubRepoCount:  int             = 0
    leetcodeHardCount:int             = 0
    # Analytics-enriched fields (populated when analytics doc exists)
    topLanguage:      Optional[str]   = None   # most-used language from LeetCode submissions
    solvedTopics:     list[str]       = []     # topic tag names the student has solved
    langDistribution: dict[str, int]  = {}     # language → submission count


class FilterStudentsResponse(BaseModel):
    totalStudents:     int                        # students that matched ALL filters
    filteredStudents:  list[FilteredStudentDetail]
    avgScore:          float                      # mean score of matched students
    gradeDistribution: dict[str, int]             # {"A": n, "B": n, "C": n, "D": n}
