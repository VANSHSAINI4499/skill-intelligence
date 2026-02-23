"""
Router: /analyze-student
========================
POST /analyze-student

Orchestrates the full analysis pipeline:
  1. Fetch GitHub stats
  2. Fetch LeetCode stats
  3. Compute score + grade via ranking engine
  4. Persist results to Firestore (users + analytics collections)
  5. Return grade, score, analytics
"""

import traceback

from fastapi import APIRouter, HTTPException
from google.cloud import firestore

from config.firebase import db
from core.ranking_engine import calculate_grade, calculate_score
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
async def analyze_student(payload: AnalyzeStudentRequest) -> AnalyzeStudentResponse:
    """
    Full analysis pipeline for a single student.

    - Fetches live data from GitHub and LeetCode.
    - Scores the student using the weighted ranking engine.
    - Writes results back to Firestore in two collections:
        * users/{userId}  — grade + score + usernames
        * analytics/{userId}  — raw platform stats
    """
    print(f"\n{'#'*60}")
    print(f"[Analyze] 📨 POST /analyze-student called")
    print(f"[Analyze]   userId           = {payload.userId}")
    print(f"[Analyze]   githubUsername   = {payload.githubUsername}")
    print(f"[Analyze]   leetcodeUsername = {payload.leetcodeUsername}")
    print(f"[Analyze]   cgpa             = {payload.cgpa}")
    print(f"[Analyze]   semester         = {payload.semester}")
    print(f"{'#'*60}")

    try:
        # ── 1. Fetch platform data ────────────────────────────────────────────
        print("[Analyze] ► Step 1 — Fetching GitHub stats ...")
        github_stats = fetch_github_stats(payload.githubUsername)
        print(f"[Analyze] ◄ GitHub:   totalRepos={github_stats.totalRepos}  totalStars={github_stats.totalStars}")

        print("[Analyze] ► Step 2 — Fetching LeetCode stats ...")
        leetcode_stats = fetch_leetcode_stats(payload.leetcodeUsername)
        print(f"[Analyze] ◄ LeetCode: easy={leetcode_stats.easy}  medium={leetcode_stats.medium}  hard={leetcode_stats.hard}")

        # ── 2. Compute score & grade ──────────────────────────────────────────
        print("[Analyze] ► Step 3 — Running ranking engine ...")
        score = calculate_score(github_stats, leetcode_stats, payload.cgpa)
        grade = calculate_grade(score)
        print(f"[Analyze] ◄ Result: score={score}  grade={grade}")

        # ── 3. Build analytics payload ────────────────────────────────────────
        analytics = AnalyticsData(
            github_totalRepos=github_stats.totalRepos,
            github_totalStars=github_stats.totalStars,
            github_languageDistribution=github_stats.languageDistribution,
            topRepositories=github_stats.topRepositories,
            leetcode_easy=leetcode_stats.easy,
            leetcode_medium=leetcode_stats.medium,
            leetcode_hard=leetcode_stats.hard,
        )
        print(f"[Analyze] Analytics: {analytics.model_dump()}")

        # ── 4. Persist to Firestore ───────────────────────────────────────────
        print(f"[Analyze] ► Step 4 — Writing Firestore users/{payload.userId} ...")
        db.collection("users").document(payload.userId).set(
            {
                "grade":             grade,
                "score":             score,
                "githubUsername":    payload.githubUsername,
                "leetcodeUsername":  payload.leetcodeUsername,
                "cgpa":              payload.cgpa,
                "semester":          payload.semester,
                "githubRepoCount":   github_stats.totalRepos,
                "leetcodeHardCount": leetcode_stats.hard,
                "updatedAt":         firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
        print(f"[Analyze] ✅ users/{payload.userId} updated")

        # Build an explicit, fully-typed analytics document so every field
        # is visible in logs and no stale key is accidentally omitted.
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
            "lastUpdated":     firestore.SERVER_TIMESTAMP,
        }

        print(f"[Analyze] ► Step 5 — analytics_doc to write:")
        print(f"[Analyze]   github_totalRepos           = {analytics_doc['github_totalRepos']}")
        print(f"[Analyze]   github_totalStars           = {analytics_doc['github_totalStars']}")
        print(f"[Analyze]   github_languageDistribution = {analytics_doc['github_languageDistribution']}")
        print(f"[Analyze]   topRepositories             = {[r['name'] for r in analytics_doc['topRepositories']]}")
        print(f"[Analyze]   leetcode_easy               = {analytics_doc['leetcode_easy']}")
        print(f"[Analyze]   leetcode_medium             = {analytics_doc['leetcode_medium']}")
        print(f"[Analyze]   leetcode_hard               = {analytics_doc['leetcode_hard']}")

        print(f"[Analyze] ► Step 5 — Writing Firestore analytics/{payload.userId} ...")
        db.collection("analytics").document(payload.userId).set(
            analytics_doc,
            merge=True,
        )
        print(f"[Analyze] ✅ analytics/{payload.userId} updated")

        # ── 5. Return ─────────────────────────────────────────────────────────
        response = AnalyzeStudentResponse(grade=grade, score=score, analytics=analytics)
        print(f"[Analyze] 📤 Final response: {response.model_dump()}")
        print(f"{'#'*60}\n")
        return response

    except Exception as e:
        print(f"[Analyze] ❌ EXCEPTION: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
