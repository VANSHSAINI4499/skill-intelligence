"""
Knowledge Gap Engine
====================
Compares an individual student's performance against batch-level analytics
and produces a structured gap report.

Public API
----------
    report = await generate_knowledge_gap_report(university_id, student_id)

Returns
-------
{
    "studentId":           str,
    "batch":               str,
    "studentScore":        float,
    "batchAvgScore":       float,
    "overallGap":          float,          # studentScore - batchAvgScore
    "percentileEstimate":  float,          # 0-100
    "studentGrade":        str,
    "targetGrade":         str,            # next grade up on the ladder
    "weakSkills":          list[str],      # proficiency-based skill gaps (legacy)
    "strongSkills":        list[str],      # proficiency-based strengths (legacy)
    "weakTopics":          list[dict],     # ★ LeetCode topic gaps vs target grade
    "strongTopics":        list[dict],     # ★ LeetCode topic strengths vs target grade
    "languageGaps":        dict[str,dict], # ★ GitHub language gaps vs target grade
    "recommendationLevel": "Low" | "Medium" | "High",
    "batchSize":           int,
}

Topic / Language gap dict shape:
    {"topic": str, "studentPct": float, "targetPct": float, "gap": float}
Language gap dict shape:
    {lang: {"studentPct": float, "targetPct": float, "gap": float}}
"""

import logging
from typing import Any

from config.firebase import db
from services.batch_analytics_service import get_batch_analytics, recalculate_batch_analytics

logger = logging.getLogger(__name__)

# Proficiency → numeric (mirrors batch_analytics_service)
PROFICIENCY_TO_SCORE: dict[str, float] = {
    "beginner":     1.0,
    "intermediate": 2.0,
    "expert":       3.0,
}

# Grade ladder: current grade → target grade one step higher
_GRADE_LADDER: dict[str, str] = {"F": "D", "D": "C", "C": "B", "B": "A", "A": "A"}


# ── Firestore helpers ─────────────────────────────────────────────────────────

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


# ── Scoring helpers ───────────────────────────────────────────────────────────

def _recommendation_level(gap: float) -> str:
    """Derive recommendation intensity from score gap."""
    if gap >= -5:       # student is near or above average
        return "Low"
    if gap >= -15:
        return "Medium"
    return "High"


def _normalize_distribution(raw: dict[str, Any]) -> dict[str, float]:
    """
    Convert a raw count dict to a percentage distribution (sum → 100).
    Safe-guards against division by zero and non-numeric values.
    """
    safe: dict[str, float] = {}
    for k, v in raw.items():
        try:
            safe[k] = float(v)
        except (TypeError, ValueError):
            continue
    total = sum(safe.values()) or 1.0
    return {k: round(v / total * 100, 1) for k, v in safe.items()}


# ── ★ Topic gap analysis ──────────────────────────────────────────────────────

def compute_topic_gaps(
    student_topics: dict[str, Any],
    grade_wise_skills: dict[str, dict],
    target_grade: str,
) -> dict[str, list[dict]]:
    """
    Compare student's LeetCode topic distribution against the target grade's
    topic distribution from gradeWiseSkills.

    Parameters
    ----------
    student_topics    : raw topicTags dict from analytics/{uid}.leetcode.topicTags
                        e.g. {"Arrays": 10, "Dynamic Programming": 2}
    grade_wise_skills : gradeWiseSkills dict from batchAnalytics
                        e.g. {"A": {"topics": {...}, "languages": {...}}, ...}
    target_grade      : the grade the student is aiming for (e.g. "C")

    Returns
    -------
    {
        "weakTopics":  [top-5 dicts where target_pct > student_pct, sorted by gap desc],
        "strongTopics":[top-3 dicts where student_pct > target_pct, sorted by advantage desc],
    }
    Each dict: {"topic": str, "studentPct": float, "targetPct": float, "gap": float}
    """
    target_data  = (grade_wise_skills or {}).get(target_grade) or {}
    target_topics: dict[str, float] = target_data.get("topics") or {}

    if not target_topics and not student_topics:
        return {"weakTopics": [], "strongTopics": []}

    student_norm = _normalize_distribution(student_topics)

    gaps: list[dict] = []
    all_topics = set(target_topics.keys()) | set(student_norm.keys())

    for topic in all_topics:
        student_pct = student_norm.get(topic, 0.0)
        target_pct  = target_topics.get(topic, 0.0)
        gap         = round(target_pct - student_pct, 1)  # positive = student below target
        gaps.append({
            "topic":      topic,
            "studentPct": student_pct,
            "targetPct":  target_pct,
            "gap":        gap,
        })

    # weakTopics: student is behind (gap > 0), sorted by largest deficit first
    weak_topics = sorted(
        [g for g in gaps if g["gap"] > 0],
        key=lambda x: -x["gap"],
    )[:5]

    # strongTopics: student is ahead (gap < 0), sorted by biggest advantage first
    strong_topics = sorted(
        [g for g in gaps if g["gap"] < 0],
        key=lambda x: x["gap"],   # most negative = biggest lead
    )[:3]

    return {"weakTopics": weak_topics, "strongTopics": strong_topics}


# ── ★ Language gap analysis ───────────────────────────────────────────────────

