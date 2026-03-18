"""
Batch Analytics Service
=======================
Computes and caches aggregated statistics for every student in a given
(university, batch) pair.  Results are stored in:

    /universities/{universityId}/batchAnalytics/{batch}

This keeps the data co-located with the university tenant so Firestore
Security Rules can continue to gate access by universityId.

Public API
----------
    await recalculate_batch_analytics(university_id, batch)
    -> dict (the document written to Firestore)

Computed fields (backward-compatible additions marked with ★):
    avgScore             — mean score across all students
    gradeDistribution    — {A, B, C, D, F} counts
    skillAverages        — proficiency averages from analytics.skills map
    topPerformers        — top 10% UIDs by score
  ★ gradeWiseSkills      — per-grade topic + language distributions (0-100 scale)
"""

import logging
from datetime import datetime, timezone
from typing import Any

from google.cloud import firestore

from config.firebase import db

logger = logging.getLogger(__name__)

# ── Helpers ────────────────────────────────────────────────────────────────────

PROFICIENCY_TO_SCORE: dict[str, float] = {
    "beginner":     1.0,
    "intermediate": 2.0,
    "expert":       3.0,
}

GRADE_ORDER = ["A", "B", "C", "D", "F"]


def _batch_analytics_ref(university_id: str, batch: str) -> firestore.DocumentReference:
    """Reference to the batchAnalytics document for a (university, batch) pair."""
    return (
        db.collection("universities")
        .document(university_id)
        .collection("batchAnalytics")
        .document(batch)
    )


def _students_ref(university_id: str) -> firestore.CollectionReference:
    return (
        db.collection("universities")
        .document(university_id)
        .collection("students")
    )


def _normalize_to_pct(counts: dict[str, int], top_n: int = 20) -> dict[str, float]:
    """
    Normalize a raw count dict to a percentage distribution (sum → 100).

    Example:  {"dp": 40, "graphs": 20, "arrays": 40}
              →  {"dp": 40.0, "graphs": 20.0, "arrays": 40.0}

    Only the top `top_n` entries (by count) are kept to bound the output size.
    Returns an empty dict if `counts` is empty.
    """
    if not counts:
        return {}
    total = sum(counts.values()) or 1
    top = sorted(counts.items(), key=lambda x: -x[1])[:top_n]
    return {k: round(v / total * 100, 1) for k, v in top}


# ── Main computation ───────────────────────────────────────────────────────────

