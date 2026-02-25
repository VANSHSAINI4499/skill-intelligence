"""
Router: /admin/*
================
Multi-tenant admin endpoints. All routes require role='admin' custom claim.

REST API
────────
  👥  Students
      GET    /admin/students                       — filter / list students
      GET    /admin/students/{studentId}           — single student detail

  📊  Batch Analytics
      GET    /admin/batch-analytics/{batch}        — aggregated batch KPIs

  ⚙   Algorithm Config
      GET    /admin/algorithm-config              — read current weights
      PUT    /admin/algorithm-config              — write weights

  🏢  Company Requirements
      GET    /admin/company-requirements           — list (isActive=true by default)
      POST   /admin/company-requirements           — create
      PATCH  /admin/company-requirements/{id}      — update / soft-delete

  📋  Shortlists
      POST   /admin/shortlists                     — generate ranked shortlist
      GET    /admin/shortlists                     — list (filter by batch/company)
      GET    /admin/shortlists/{shortlistId}       — single shortlist detail

Firestore paths (all university-scoped):
  universities/{universityId}/students/{studentId}
  universities/{universityId}/analytics/{studentId}
  universities/{universityId}/algorithm_config/current
  universities/{universityId}/company_requirements/{companyId}
  universities/{universityId}/shortlists/{shortlistId}
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from google.cloud import firestore
from pydantic import BaseModel

from config.firebase import db
from core.auth_middleware import CurrentUser, get_current_admin
from core.ranking_engine import calculate_grade, calculate_score, load_weights
from models.admin_models import (
    AlgorithmConfigResponse,
    AlgorithmWeights,
    BatchAnalyticsResponse,
    BatchTopPerformer,
    CompanyRequirementResponse,
    CreateCompanyRequirementRequest,
    FilteredStudentDetail,
    FilterStudentsResponse,
    GenerateShortlistRequest,
    RankedStudent,
    ShortlistResponse,
    UpdateAlgorithmConfigRequest,
)
from models.student_model import GitHubStats, LeetCodeStats

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── University-scoped collection helpers ─────────────────────────────────────

def _uni(university_id: str):
    return db.collection("universities").document(university_id)

def _students(university_id: str):
    return _uni(university_id).collection("students")

def _analytics(university_id: str):
    return _uni(university_id).collection("analytics")

def _algo_ref(university_id: str):
    return _uni(university_id).collection("algorithm_config").document("current")

def _company_col(university_id: str):
    return _uni(university_id).collection("company_requirements")

def _shortlists_col(university_id: str):
    return _uni(university_id).collection("shortlists")


# ─────────────────────────────────────────────────────────────────────────────
# Students  GET /admin/students
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/students",
    response_model=FilterStudentsResponse,
    summary="List / filter students with aggregated stats",
)
async def list_students(
    user:       CurrentUser   = Depends(get_current_admin),
    batch:      Optional[str] = Query(None),
    branch:     Optional[str] = Query(None),
    grade:      Optional[str] = Query(None),
    activeOnly: bool          = Query(True),
    sortBy:     str           = Query("score", description="score | name | cgpa"),
    order:      str           = Query("desc",  description="asc | desc"),
    minScore:   float         = Query(0.0,  ge=0, le=100),
    maxScore:   float         = Query(100.0,ge=0, le=100),
    minCGPA:    float         = Query(0.0,  ge=0, le=10),
    minHard:    int           = Query(0,    ge=0),
    minRepos:   int           = Query(0,    ge=0),
) -> FilterStudentsResponse:
    uid   = user.university_id
    query = _students(uid).where("role", "==", "student")

    if batch:
        query = query.where("batch", "==", batch)
    elif activeOnly:
        query = query.where("isActive", "==", True)

    survivors: list[FilteredStudentDetail] = []

    for doc in query.stream():
        data  = doc.to_dict()
        s_uid = doc.id

        if activeOnly and not data.get("isActive", True): continue
        if branch and data.get("branch") != branch: continue
        if grade  and data.get("grade")  != grade:  continue

        student_score = float(data.get("score", 0.0))
        if not (minScore <= student_score <= maxScore): continue
        if float(data.get("cgpa",             0.0)) < minCGPA:  continue
        if int(  data.get("leetcodeHardCount", 0))  < minHard:  continue
        if int(  data.get("githubRepoCount",   0))  < minRepos: continue

        survivors.append(FilteredStudentDetail(
            uid=s_uid, name=data.get("name"), email=data.get("email"),
            grade=data.get("grade"), score=round(student_score, 2),
            cgpa=data.get("cgpa"), batch=data.get("batch"), branch=data.get("branch"),
            isActive=bool(data.get("isActive", True)),
            githubUsername=data.get("githubUsername"),
            leetcodeUsername=data.get("leetcodeUsername"),
            githubRepoCount=int(data.get("githubRepoCount",   0)),
            leetcodeHardCount=int(data.get("leetcodeHardCount", 0)),
        ))

    reverse = order.lower() != "asc"
    key_map = {
        "score": lambda s: s.score,
        "name": lambda s: (s.name or ""),
        "cgpa": lambda s: (s.cgpa or 0.0),
    }
    survivors.sort(key=key_map.get(sortBy, key_map["score"]), reverse=reverse)

    total     = len(survivors)
    avg_score = round(sum(s.score for s in survivors) / total, 2) if total else 0.0
    grade_dist: dict[str, int] = {"A": 0, "B": 0, "C": 0, "D": 0}
    for s in survivors:
        if s.grade in grade_dist:
            grade_dist[s.grade] += 1

    return FilterStudentsResponse(
        totalStudents=total, filteredStudents=survivors,
        avgScore=avg_score, gradeDistribution=grade_dist,
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /admin/students/{studentId}
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/students/{student_id}",
    summary="Get a single student's profile + analytics",
)
async def get_student(
    student_id: str,
    user: CurrentUser = Depends(get_current_admin),
):
    doc = _students(user.university_id).document(student_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Student not found")

    data   = doc.to_dict()
    a_snap = _analytics(user.university_id).document(student_id).get()
    analytics = a_snap.to_dict() if a_snap.exists else {}

    return {"uid": student_id, **data, "analytics": analytics}


# ─────────────────────────────────────────────────────────────────────────────
# Batch Analytics  GET /admin/batch-analytics/{batch}
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/batch-analytics/{batch}",
    response_model=BatchAnalyticsResponse,
    summary="Aggregated KPIs for a batch",
)
async def batch_analytics(
    batch: str,
    user:  CurrentUser = Depends(get_current_admin),
) -> BatchAnalyticsResponse:
    uni_id = user.university_id
    query  = (
        _students(uni_id)
        .where("batch",    "==", batch)
        .where("role",     "==", "student")
        .where("isActive", "==", True)
    )

    total = 0; score_sum = 0.0; cgpa_sum = 0.0
    grade_dist = {"A": 0, "B": 0, "C": 0, "D": 0}
    all_students: list[BatchTopPerformer] = []

    for doc in query.stream():
        data  = doc.to_dict()
        score = float(data.get("score", 0.0))
        cgpa  = float(data.get("cgpa",  0.0))
        grade = data.get("grade", "")
        total += 1; score_sum += score; cgpa_sum += cgpa
        if grade in grade_dist:
            grade_dist[grade] += 1
        all_students.append(BatchTopPerformer(
            uid=doc.id, name=data.get("name"), email=data.get("email"),
            score=round(score, 2), grade=grade, cgpa=cgpa, batch=data.get("batch"),
        ))

    avg_score = round(score_sum / total, 2) if total else 0.0
    avg_cgpa  = round(cgpa_sum  / total, 2) if total else 0.0
    all_students.sort(key=lambda s: s.score, reverse=True)

    return BatchAnalyticsResponse(
        batch=batch, totalStudents=total, avgScore=avg_score, avgCGPA=avg_cgpa,
        gradeDistribution=grade_dist, topPerformers=all_students[:5],
    )


# ─────────────────────────────────────────────────────────────────────────────
# Algorithm Config
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/algorithm-config",
    response_model=AlgorithmConfigResponse,
    summary="Get current scoring weights",
)
async def get_algorithm_config(
    user: CurrentUser = Depends(get_current_admin),
) -> AlgorithmConfigResponse:
    doc = _algo_ref(user.university_id).get()
    if not doc.exists:
        return AlgorithmConfigResponse(weights=AlgorithmWeights(), updatedBy=None, lastUpdated=None)
    data = doc.to_dict()
    return AlgorithmConfigResponse(
        weights=AlgorithmWeights(**data.get("weights", {})),
        updatedBy=data.get("updatedBy"),
        lastUpdated=str(data["updatedAt"]) if data.get("updatedAt") else None,
    )


@router.put(
    "/algorithm-config",
    response_model=AlgorithmConfigResponse,
    summary="Update scoring weights",
)
async def update_algorithm_config(
    body: UpdateAlgorithmConfigRequest,
    user: CurrentUser = Depends(get_current_admin),
) -> AlgorithmConfigResponse:
    _algo_ref(user.university_id).set({
        "weights":   body.weights.model_dump(),
        "updatedBy": user.uid,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    })
    return AlgorithmConfigResponse(weights=body.weights, updatedBy=user.uid, lastUpdated=None)


# ─────────────────────────────────────────────────────────────────────────────
# Company Requirements
# ─────────────────────────────────────────────────────────────────────────────

class PatchCompanyRequirementRequest(BaseModel):
    companyName:        Optional[str]       = None
    minCGPA:            Optional[float]     = None
    minLeetCodeHard:    Optional[int]       = None
    minRepos:           Optional[int]       = None
    requiredTopics:     Optional[list[str]] = None
    preferredLanguages: Optional[list[str]] = None
    isActive:           Optional[bool]      = None


@router.get(
    "/company-requirements",
    response_model=list[CompanyRequirementResponse],
    summary="List company requirements",
)
async def list_company_requirements(
    user:        CurrentUser = Depends(get_current_admin),
    include_all: bool        = Query(False, description="Include soft-deleted records"),
) -> list[CompanyRequirementResponse]:
    docs = _company_col(user.university_id).order_by("companyName").stream()
    results = []
    for doc in docs:
        data = doc.to_dict()
        if not include_all and not data.get("isActive", True):
            continue
        created_at = data.pop("createdAt", None)
        results.append(CompanyRequirementResponse(
            companyId=doc.id,
            companyName=data.get("companyName",""),
            minCGPA=data.get("minCGPA", 0.0),
            minLeetCodeHard=data.get("minLeetCodeHard", 0),
            minRepos=data.get("minRepos", 0),
            requiredTopics=data.get("requiredTopics", []),
            preferredLanguages=data.get("preferredLanguages", []),
            createdAt=str(created_at) if created_at else None,
        ))
    return results


@router.post(
    "/company-requirements",
    response_model=CompanyRequirementResponse,
    status_code=201,
    summary="Create a company requirement",
)
async def create_company_requirement(
    body: CreateCompanyRequirementRequest,
    user: CurrentUser = Depends(get_current_admin),
) -> CompanyRequirementResponse:
    company_id = str(uuid.uuid4())
    _company_col(user.university_id).document(company_id).set({
        **body.model_dump(),
        "isActive":  True,
        "createdAt": firestore.SERVER_TIMESTAMP,
    })
    return CompanyRequirementResponse(companyId=company_id, **body.model_dump(), createdAt=None)


@router.patch(
    "/company-requirements/{company_id}",
    response_model=CompanyRequirementResponse,
    summary="Update or soft-delete a company requirement",
)
async def patch_company_requirement(
    company_id: str,
    body: PatchCompanyRequirementRequest,
    user: CurrentUser = Depends(get_current_admin),
) -> CompanyRequirementResponse:
    ref = _company_col(user.university_id).document(company_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Company requirement not found")

    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    patch["updatedAt"] = firestore.SERVER_TIMESTAMP
    ref.set(patch, merge=True)

    data = ref.get().to_dict()
    created_at = data.pop("createdAt", None)
    return CompanyRequirementResponse(
        companyId=company_id,
        companyName=data.get("companyName",""),
        minCGPA=data.get("minCGPA", 0.0),
        minLeetCodeHard=data.get("minLeetCodeHard", 0),
        minRepos=data.get("minRepos", 0),
        requiredTopics=data.get("requiredTopics", []),
        preferredLanguages=data.get("preferredLanguages", []),
        createdAt=str(created_at) if created_at else None,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Shortlists
# ─────────────────────────────────────────────────────────────────────────────

class CreateShortlistRequest(BaseModel):
    companyId: str
    batch:     str
    limit:     int = 20


@router.post(
    "/shortlists",
    response_model=ShortlistResponse,
    status_code=201,
    summary="Generate a ranked shortlist for a company + batch",
)
async def create_shortlist(
    body: CreateShortlistRequest,
    user: CurrentUser = Depends(get_current_admin),
) -> ShortlistResponse:
    uni_id  = user.university_id
    weights = load_weights(uni_id)

    company_doc = _company_col(uni_id).document(body.companyId).get()
    if not company_doc.exists:
        raise HTTPException(status_code=404, detail=f"Company '{body.companyId}' not found")

    req             = company_doc.to_dict()
    min_cgpa        = float(req.get("minCGPA", 0.0))
    min_hard        = int(req.get("minLeetCodeHard", 0))
    min_repos       = int(req.get("minRepos", 0))
    required_topics = set(req.get("requiredTopics", []))
    company_name    = req.get("companyName", "")

    student_query = (
        _students(uni_id)
        .where("batch",    "==", body.batch)
        .where("role",     "==", "student")
        .where("isActive", "==", True)
    )

    candidates: list[tuple[str, dict, float]] = []

    for sdoc in student_query.stream():
        sid     = sdoc.id
        udata   = sdoc.to_dict()
        cgpa    = float(udata.get("cgpa",            0.0))
        lc_hard = int(udata.get("leetcodeHardCount", 0))
        gh_repos= int(udata.get("githubRepoCount",   0))

        if cgpa    < min_cgpa:  continue
        if lc_hard < min_hard:  continue
        if gh_repos< min_repos: continue

        if required_topics:
            a_snap = _analytics(uni_id).document(sid).get()
            if not a_snap.exists: continue
            solved_tags = set(
                a_snap.to_dict().get("leetcode", {}).get("topicTags", {}).keys()
            )
            if not required_topics.intersection(solved_tags): continue

        a_doc = _analytics(uni_id).document(sid).get()
        if a_doc.exists:
            ad = a_doc.to_dict()
            gh_stats = GitHubStats(
                totalRepos=int(ad.get("github_totalRepos", gh_repos)),
                totalStars=int(ad.get("github_totalStars", 0)),
            )
            lc_stats = LeetCodeStats(
                easy=int(ad.get("leetcode_easy",   0)),
                medium=int(ad.get("leetcode_medium", 0)),
                hard=int(ad.get("leetcode_hard",   lc_hard)),
            )
        else:
            gh_stats = GitHubStats(totalRepos=gh_repos)
            lc_stats = LeetCodeStats(hard=lc_hard)

        candidates.append((sid, udata, calculate_score(gh_stats, lc_stats, cgpa, weights)))

    candidates.sort(key=lambda x: x[2], reverse=True)
    selected = candidates[: body.limit]

    ranked: list[RankedStudent] = []
    uid_list: list[str] = []

    for rank_i, (sid, udata, score) in enumerate(selected, start=1):
        ranked.append(RankedStudent(
            rank=rank_i, uid=sid,
            name=udata.get("name"), email=udata.get("email"),
            score=round(score, 2), grade=calculate_grade(score),
            cgpa=udata.get("cgpa"),
            leetcodeHard=udata.get("leetcodeHardCount", 0),
            githubRepos=udata.get("githubRepoCount", 0),
            githubUsername=udata.get("githubUsername"),
            leetcodeUsername=udata.get("leetcodeUsername"),
            batch=udata.get("batch"), branch=udata.get("branch"),
        ))
        uid_list.append(sid)

    shortlist_id = str(uuid.uuid4())
    _shortlists_col(uni_id).document(shortlist_id).set({
        "companyId":        body.companyId,
        "companyName":      company_name,
        "batch":            body.batch,
        "generatedBy":      user.uid,
        "selectedStudents": uid_list,
        "totalCandidates":  len(candidates),
        "limit":            body.limit,
        "weightsSnapshot":  weights.model_dump(),
        "rankedStudents":   [r.model_dump() for r in ranked],
        "createdAt":        firestore.SERVER_TIMESTAMP,
    }, merge=True)

    print(f"[Admin:Shortlist] ✅ {shortlist_id} — {len(ranked)} students for {company_name}")
    return ShortlistResponse(
        shortlistId=shortlist_id, companyId=body.companyId, companyName=company_name,
        batch=body.batch, generatedBy=user.uid,
        selectedStudents=uid_list, rankedStudents=ranked,
        totalCandidates=len(candidates), createdAt=None,
    )


@router.get(
    "/shortlists",
    response_model=list[ShortlistResponse],
    summary="List shortlists (filter by batch or company)",
)
async def list_shortlists(
    user:       CurrentUser   = Depends(get_current_admin),
    batch:      Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
) -> list[ShortlistResponse]:
    query = _shortlists_col(user.university_id).order_by(
        "createdAt", direction=firestore.Query.DESCENDING
    )
    if batch:
        query = query.where("batch", "==", batch)
    if company_id:
        query = query.where("companyId", "==", company_id)

    results = []
    for doc in query.stream():
        data = doc.to_dict()
        created_at = data.pop("createdAt", None)
        results.append(ShortlistResponse(
            shortlistId=doc.id,
            createdAt=str(created_at) if created_at else None,
            **data,
        ))
    return results


@router.get(
    "/shortlists/{shortlist_id}",
    response_model=ShortlistResponse,
    summary="Get a single shortlist by ID",
)
async def get_shortlist(
    shortlist_id: str,
    user: CurrentUser = Depends(get_current_admin),
) -> ShortlistResponse:
    doc = _shortlists_col(user.university_id).document(shortlist_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Shortlist not found")
    data = doc.to_dict()
    created_at = data.pop("createdAt", None)
    return ShortlistResponse(
        shortlistId=shortlist_id,
        createdAt=str(created_at) if created_at else None,
        **data,
    )
