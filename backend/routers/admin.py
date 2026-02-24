"""
Router: /admin/*
================
All endpoints here require a valid Firebase ID token with role='admin'.

Endpoints
─────────
  GET  /admin/algorithm-config                      — read current weights
  PUT  /admin/algorithm-config                      — update weights
  PUT  /admin/update-algorithm                      — alias for PUT algorithm-config
  GET  /admin/company-requirements                  — list all requirements
  POST /admin/company-requirements                  — create requirement
  DELETE /admin/company-requirements/{company_id}  — delete requirement
  POST /admin/generate-shortlist                    — ranked shortlist pipeline
  POST /admin/shortlists                            — simple filter shortlist (legacy)
  GET  /admin/shortlists                            — list all shortlists
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from google.cloud import firestore

from config.firebase import db
from core.auth_middleware import require_admin
from core.ranking_engine import calculate_grade, calculate_score, load_weights
from models.admin_models import (
    AlgorithmConfigResponse,
    AlgorithmWeights,
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

_ALGO_CONFIG_DOC = "algorithm_config/current"

# ─────────────────────────────────────────────────────────────────────────────
# Advanced student filter  (GET /admin/filter-students)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/filter-students",
    response_model=FilterStudentsResponse,
    summary="Advanced multi-criteria student filter with aggregated stats",
)
async def admin_filter_students(
    admin_uid: str = Depends(require_admin),

    # ── Identity / classification filters (Firestore-indexed equality) ────────
    batch:      Optional[str] = Query(None, description="Batch year e.g. 2026"),
    branch:     Optional[str] = Query(None, description="Branch e.g. CSE"),
    grade:      Optional[str] = Query(None, description="Grade: A | B | C | D"),
    activeOnly: bool          = Query(True,  description="Include only isActive=true students"),

    # ── Numeric range filters (Python post-filter) ───────────────────────────
    minScore:   float = Query(0.0,  ge=0,   le=100, description="Minimum score (0-100)"),
    maxScore:   float = Query(100.0,ge=0,   le=100, description="Maximum score (0-100)"),
    minCgpa:    float = Query(0.0,  ge=0.0, le=10,  description="Minimum CGPA"),
    minHard:    int   = Query(0,    ge=0,            description="Minimum LeetCode Hard solved"),
    minRepos:   int   = Query(0,    ge=0,            description="Minimum GitHub repos"),

    # ── Analytics cross-join filters (Python + Firestore analytics fetch) ────
    language:   Optional[str] = Query(None, description="Student must have used this language (e.g. python3, cpp)"),
    topicTag:   Optional[str] = Query(None, description="Student must have solved at least one problem with this topic tag"),
) -> FilterStudentsResponse:
    """
    Two-phase filtering pipeline:

    Phase 1 — Firestore (indexed):
      • Always: role == 'student'
      • Optional: batch (equality), isActive (equality)

    Phase 2 — Python post-filter on user-doc fields:
      • branch, grade, score range, minCgpa, minHard, minRepos

    Phase 3 — Analytics cross-join (only when language or topicTag supplied):
      • Loads analytics/{uid} for each Phase-2 survivor
      • Checks languageStats / topicTags keys

    Returns aggregated stats (totalStudents, avgScore, gradeDistribution)
    alongside the enriched student list.

    Firestore composite index note:
      The query uses at most two equality filters (role + batch / role + isActive).
      If both batch AND activeOnly are used together with role, Firestore will need
      a composite index on (role, batch, isActive). Add it via Firebase console or
      deploy firestore.indexes.json if you hit a missing-index error.
    """

    # ── Phase 1: Firestore indexed query ─────────────────────────────────────
    query = db.collection("users").where("role", "==", "student")

    # Push the most selective equality filters to Firestore to minimise reads.
    # We apply at most one extra equality filter here to avoid requiring
    # a composite index that may not exist in the deployed project.
    if batch:
        query = query.where("batch", "==", batch)
    elif activeOnly:
        # Apply isActive at Firestore level only when batch isn't also set
        # (avoids needing a (role, batch, isActive) composite index)
        query = query.where("isActive", "==", True)

    # ── Phase 2: stream + Python post-filter on user-doc fields ──────────────
    need_analytics = bool(language or topicTag)
    survivors: list[FilteredStudentDetail] = []

    for doc in query.stream():
        data = doc.to_dict()
        uid  = doc.id

        # isActive — always enforce in Python (handles the batch+activeOnly case)
        if activeOnly and not data.get("isActive", True):
            continue

        # branch, grade — equality
        if branch and data.get("branch") != branch:
            continue
        if grade  and data.get("grade")  != grade:
            continue

        # numeric ranges — all post-filtered in Python
        student_score = float(data.get("score", 0.0))
        if not (minScore <= student_score <= maxScore):
            continue
        if float(data.get("cgpa",             0.0)) < minCgpa:  continue
        if int(  data.get("leetcodeHardCount", 0))  < minHard:  continue
        if int(  data.get("githubRepoCount",   0))  < minRepos: continue

        # ── Phase 3: analytics cross-join (only when needed) ──────────────────
        top_language: Optional[str]  = None
        solved_topics: list[str]     = []
        lang_dist:    dict[str, int] = {}

        if need_analytics:
            a_snap = db.collection("analytics").document(uid).get()
            if a_snap.exists:
                a_data     = a_snap.to_dict()
                lang_stats = a_data.get("leetcode", {}).get("languageStats", {})
                topic_map  = a_data.get("leetcode", {}).get("topicTags",     {})
                lang_dist  = lang_stats

                # Determine most-used language
                if lang_stats:
                    top_language = max(lang_stats, key=lambda k: lang_stats[k])

                solved_topics = list(topic_map.keys())

                # language filter
                if language and language.lower() not in {k.lower() for k in lang_stats}:
                    continue

                # topicTag filter
                if topicTag and topicTag.lower() not in {t.lower() for t in solved_topics}:
                    continue
            else:
                # No analytics doc — skip if analytics-based filter is strict
                if language or topicTag:
                    continue
        else:
            # Enrich language / topics even without filtering (best-effort)
            a_snap = db.collection("analytics").document(uid).get()
            if a_snap.exists:
                a_data    = a_snap.to_dict()
                lang_stats = a_data.get("leetcode", {}).get("languageStats", {})
                topic_map  = a_data.get("leetcode", {}).get("topicTags",     {})
                lang_dist  = lang_stats
                if lang_stats:
                    top_language = max(lang_stats, key=lambda k: lang_stats[k])
                solved_topics = list(topic_map.keys())

        survivors.append(
            FilteredStudentDetail(
                uid              = uid,
                name             = data.get("name"),
                email            = data.get("email"),
                grade            = data.get("grade"),
                score            = round(student_score, 2),
                cgpa             = data.get("cgpa"),
                semester         = data.get("semester"),
                batch            = data.get("batch"),
                branch           = data.get("branch"),
                isActive         = bool(data.get("isActive", True)),
                githubUsername   = data.get("githubUsername"),
                leetcodeUsername = data.get("leetcodeUsername"),
                githubRepoCount  = int(data.get("githubRepoCount",   0)),
                leetcodeHardCount= int(data.get("leetcodeHardCount", 0)),
                topLanguage      = top_language,
                solvedTopics     = solved_topics,
                langDistribution = lang_dist,
            )
        )

    # ── Aggregations ──────────────────────────────────────────────────────────
    total = len(survivors)

    avg_score = round(
        sum(s.score for s in survivors) / total, 2
    ) if total else 0.0

    grade_dist: dict[str, int] = {"A": 0, "B": 0, "C": 0, "D": 0}
    for s in survivors:
        if s.grade in grade_dist:
            grade_dist[s.grade] += 1

    # Sort by score descending for a consistent UX
    survivors.sort(key=lambda s: s.score, reverse=True)

    print(
        f"[Admin:Filter] ✅ {total} students matched — "
        f"avg={avg_score}  grades={grade_dist}"
    )

    return FilterStudentsResponse(
        totalStudents     = total,
        filteredStudents  = survivors,
        avgScore          = avg_score,
        gradeDistribution = grade_dist,
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
    admin_uid: str = Depends(require_admin),
) -> AlgorithmConfigResponse:
    """Returns the active scoring weights from Firestore."""
    doc = db.document(_ALGO_CONFIG_DOC).get()
    if not doc.exists:
        # Return safe defaults when document has never been written
        return AlgorithmConfigResponse(
            weights=AlgorithmWeights(),
            updatedBy=None,
            lastUpdated=None,
        )

    data = doc.to_dict()
    weights_raw = data.get("weights", {})
    last_updated = data.get("lastUpdated")
    return AlgorithmConfigResponse(
        weights=AlgorithmWeights(**weights_raw),
        updatedBy=data.get("updatedBy"),
        lastUpdated=str(last_updated) if last_updated else None,
    )


@router.put(
    "/algorithm-config",
    response_model=AlgorithmConfigResponse,
    summary="Update scoring weights (admin only)",
)
async def update_algorithm_config(
    body: UpdateAlgorithmConfigRequest,
    admin_uid: str = Depends(require_admin),
) -> AlgorithmConfigResponse:
    """
    Overwrites the active scoring weights. The next /analyze-student call
    will automatically use the new values.
    """
    payload = {
        "weights":     body.weights.model_dump(),
        "updatedBy":   admin_uid,
        "lastUpdated": firestore.SERVER_TIMESTAMP,
    }
    db.document(_ALGO_CONFIG_DOC).set(payload)

    print(f"[Admin] ✅ algorithm_config/current updated by {admin_uid}: {body.weights.model_dump()}")
    return AlgorithmConfigResponse(
        weights=body.weights,
        updatedBy=admin_uid,
        lastUpdated=None,  # SERVER_TIMESTAMP not readable immediately
    )


@router.put(
    "/update-algorithm",
    response_model=AlgorithmConfigResponse,
    summary="Update scoring weights via /update-algorithm (admin only)",
)
async def update_algorithm(
    body: UpdateAlgorithmConfigRequest,
    admin_uid: str = Depends(require_admin),
) -> AlgorithmConfigResponse:
    """
    Alias for PUT /algorithm-config — exposed at the path requested by the
    admin frontend without breaking the existing /algorithm-config consumers.
    """
    payload = {
        "weights":     body.weights.model_dump(),
        "updatedBy":   admin_uid,
        "lastUpdated": firestore.SERVER_TIMESTAMP,
    }
    db.document(_ALGO_CONFIG_DOC).set(payload)
    print(f"[Admin] ✅ algorithm updated via /update-algorithm by {admin_uid}: {body.weights.model_dump()}")
    return AlgorithmConfigResponse(
        weights=body.weights,
        updatedBy=admin_uid,
        lastUpdated=None,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Company Requirements
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/company-requirements",
    response_model=list[CompanyRequirementResponse],
    summary="List all company requirements",
)
async def list_company_requirements(
    admin_uid: str = Depends(require_admin),
) -> list[CompanyRequirementResponse]:
    docs = db.collection("company_requirements").order_by("companyName").stream()
    results = []
    for doc in docs:
        data = doc.to_dict()
        data["companyId"] = doc.id
        created_at = data.pop("createdAt", None)
        results.append(
            CompanyRequirementResponse(
                **data,
                createdAt=str(created_at) if created_at else None,
            )
        )
    return results


@router.post(
    "/company-requirements",
    response_model=CompanyRequirementResponse,
    status_code=201,
    summary="Create a company requirement (admin only)",
)
async def create_company_requirement(
    body: CreateCompanyRequirementRequest,
    admin_uid: str = Depends(require_admin),
) -> CompanyRequirementResponse:
    company_id = str(uuid.uuid4())
    doc_data = {
        **body.model_dump(),
        "createdAt": firestore.SERVER_TIMESTAMP,
    }
    db.collection("company_requirements").document(company_id).set(doc_data)

    print(f"[Admin] ✅ company_requirements/{company_id} created by {admin_uid}: {body.companyName}")
    return CompanyRequirementResponse(
        companyId=company_id,
        **body.model_dump(),
        createdAt=None,
    )


@router.delete(
    "/company-requirements/{company_id}",
    status_code=204,
    summary="Delete a company requirement (admin only)",
)
async def delete_company_requirement(
    company_id: str,
    admin_uid: str = Depends(require_admin),
) -> None:
    doc_ref = db.collection("company_requirements").document(company_id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Company requirement not found")

    doc_ref.delete()
    print(f"[Admin] 🗑 company_requirements/{company_id} deleted by {admin_uid}")


# ─────────────────────────────────────────────────────────────────────────────
# Generate Shortlist (full ranked pipeline)
# ───────────────────────────────────────────────────────────────────────────────

@router.post(
    "/generate-shortlist",
    response_model=ShortlistResponse,
    status_code=201,
    summary="Generate a ranked shortlist for a company + batch (admin only)",
)
async def generate_shortlist_ranked(
    body: GenerateShortlistRequest,
    admin_uid: str = Depends(require_admin),
) -> ShortlistResponse:
    """
    Full ranking pipeline:

    1. Load active algorithm weights from Firestore (fallback to defaults).
    2. Load company requirements.
    3. Stream all active students in the requested batch.
    4. For each student, load their pre-computed analytics from Firestore
       and re-score them using the LIVE weights (so a weight change takes
       effect immediately without re-fetching GitHub/LeetCode).
    5. Apply hard filters: minCGPA, minLeetCodeHard, minRepos.
    6. If company specifies requiredTopics, filter out students who have
       not solved at least one of those topic categories.
    7. Sort by score descending, take top-N.
    8. Persist shortlist document to Firestore.
    9. Return full ranked student details in the response.
    """

    # ── 1. Load live weights ───────────────────────────────────────────────────
    weights = load_weights()
    print(f"[Admin:Shortlist] Using weights: {weights.model_dump()}")

    # ── 2. Load company requirements ───────────────────────────────────────────
    company_doc = db.collection("company_requirements").document(body.companyId).get()
    if not company_doc.exists:
        raise HTTPException(status_code=404, detail=f"Company '{body.companyId}' not found")

    req              = company_doc.to_dict()
    min_cgpa         = float(req.get("minCGPA", 0.0))
    min_hard         = int(req.get("minLeetCodeHard", 0))
    min_repos        = int(req.get("minRepos", 0))
    required_topics  = set(req.get("requiredTopics", []))
    company_name     = req.get("companyName", "")

    print(f"[Admin:Shortlist] company={company_name}  batch={body.batch}  topN={body.topN}")
    print(f"[Admin:Shortlist] filters: minCGPA={min_cgpa}  minHard={min_hard}  minRepos={min_repos}  topics={required_topics}")

    # ── 3. Stream active students in the batch ──────────────────────────────────
    student_query = (
        db.collection("users")
        .where("batch", "==", body.batch)
        .where("role", "==", "student")
        .where("isActive", "==", True)
    )

    # Collect candidates: list of (uid, user_data)
    candidates: list[tuple[str, dict, float]] = []  # (uid, user_data, computed_score)

    for student_doc in student_query.stream():
        uid       = student_doc.id
        user_data = student_doc.to_dict()

        cgpa      = float(user_data.get("cgpa",             0.0))
        lc_hard   = int(user_data.get("leetcodeHardCount",  0))
        gh_repos  = int(user_data.get("githubRepoCount",    0))

        # ─ Hard filters ────────────────────────────────────────────────────────────
        if cgpa    < min_cgpa:  continue
        if lc_hard < min_hard:  continue
        if gh_repos< min_repos: continue

        # ─ Topic filter (cross-join with analytics collection) ─────────────────
        if required_topics:
            analytics_snap = db.collection("analytics").document(uid).get()
            if not analytics_snap.exists:
                continue
            solved_tags = set(
                analytics_snap.to_dict()
                .get("leetcode", {})
                .get("topicTags", {})
                .keys()
            )
            if not required_topics.intersection(solved_tags):
                continue

        # ─ Re-score using live weights from stored analytics ──────────────────
        analytics_doc = db.collection("analytics").document(uid).get()
        if analytics_doc.exists:
            ad = analytics_doc.to_dict()
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
            # Fall back to denormalised fields stored on the user doc
            gh_stats = GitHubStats(totalRepos=gh_repos)
            lc_stats = LeetCodeStats(hard=lc_hard)

        computed_score = calculate_score(gh_stats, lc_stats, cgpa, weights)
        candidates.append((uid, user_data, computed_score))

    print(f"[Admin:Shortlist] {len(candidates)} candidates passed filters")

    # ── 4. Sort descending by score, take top-N ─────────────────────────────────
    candidates.sort(key=lambda x: x[2], reverse=True)
    selected = candidates[: body.topN]

    # ── 5. Build typed ranked-student list ──────────────────────────────────────
    ranked: list[RankedStudent] = []
    uid_list: list[str] = []

    for rank_index, (uid, user_data, score) in enumerate(selected, start=1):
        grade = calculate_grade(score)
        ranked.append(
            RankedStudent(
                rank             = rank_index,
                uid              = uid,
                name             = user_data.get("name"),
                email            = user_data.get("email"),
                score            = round(score, 2),
                grade            = grade,
                cgpa             = user_data.get("cgpa"),
                leetcodeHard     = user_data.get("leetcodeHardCount", 0),
                githubRepos      = user_data.get("githubRepoCount", 0),
                githubUsername   = user_data.get("githubUsername"),
                leetcodeUsername = user_data.get("leetcodeUsername"),
                batch            = user_data.get("batch"),
                branch           = user_data.get("branch"),
            )
        )
        uid_list.append(uid)

    print(f"[Admin:Shortlist] ✅ Final shortlist: {len(ranked)} students (topN={body.topN})")
    for s in ranked:
        print(f"[Admin:Shortlist]   #{s.rank}  {s.uid}  score={s.score}  grade={s.grade}")

    # ── 6. Persist to Firestore ───────────────────────────────────────────────────
    shortlist_id = str(uuid.uuid4())
    firestore_doc = {
        "companyId":        body.companyId,
        "companyName":      company_name,
        "batch":            body.batch,
        "generatedBy":      admin_uid,
        "selectedStudents": uid_list,
        "totalCandidates":  len(candidates),
        "topN":             body.topN,
        "weightsSnapshot":  weights.model_dump(),
        "rankedStudents": [
            {
                "rank":             s.rank,
                "uid":              s.uid,
                "name":             s.name,
                "score":            s.score,
                "grade":            s.grade,
                "cgpa":             s.cgpa,
                "leetcodeHard":     s.leetcodeHard,
                "githubRepos":      s.githubRepos,
                "githubUsername":   s.githubUsername,
                "leetcodeUsername": s.leetcodeUsername,
                "batch":            s.batch,
                "branch":           s.branch,
            }
            for s in ranked
        ],
        "createdAt": firestore.SERVER_TIMESTAMP,
    }
    db.collection("shortlists").document(shortlist_id).set(firestore_doc)
    print(f"[Admin:Shortlist] ✅ shortlists/{shortlist_id} written to Firestore")

    return ShortlistResponse(
        shortlistId      = shortlist_id,
        companyId        = body.companyId,
        companyName      = company_name,
        batch            = body.batch,
        generatedBy      = admin_uid,
        selectedStudents = uid_list,
        rankedStudents   = ranked,
        totalCandidates  = len(candidates),
        createdAt        = None,
    )


# ───────────────────────────────────────────────────────────────────────────────
# Shortlists (legacy simple-filter endpoint)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/shortlists",
    response_model=ShortlistResponse,
    status_code=201,
    summary="Generate a shortlist for a company + batch (admin only)",
)
async def generate_shortlist(
    body: GenerateShortlistRequest,
    admin_uid: str = Depends(require_admin),
) -> ShortlistResponse:
    """
    1. Loads the company requirement by companyId.
    2. Streams users with the requested batch.
    3. Filters by minCGPA, minLeetCodeHard, minRepos.
    4. Optionally boosts students who have solved the requiredTopics.
    5. Writes the result to shortlists/{shortlistId}.
    """
    # ── Load company requirements ─────────────────────────────────────────────
    company_doc = db.collection("company_requirements").document(body.companyId).get()
    if not company_doc.exists:
        raise HTTPException(status_code=404, detail=f"Company '{body.companyId}' not found")

    req = company_doc.to_dict()
    min_cgpa         = req.get("minCGPA", 0.0)
    min_hard         = req.get("minLeetCodeHard", 0)
    min_repos        = req.get("minRepos", 0)
    required_topics  = set(req.get("requiredTopics", []))
    company_name     = req.get("companyName", "")

    print(f"[Admin] Generating shortlist — company={company_name}  batch={body.batch}")
    print(f"[Admin]   minCGPA={min_cgpa}  minHard={min_hard}  minRepos={min_repos}")

    # ── Stream matching students ──────────────────────────────────────────────
    query = (
        db.collection("users")
        .where("batch", "==", body.batch)
        .where("role", "==", "student")
        .where("isActive", "==", True)
    )

    selected: list[str] = []
    for doc in query.stream():
        data      = doc.to_dict()
        uid       = doc.id
        cgpa      = data.get("cgpa", 0.0)
        lc_hard   = data.get("leetcodeHardCount", 0)
        gh_repos  = data.get("githubRepoCount", 0)

        if cgpa < min_cgpa:
            continue
        if lc_hard < min_hard:
            continue
        if gh_repos < min_repos:
            continue

        # Optional topic check — if company specifies topics, student must have
        # solved at least one of them (checked via analytics collection)
        if required_topics:
            analytics_doc = db.collection("analytics").document(uid).get()
            if analytics_doc.exists:
                solved_tags = set(
                    analytics_doc.to_dict()
                    .get("leetcode", {})
                    .get("topicTags", {})
                    .keys()
                )
                if not required_topics.intersection(solved_tags):
                    continue
            else:
                continue  # no analytics → skip if topics are required

        selected.append(uid)

    print(f"[Admin] ✅ Shortlist: {len(selected)} students selected")

    # ── Persist shortlist ─────────────────────────────────────────────────────
    shortlist_id = str(uuid.uuid4())
    shortlist_doc = {
        "companyId":        body.companyId,
        "companyName":      company_name,
        "batch":            body.batch,
        "generatedBy":      admin_uid,
        "selectedStudents": selected,
        "createdAt":        firestore.SERVER_TIMESTAMP,
    }
    db.collection("shortlists").document(shortlist_id).set(shortlist_doc)

    return ShortlistResponse(
        shortlistId=shortlist_id,
        companyId=body.companyId,
        companyName=company_name,
        batch=body.batch,
        generatedBy=admin_uid,
        selectedStudents=selected,
        createdAt=None,
    )


@router.get(
    "/shortlists",
    response_model=list[ShortlistResponse],
    summary="List shortlists (optionally filter by batch or company)",
)
async def list_shortlists(
    admin_uid: str = Depends(require_admin),
    batch: Optional[str] = Query(None, description="Filter by batch, e.g. 2026"),
    company_id: Optional[str] = Query(None, description="Filter by companyId"),
) -> list[ShortlistResponse]:
    query = db.collection("shortlists").order_by(
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
        results.append(
            ShortlistResponse(
                shortlistId=doc.id,
                createdAt=str(created_at) if created_at else None,
                **data,
            )
        )
    return results
