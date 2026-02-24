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
        leetcode_stats = await fetch_leetcode_stats(payload.leetcodeUsername)
        print(f"[Analyze] ◄ LeetCode: easy={leetcode_stats.easy}  medium={leetcode_stats.medium}  hard={leetcode_stats.hard}")

        print(f"[Analyze] ► Step 3 — Loading algorithm weights ...")
        weights: AlgorithmWeights | None = None
        try:
            config_doc = db.document("algorithm_config/current").get()
            if config_doc.exists:
                weights_raw = config_doc.to_dict().get("weights", {})
                weights = AlgorithmWeights(**weights_raw)
                print(f"[Analyze] ◄ Custom weights loaded: {weights.model_dump()}")
            else:
                print("[Analyze] ◄ No custom weights found — using defaults")
        except Exception as w_err:
            print(f"[Analyze] ⚠ Could not load weights ({w_err}) — using defaults")

        print("[Analyze] ► Step 4 — Running ranking engine ...")
        score = calculate_score(github_stats, leetcode_stats, payload.cgpa, weights)
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
            leetcode=leetcode_stats.deep,
        )
        print(f"[Analyze] Analytics (flat): easy={analytics.leetcode_easy}  medium={analytics.leetcode_medium}  hard={analytics.leetcode_hard}")
        print(f"[Analyze] Analytics (deep): totalSolved={analytics.leetcode.totalSolved}  langs={len(analytics.leetcode.languageStats)}  tags={len(analytics.leetcode.topicTags)}  recentSubs={len(analytics.leetcode.recentSubmissions)}")

        # ── 4. Persist to Firestore ───────────────────────────────────────────
        print(f"[Analyze] ► Step 5 — Writing Firestore users/{payload.userId} ...")
        user_update: dict = {
            "grade":             grade,
            "score":             score,
            "githubUsername":    payload.githubUsername,
            "leetcodeUsername":  payload.leetcodeUsername,
            "cgpa":              payload.cgpa,
            "semester":          payload.semester,
            "githubRepoCount":   github_stats.totalRepos,
            "leetcodeHardCount": leetcode_stats.hard,
            "updatedAt":         firestore.SERVER_TIMESTAMP,
            # role defaults to 'student' — never overwrite if already 'admin'
            "isActive":          True,
        }
        if payload.batch is not None:
            user_update["batch"] = payload.batch
        if payload.branch is not None:
            user_update["branch"] = payload.branch

        # Set role only when the document doesn't already have one
        user_doc_snap = db.collection("users").document(payload.userId).get()
        if not user_doc_snap.exists or not user_doc_snap.to_dict().get("role"):
            user_update["role"] = "student"

        db.collection("users").document(payload.userId).set(user_update, merge=True)
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
            # ─ flat legacy fields (kept for backward compat) ──────────────────
            "leetcode_easy":   leetcode_stats.easy,
            "leetcode_medium": leetcode_stats.medium,
            "leetcode_hard":   leetcode_stats.hard,
            # ─ deep LeetCode analytics block ────────────────────────────
            "leetcode": {
                "totalSolved": leetcode_stats.deep.totalSolved,
                "difficulty": {
                    "easy":   leetcode_stats.easy,
                    "medium": leetcode_stats.medium,
                    "hard":   leetcode_stats.hard,
                },
                "languageStats":      leetcode_stats.deep.languageStats,
                "topicTags":          leetcode_stats.deep.topicTags,
                "recentSubmissions": [
                    sub.model_dump() for sub in leetcode_stats.deep.recentSubmissions
                ],
            },
            "lastUpdated": firestore.SERVER_TIMESTAMP,
        }

        print(f"[Analyze] ► Step 5 — analytics_doc to write:")
        print(f"[Analyze]   github_totalRepos           = {analytics_doc['github_totalRepos']}")
        print(f"[Analyze]   github_totalStars           = {analytics_doc['github_totalStars']}")
        print(f"[Analyze]   github_languageDistribution = {analytics_doc['github_languageDistribution']}")
        print(f"[Analyze]   topRepositories             = {[r['name'] for r in analytics_doc['topRepositories']]}")
        print(f"[Analyze]   leetcode_easy               = {analytics_doc['leetcode_easy']}")
        print(f"[Analyze]   leetcode_medium             = {analytics_doc['leetcode_medium']}")
        print(f"[Analyze]   leetcode_hard               = {analytics_doc['leetcode_hard']}")
        lc = analytics_doc['leetcode']
        print(f"[Analyze]   leetcode.totalSolved        = {lc['totalSolved']}")
        print(f"[Analyze]   leetcode.languageStats      = {lc['languageStats']}")
        print(f"[Analyze]   leetcode.topicTags (top 5)  = {dict(list(lc['topicTags'].items())[:5])}")
        print(f"[Analyze]   leetcode.recentSubmissions  = {len(lc['recentSubmissions'])} entries")

        print(f"[Analyze] ► Step 6 — Writing Firestore analytics/{payload.userId} ...")
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
