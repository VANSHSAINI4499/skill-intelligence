"""
Router: /analyze-student
========================
POST /analyze-student

Orchestrates the full analysis pipeline (university-scoped):
  1. Authenticate the calling student (Firebase ID token).
  2. Fetch GitHub stats.
  3. Fetch LeetCode stats.
  4. Load algorithm weights from universities/{id}/algorithm_config/current.
  5. Compute score + grade via ranking engine.
  6. Persist results to Firestore (university-scoped):
       universities/{id}/students/{userId}   — grade, score, usernames
       universities/{id}/analytics/{userId}  — raw platform stats
  7. Return grade, score, analytics.

Security: Students can only analyze themselves (token uid must match userId).
"""

import traceback

from fastapi import APIRouter, Depends, HTTPException
from google.cloud import firestore

from config.firebase import db
from core.auth_middleware import CurrentUser, get_current_student
from core.ranking_engine import calculate_grade, calculate_score, load_weights
from models.admin_models import AlgorithmWeights
from models.student_model import AnalyzeStudentRequest, AnalyzeStudentResponse, AnalyticsData
from services.github_service import fetch_github_stats
from services.leetcode_service import fetch_leetcode_stats

router = APIRouter()


@router.post(
    "/analyze-student",
    response_model=AnalyzeStudentResponse,
    summary="Analyse a student's skill profile",
    tags=["Analytics"],
)
async def analyze_student(
    payload: AnalyzeStudentRequest,
    user: CurrentUser = Depends(get_current_student),
) -> AnalyzeStudentResponse:
    """
    Full analysis pipeline for a single student.

    - Validates that the authenticated user is analyzing their own profile.
    - Fetches live data from GitHub and LeetCode.
    - Loads dynamic algorithm weights from the university's Firestore config.
    - Scores the student using the weighted ranking engine.
    - Writes results back to the university's Firestore sub-collections:
        * universities/{id}/students/{userId}  — grade, score, usernames
        * universities/{id}/analytics/{userId} — raw platform stats
    """
    print(f"\n{'#'*60}")
    print(f"[Analyze] 📨 POST /analyze-student called")
    print(f"[Analyze]   userId           = {payload.userId}")
    print(f"[Analyze]   universityId     = {user.university_id}")
    print(f"[Analyze]   githubUsername   = {payload.githubUsername}")
    print(f"[Analyze]   leetcodeUsername = {payload.leetcodeUsername}")
    print(f"[Analyze]   cgpa             = {payload.cgpa}")
    print(f"[Analyze]   batch            = {payload.batch}")
    print(f"{'#'*60}")

    # ── Security: students can only analyze themselves ────────────────────────
    if payload.userId != user.uid:
        raise HTTPException(
            status_code=403,
            detail="You can only analyze your own profile",
        )

    uni_id   = user.university_id
    uni_ref  = db.collection("universities").document(uni_id)

    try:
        # ── 1. Fetch platform data ────────────────────────────────────────────
        print("[Analyze] ► Step 1 — Fetching GitHub stats ...")
        github_stats = fetch_github_stats(payload.githubUsername)
        print(f"[Analyze] ◄ GitHub:   totalRepos={github_stats.totalRepos}  totalStars={github_stats.totalStars}")

        print("[Analyze] ► Step 2 — Fetching LeetCode stats ...")
        leetcode_stats = await fetch_leetcode_stats(payload.leetcodeUsername)
        print(f"[Analyze] ◄ LeetCode: easy={leetcode_stats.easy}  medium={leetcode_stats.medium}  hard={leetcode_stats.hard}")

        # ── 2. Load university weights ────────────────────────────────────────
        print("[Analyze] ► Step 3 — Loading algorithm weights ...")
        weights = load_weights(uni_id)
        print(f"[Analyze] ◄ Weights: {weights.model_dump()}")

        # ── 3. Score ──────────────────────────────────────────────────────────
        print("[Analyze] ► Step 4 — Running ranking engine ...")
        score = calculate_score(github_stats, leetcode_stats, payload.cgpa, weights)
        grade = calculate_grade(score)
        print(f"[Analyze] ◄ Result: score={score}  grade={grade}")

        # ── 4. Build analytics payload ────────────────────────────────────────
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

        # ── 5. Persist to Firestore (university-scoped) ───────────────────────
        print(f"[Analyze] ► Step 5 — Writing universities/{uni_id}/students/{payload.userId} ...")
        student_update: dict = {
            "grade":             grade,
            "score":             score,
            "githubUsername":    payload.githubUsername,
            "leetcodeUsername":  payload.leetcodeUsername,
            "cgpa":              payload.cgpa,
            "batch":             payload.batch,
            "githubRepoCount":   github_stats.totalRepos,
            "leetcodeHardCount": leetcode_stats.hard,
            "updatedAt":         firestore.SERVER_TIMESTAMP,
            "isActive":          True,
            "role":              "student",
        }
        if payload.branch:
            student_update["branch"] = payload.branch

        uni_ref.collection("students").document(payload.userId).set(
            student_update, merge=True
        )
        print(f"[Analyze] ✅ students/{payload.userId} updated")

        analytics_doc = {
            "github_totalRepos":           github_stats.totalRepos,
            "github_totalStars":           github_stats.totalStars,
            "github_languageDistribution": github_stats.languageDistribution,
            "topRepositories": [
                repo.model_dump() for repo in github_stats.topRepositories
            ],
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
                "recentSubmissions": [
                    sub.model_dump() for sub in leetcode_stats.deep.recentSubmissions
                ],
            },
            "lastUpdated": firestore.SERVER_TIMESTAMP,
        }

        print(f"[Analyze] ► Step 6 — Writing universities/{uni_id}/analytics/{payload.userId} ...")
        uni_ref.collection("analytics").document(payload.userId).set(
            analytics_doc, merge=True
        )
        print(f"[Analyze] ✅ analytics/{payload.userId} updated")

        response = AnalyzeStudentResponse(grade=grade, score=score, analytics=analytics)
        print(f"[Analyze] 📤 Final response: grade={grade}  score={score}")
        print(f"{'#'*60}\n")
        return response

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Analyze] ❌ EXCEPTION: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