def compute_language_gaps(
    student_languages: dict[str, Any],
    grade_wise_skills: dict[str, dict],
    target_grade: str,
) -> dict[str, dict]:
    """
    Compare student's GitHub language distribution against the target grade's
    language distribution from gradeWiseSkills.

    Parameters
    ----------
    student_languages : raw languageDistribution from analytics/{uid}
                        e.g. {"Python": 5, "JavaScript": 2}
    grade_wise_skills : gradeWiseSkills from batchAnalytics
    target_grade      : the grade the student is aiming for

    Returns
    -------
    {
        "languageGaps": {
            "Python":     {"studentPct": 30.0, "targetPct": 60.0, "gap": 30.0},
            "JavaScript": {"studentPct": 40.0, "targetPct": 20.0, "gap": -20.0},
        }
    }
    Only languages with |gap| > 1 are included to suppress noise.
    """
    target_data  = (grade_wise_skills or {}).get(target_grade) or {}
    target_langs: dict[str, float] = target_data.get("languages") or {}

    if not target_langs and not student_languages:
        return {"languageGaps": {}}

    student_norm = _normalize_distribution(student_languages)

    language_gaps: dict[str, dict] = {}
    all_langs = set(target_langs.keys()) | set(student_norm.keys())

    for lang in all_langs:
        student_pct = student_norm.get(lang, 0.0)
        target_pct  = target_langs.get(lang, 0.0)
        gap         = round(target_pct - student_pct, 1)
        if abs(gap) > 1:  # skip negligible differences
            language_gaps[lang] = {
                "studentPct": student_pct,
                "targetPct":  target_pct,
                "gap":        gap,
            }

    return {"languageGaps": language_gaps}


# ── Main entry point ──────────────────────────────────────────────────────────

async def generate_knowledge_gap_report(
    university_id: str,
    student_id: str,
) -> dict[str, Any]:
    """
    1. Fetch student document from Firestore.
    2. Load (or recalculate) batch analytics for the student's batch.
    3. Compare individual scores, skills, topics, and languages against
       batch averages / grade-wise distributions.
    4. Return a structured gap report.
    """
    # ── 1. Load student ───────────────────────────────────────────────────────
    student_doc = _student_ref(university_id, student_id).get()
    if not student_doc.exists:
        raise ValueError(f"Student {student_id} not found in university {university_id}")

    student: dict[str, Any] = student_doc.to_dict() or {}
    batch: str         = student.get("batch", "unknown")
    student_score      = float(student.get("score") or student.get("aiScore") or 0)
    student_grade      = (student.get("grade") or "F").upper()
    target_grade       = _GRADE_LADDER.get(student_grade, "C")

    # ── 2. Load batch analytics (recalculate on miss) ─────────────────────────
    analytics = await get_batch_analytics(university_id, batch)
    if analytics is None:
        logger.info(
            "knowledge_gap_engine: no cached analytics for %s/%s — recalculating",
            university_id, batch,
        )
        analytics = await recalculate_batch_analytics(university_id, batch)

    batch_avg: float           = float(analytics.get("avgScore") or 0)
    skill_averages             = analytics.get("skillAverages") or {}
    grade_wise_skills          = analytics.get("gradeWiseSkills") or {}
    batch_size: int            = int(analytics.get("totalStudents") or 0)

    # ── 3. Load student's own analytics ───────────────────────────────────────
    analytics_doc = _analytics_ref(university_id, student_id).get()
    a_data: dict[str, Any] = {}
    if analytics_doc.exists:
        a_data = analytics_doc.to_dict() or {}

    # Legacy: proficiency-based skills (may be empty if not populated)
    student_skills: dict[str, Any] = a_data.get("skills", {})

    # ★ New: real data that IS populated by the analysis pipeline
    student_topics:    dict[str, Any] = (a_data.get("leetcode") or {}).get("topicTags") or {}
    student_languages: dict[str, Any] = a_data.get("github_languageDistribution") or {}

    # ── 4. Compare legacy skills ───────────────────────────────────────────────
    weak_skills:   list[str] = []
    strong_skills: list[str] = []

    for skill_id, batch_avg_level in skill_averages.items():
        student_level_str = str(student_skills.get(skill_id, "beginner")).lower()
        student_level = PROFICIENCY_TO_SCORE.get(student_level_str, 0.0)
        if student_level < batch_avg_level:
            weak_skills.append(skill_id)
        elif student_level > batch_avg_level:
            strong_skills.append(skill_id)

    # ── 5. ★ Compute topic and language gaps vs target grade ──────────────────
    topic_gap_result = compute_topic_gaps(student_topics, grade_wise_skills, target_grade)
    lang_gap_result  = compute_language_gaps(student_languages, grade_wise_skills, target_grade)

    # ── 6. Percentile estimation ──────────────────────────────────────────────
    if batch_avg > 0:
        percentile = 50 + (student_score - batch_avg) / batch_avg * 50
    else:
        percentile = 50.0
    percentile = max(0.0, min(100.0, round(percentile, 1)))

    overall_gap          = round(student_score - batch_avg, 3)
    recommendation_level = _recommendation_level(overall_gap)

    return {
        # ── Existing fields (unchanged) ────────────────────────────────────
        "studentId":           student_id,
        "batch":               batch,
        "studentScore":        round(student_score, 3),
        "batchAvgScore":       round(batch_avg, 3),
        "overallGap":          overall_gap,
        "percentileEstimate":  percentile,
        "studentGrade":        student_grade,
        "weakSkills":          weak_skills,
        "strongSkills":        strong_skills,
        "recommendationLevel": recommendation_level,
        "batchSize":           batch_size,
        # ── ★ New fields ───────────────────────────────────────────────────
        "targetGrade":         target_grade,
        "weakTopics":          topic_gap_result["weakTopics"],
        "strongTopics":        topic_gap_result["strongTopics"],
        "languageGaps":        lang_gap_result["languageGaps"],
    }
