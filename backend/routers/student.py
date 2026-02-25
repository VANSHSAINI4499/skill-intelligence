"""
Router: /student/*
==================
Student-scoped endpoints. All routes require a valid Firebase ID token
whose custom claims carry { role: "student", universityId: <id> }.

Endpoints
─────────
  GET  /student/profile          — get own Firestore profile
  PUT  /student/profile          — update own Firestore profile fields
  POST /student/analyze          — run full GitHub + LeetCode analysis pipeline
"""

import traceback

from fastapi import APIRouter, Depends, HTTPException
from google.cloud import firestore
from pydantic import BaseModel, Field
from typing import Optional

from config.firebase import db
from core.auth_middleware import CurrentUser, get_current_student
from core.ranking_engine import calculate_grade, calculate_score, load_weights
from models.student_model import AnalyzeStudentRequest, AnalyzeStudentResponse, AnalyticsData
from services.github_service import fetch_github_stats
from services.leetcode_service import fetch_leetcode_stats

router = APIRouter(prefix="/student", tags=["Student"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _student_ref(university_id: str, student_id: str):
    return (
        db.collection("universities")
        .document(university_id)
        .collection("students")
        .document(student_id)
    )

def _analytics_ref(university_id: str, student_id: str):
    return (
        db.collection("universities")
        .document(university_id)
        .collection("analytics")
        .document(student_id)
    )


# ── Models ────────────────────────────────────────────────────────────────────

class UpdateProfileRequest(BaseModel):
    name:             Optional[str]   = None
    cgpa:             Optional[float] = None
    batch:            Optional[str]   = None
    branch:           Optional[str]   = None
    githubUsername:   Optional[str]   = None
    leetcodeUsername: Optional[str]   = None


class StudentProfileResponse(BaseModel):
    uid:              str
    name:             Optional[str]   = None
    email:            Optional[str]   = None
    role:             str             = "student"
    batch:            Optional[str]   = None
    branch:           Optional[str]   = None
    cgpa:             Optional[float] = None
    githubUsername:   Optional[str]   = None
    leetcodeUsername: Optional[str]   = None
    grade:            Optional[str]   = None
    score:            Optional[float] = None
    githubRepoCount:  int             = 0
    leetcodeHardCount:int             = 0
    isActive:         bool            = True
    universityId:     Optional[str]   = None
    universityName:   Optional[str]   = None  # fetched from universities doc


# ─────────────────────────────────────────────────────────────────────────────
# GET /student/profile
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/profile",
    response_model=StudentProfileResponse,
    summary="Get own student profile",
)
async def get_profile(
    user: CurrentUser = Depends(get_current_student),
) -> StudentProfileResponse:
    doc = _student_ref(user.university_id, user.uid).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Student profile not found")

    data = doc.to_dict()

    # Fetch university name from the parent university doc
    uni_doc = db.collection("universities").document(user.university_id).get()
    university_name = uni_doc.to_dict().get("name") if uni_doc.exists else None

    return StudentProfileResponse(
        uid              = user.uid,
        universityId     = user.university_id,
        universityName   = university_name,
        name             = data.get("name"),
        email            = data.get("email"),
        role             = data.get("role", "student"),
        batch            = data.get("batch"),
        branch           = data.get("branch"),
        cgpa             = data.get("cgpa"),
        githubUsername   = data.get("githubUsername"),
        leetcodeUsername = data.get("leetcodeUsername"),
        grade            = data.get("grade"),
        score            = data.get("score"),
        githubRepoCount  = int(data.get("githubRepoCount",   0)),
        leetcodeHardCount= int(data.get("leetcodeHardCount", 0)),
        isActive         = bool(data.get("isActive", True)),
    )


# ─────────────────────────────────────────────────────────────────────────────
# PUT /student/profile
# ─────────────────────────────────────────────────────────────────────────────

@router.put(
    "/profile",
    response_model=StudentProfileResponse,
    summary="Update own student profile fields",
)
async def update_profile(
    body: UpdateProfileRequest,
    user: CurrentUser = Depends(get_current_student),
) -> StudentProfileResponse:
    update_data = {
        k: v for k, v in body.model_dump().items() if v is not None
    }
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updatedAt"] = firestore.SERVER_TIMESTAMP
    ref = _student_ref(user.university_id, user.uid)
    ref.set(update_data, merge=True)

    doc = ref.get()
    data = doc.to_dict()
    return StudentProfileResponse(
        uid              = user.uid,
        universityId     = user.university_id,
        name             = data.get("name"),
        email            = data.get("email"),
        role             = data.get("role", "student"),
        batch            = data.get("batch"),
        branch           = data.get("branch"),
        cgpa             = data.get("cgpa"),
        githubUsername   = data.get("githubUsername"),
        leetcodeUsername = data.get("leetcodeUsername"),
        grade            = data.get("grade"),
        score            = data.get("score"),
        githubRepoCount  = int(data.get("githubRepoCount",   0)),
        leetcodeHardCount= int(data.get("leetcodeHardCount", 0)),
        isActive         = bool(data.get("isActive", True)),
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /student/analyze
# ─────────────────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    githubUsername:   str
    leetcodeUsername: str
    cgpa:             float
    batch:            str
    branch:           Optional[str] = None


@router.post(
    "/analyze",
    response_model=AnalyzeStudentResponse,
    summary="Run full GitHub + LeetCode analysis for own profile",
)
async def analyze_self(
    body: AnalyzeRequest,
    user: CurrentUser = Depends(get_current_student),
) -> AnalyzeStudentResponse:
    """
    Fetches live GitHub + LeetCode stats, scores the student with the
    university's active algorithm weights, and persists the result.

    Only students can call this endpoint (role='student' claim required).
    The universityId is taken from the JWT — never from the client.
    """
    print(f"\n[Student:Analyze] uid={user.uid}  uni={user.university_id}")
    print(f"[Student:Analyze] github={body.githubUsername}  lc={body.leetcodeUsername}  cgpa={body.cgpa}")

    try:
        # 1. Fetch platform data
        github_stats   = fetch_github_stats(body.githubUsername)
        leetcode_stats = await fetch_leetcode_stats(body.leetcodeUsername)

        # 2. Load university weights
        weights = load_weights(user.university_id)

        # 3. Score
        score = calculate_score(github_stats, leetcode_stats, body.cgpa, weights)
        grade = calculate_grade(score)
        print(f"[Student:Analyze] ✅ score={score}  grade={grade}")

        # 4. Build analytics
        analytics = AnalyticsData(
            github_totalRepos=github_stats.totalRepos,
            github_totalStars=github_stats.totalStars,
            github_languageDistribution=github_stats.languageDistribution,
            topRepositories=github_stats.topRepositories,
            leetcode_easy=leetcode_stats.easy,
            leetcode_medium=leetcode_stats.medium,
            leetcode_hard=leetcode_stats.hard,
            leetcode=leetcode_stats.deep,
        )

        # 5. Persist student doc
        student_update = {
            "grade":             grade,
            "score":             score,
            "githubUsername":    body.githubUsername,
            "leetcodeUsername":  body.leetcodeUsername,
            "cgpa":              body.cgpa,
            "batch":             body.batch,
            "githubRepoCount":   github_stats.totalRepos,
            "leetcodeHardCount": leetcode_stats.hard,
            "updatedAt":         firestore.SERVER_TIMESTAMP,
            "isActive":          True,
        }
        if body.branch:
            student_update["branch"] = body.branch

        _student_ref(user.university_id, user.uid).set(student_update, merge=True)

        # 6. Persist analytics doc
        analytics_doc = {
            "github_totalRepos":           github_stats.totalRepos,
            "github_totalStars":           github_stats.totalStars,
            "github_languageDistribution": github_stats.languageDistribution,
            "topRepositories": [r.model_dump() for r in github_stats.topRepositories],
            "leetcode_easy":   leetcode_stats.easy,
            "leetcode_medium": leetcode_stats.medium,
            "leetcode_hard":   leetcode_stats.hard,
            "leetcode": {
                "totalSolved": leetcode_stats.deep.totalSolved,
                "difficulty": {
                    "easy":   leetcode_stats.easy,
                    "medium": leetcode_stats.medium,
                    "hard":   leetcode_stats.hard,
                },
                "languageStats":     leetcode_stats.deep.languageStats,
                "topicTags":         leetcode_stats.deep.topicTags,
                "recentSubmissions": [s.model_dump() for s in leetcode_stats.deep.recentSubmissions],
            },
            "lastUpdated": firestore.SERVER_TIMESTAMP,
        }
        _analytics_ref(user.university_id, user.uid).set(analytics_doc, merge=True)

        return AnalyzeStudentResponse(grade=grade, score=score, analytics=analytics)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Student:Analyze] ❌ {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
