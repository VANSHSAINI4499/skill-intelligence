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
    "weakSkills":          list[str],      # skill ids below batch average
    "strongSkills":        list[str],      # skill ids above batch average
    "recommendationLevel": "Low" | "Medium" | "High",
    "batchSize":           int,
}
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


def _recommendation_level(gap: float) -> str:
    """Derive recommendation intensity from score gap."""
    if gap >= -5:       # student is near or above average
        return "Low"
    if gap >= -15:
        return "Medium"
    return "High"


async def generate_knowledge_gap_report(
    university_id: str,
    student_id: str,
) -> dict[str, Any]:
    """
    1. Fetch student document from Firestore.
    2. Load (or recalculate) batch analytics for the student's batch.
    3. Compare individual scores and skills against batch averages.
    4. Return a structured gap report.
    """
    # ── 1. Load student ───────────────────────────────────────────────────────
    student_doc = _student_ref(university_id, student_id).get()
    if not student_doc.exists:
        raise ValueError(f"Student {student_id} not found in university {university_id}")

    student: dict[str, Any] = student_doc.to_dict() or {}
    batch: str = student.get("batch", "unknown")
    student_score = float(student.get("score") or student.get("aiScore") or 0)
    student_grade = (student.get("grade") or "F").upper()

    # ── 2. Load batch analytics (recalculate on miss) ─────────────────────────
    analytics = await get_batch_analytics(university_id, batch)
    if analytics is None:
        logger.info(
            "knowledge_gap_engine: no cached analytics for %s/%s — recalculating",
            university_id, batch,
        )
        analytics = await recalculate_batch_analytics(university_id, batch)

    batch_avg: float = float(analytics.get("avgScore") or 0)
    skill_averages: dict[str, float] = analytics.get("skillAverages") or {}
    batch_size: int = int(analytics.get("totalStudents") or 0)

    # ── 3. Load student's own skill levels ───────────────────────────────────
    analytics_doc = _analytics_ref(university_id, student_id).get()
    student_skills: dict[str, Any] = {}
    if analytics_doc.exists:
        student_skills = (analytics_doc.to_dict() or {}).get("skills", {})

    # ── 4. Compare skills ─────────────────────────────────────────────────────
    weak_skills: list[str] = []
    strong_skills: list[str] = []

    for skill_id, batch_avg_level in skill_averages.items():
        student_level_str = str(student_skills.get(skill_id, "beginner")).lower()
        student_level = PROFICIENCY_TO_SCORE.get(student_level_str, 0.0)
        if student_level < batch_avg_level:
            weak_skills.append(skill_id)
        elif student_level > batch_avg_level:
            strong_skills.append(skill_id)

    # ── 5. Percentile estimation ──────────────────────────────────────────────
    # Simple linear percentile based on score gap vs batch range.
    # Formula: 50 + (studentScore - batchAvg) / (batchAvg or 1) * 50, clamped [0, 100]
    if batch_avg > 0:
        percentile = 50 + (student_score - batch_avg) / batch_avg * 50
    else:
        percentile = 50.0
    percentile = max(0.0, min(100.0, round(percentile, 1)))

    overall_gap = round(student_score - batch_avg, 3)
    recommendation_level = _recommendation_level(overall_gap)

    return {
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
    }
