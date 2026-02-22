"""
Router: /filter-students
========================
GET /filter-students?grade=A&minRepos=5&minHard=2

Returns all students from Firestore that match the supplied filters.
"""

from typing import Optional

from fastapi import APIRouter, Query

from config.firebase import db
from models.student_model import FilteredStudent

router = APIRouter()


@router.get(
    "/filter-students",
    response_model=list[FilteredStudent],
    summary="Filter students by grade, repo count, and LeetCode hard count",
    tags=["Admin"],
)
async def filter_students(
    grade: Optional[str] = Query(None, description="Grade filter: A, B, C, D"),
    minRepos: int = Query(0, ge=0, description="Minimum GitHub repo count"),
    minHard: int = Query(0, ge=0, description="Minimum LeetCode hard solved"),
) -> list[FilteredStudent]:
    docs = db.collection("users").where("role", "==", "student").stream()

    results: list[FilteredStudent] = []
    for doc in docs:
        data = doc.to_dict()
        data["uid"] = doc.id

        if grade and data.get("grade") != grade:
            continue
        if (data.get("githubRepoCount") or 0) < minRepos:
            continue
        if (data.get("leetcodeHardCount") or 0) < minHard:
            continue

        results.append(FilteredStudent(**data))

    return results
