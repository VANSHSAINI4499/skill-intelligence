"""
Router: /filter-students  (lightweight legacy endpoint)
=========================================================
GET /filter-students?grade=A&minRepos=5&minHard=2

Scoped to the calling admin's university.
For advanced filtering with analytics enrichment and aggregated stats
use GET /admin/filter-students instead.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from config.firebase import db
from core.auth_middleware import CurrentUser, get_current_admin
from models.student_model import FilteredStudent

router = APIRouter()


@router.get(
    "/filter-students",
    response_model=list[FilteredStudent],
    summary="Filter students by grade, repo count, LeetCode hard count, batch, and branch",
    tags=["Admin"],
)
async def filter_students(
    user:     CurrentUser    = Depends(get_current_admin),
    grade:    Optional[str]  = Query(None, description="Grade filter: A, B, C, D"),
    minRepos: int            = Query(0,    ge=0, description="Minimum GitHub repo count"),
    minHard:  int            = Query(0,    ge=0, description="Minimum LeetCode hard solved"),
    batch:    Optional[str]  = Query(None, description="Batch e.g. 2023-2027"),
    branch:   Optional[str]  = Query(None, description="Branch e.g. CSE"),
) -> list[FilteredStudent]:
    """Streams students from universities/{universityId}/students, applies Python filters."""
    col  = db.collection("universities").document(user.university_id).collection("students")
    docs = col.where("role", "==", "student").stream()

    results: list[FilteredStudent] = []
    for doc in docs:
        data      = doc.to_dict()
        data["uid"] = doc.id

        if grade  and data.get("grade")  != grade:   continue
        if batch  and data.get("batch")  != batch:   continue
        if branch and data.get("branch") != branch:  continue
        if (data.get("githubRepoCount",   0)) < minRepos: continue
        if (data.get("leetcodeHardCount", 0)) < minHard:  continue

        results.append(FilteredStudent(**data))

    return results