async def recalculate_batch_analytics(
    university_id: str,
    batch: str,
) -> dict[str, Any]:
    """
    Fetches all students in the batch, aggregates their scores, skill levels,
    LeetCode topic tags, and GitHub language distributions, then writes the
    result to Firestore.

    Steps
    -----
    1. Query students WHERE batch == batch (within the university sub-collection).
    2. Compute avgScore, gradeDistribution, skillAverages, topPerformers.
    3. Compute gradeWiseSkills: per-grade normalized topic + language distributions.
    4. Write / overwrite the batchAnalytics document.

    Returns
    -------
    The analytics dict that was written (also useful for immediate callers).
    """
    # 1 ── Fetch students
    student_docs = (
        _students_ref(university_id)
        .where("batch", "==", batch)
        .stream()
    )

    students: list[dict[str, Any]] = []
    for doc in student_docs:
        data = doc.to_dict() or {}
        data["_uid"] = doc.id
        students.append(data)

    total = len(students)
    if total == 0:
        logger.warning(
            "recalculate_batch_analytics: no students found for "
            "university=%s batch=%s", university_id, batch
        )
        empty: dict[str, Any] = {
            "universityId":      university_id,
            "batch":             batch,
            "totalStudents":     0,
            "avgScore":          0.0,
            "gradeDistribution": {g: 0 for g in GRADE_ORDER},
            "skillAverages":     {},
            "gradeWiseSkills":   {g: {"topics": {}, "languages": {}} for g in ["A", "B", "C", "D"]},
            "topPerformers":     [],
            "lastUpdated":       datetime.now(timezone.utc),
        }
        _batch_analytics_ref(university_id, batch).set(empty)
        return empty

    # 2a ── Average score
    scores = [float(s.get("score") or s.get("aiScore") or 0) for s in students]
    avg_score = sum(scores) / total

    # 2b ── Grade distribution
    grade_dist: dict[str, int] = {g: 0 for g in GRADE_ORDER}
    for s in students:
        g = (s.get("grade") or "F").upper()
        grade_dist[g] = grade_dist.get(g, 0) + 1

    # 2c ── Per-student analytics (skill averages + grade-wise topic/language data)
    # Accumulators for the existing skillAverages field
    skill_sums: dict[str, list[float]] = {}

    # ★ New accumulators for gradeWiseSkills
    # grade → { topic: total_count_across_students }
    grade_topics: dict[str, dict[str, int]] = {g: {} for g in ["A", "B", "C", "D"]}
    # grade → { language: total_count_across_students }
    grade_langs: dict[str, dict[str, int]]  = {g: {} for g in ["A", "B", "C", "D"]}

    for s in students:
        uid   = s["_uid"]
        grade = (s.get("grade") or "F").upper()

        # Read the analytics sub-document for this student
        analytics_doc = (
            db.collection("universities")
            .document(university_id)
            .collection("analytics")
            .document(uid)
            .get()
        )
        a_data: dict[str, Any] = analytics_doc.to_dict() or {} if analytics_doc.exists else {}

        # ── Existing: proficiency-based skill averages ────────────────────────
        skill_map: dict[str, Any] = a_data.get("skills", {})
        for skill_id, level in skill_map.items():
            numeric = PROFICIENCY_TO_SCORE.get(str(level).lower(), 0.0)
            skill_sums.setdefault(skill_id, []).append(numeric)

        # ── ★ New: accumulate LeetCode topic tags per grade ───────────────────
        if grade in grade_topics:
            topic_tags: dict[str, int] = (a_data.get("leetcode") or {}).get("topicTags") or {}
            for topic, count in topic_tags.items():
                if topic:  # skip empty keys
                    grade_topics[grade][topic] = grade_topics[grade].get(topic, 0) + int(count)

        # ── ★ New: accumulate GitHub language distribution per grade ──────────
        if grade in grade_langs:
            lang_dist: dict[str, int] = a_data.get("github_languageDistribution") or {}
            for lang, count in lang_dist.items():
                if lang:  # skip empty keys
                    grade_langs[grade][lang] = grade_langs[grade].get(lang, 0) + int(count)

    # Finalise skillAverages (existing field)
    skill_averages: dict[str, float] = {
        sid: round(sum(vals) / len(vals), 3)
        for sid, vals in skill_sums.items()
    }

    # ★ Build gradeWiseSkills — normalize each grade's accumulated counts to 0-100
    grade_wise_skills: dict[str, dict] = {}
    for grade in ["A", "B", "C", "D"]:
        grade_wise_skills[grade] = {
            "topics":    _normalize_to_pct(grade_topics[grade], top_n=20),
            "languages": _normalize_to_pct(grade_langs[grade],  top_n=10),
        }

    # 2d ── Top performers (top 10% or top 5, whichever is larger)
    sorted_students = sorted(
        zip(scores, [s["_uid"] for s in students]),
        key=lambda x: x[0],
        reverse=True,
    )
    top_n = max(5, total // 10)
    top_performers = [uid for _, uid in sorted_students[:top_n]]

    # 3 ── Write to Firestore
    analytics: dict[str, Any] = {
        "universityId":      university_id,
        "batch":             batch,
        "totalStudents":     total,
        "avgScore":          round(avg_score, 3),
        "gradeDistribution": grade_dist,
        "skillAverages":     skill_averages,
        "gradeWiseSkills":   grade_wise_skills,   # ★ new field
        "topPerformers":     top_performers,
        "lastUpdated":       datetime.now(timezone.utc),
    }

    _batch_analytics_ref(university_id, batch).set(analytics)
    logger.info(
        "Batch analytics updated: university=%s batch=%s students=%d",
        university_id, batch, total,
    )
    return analytics


async def get_batch_analytics(
    university_id: str,
    batch: str,
) -> dict[str, Any] | None:
    """
    Returns the cached batchAnalytics document.
    Returns None when no analytics exist yet for this batch.
    """
    doc = _batch_analytics_ref(university_id, batch).get()
    if not doc.exists:
        return None
    return doc.to_dict()
