"""
Router: /auth/*
===============
Multi-tenant registration endpoints.

POST /auth/admin-register   — creates university + admin account
POST /auth/student-register — creates student account under an existing university

Flow
────
1.  Create Firebase Auth user (email + password).
2.  Write Firestore document under the university sub-collection.
3.  Set custom claims on the Firebase Auth user so the ID token contains
    { universityId, role } — these claims are read by the auth middleware
    on every subsequent request without an additional Firestore lookup.

Custom claims propagation
─────────────────────────
Firebase custom claims are embedded in new ID tokens issued AFTER the claims
are set. The client must call firebase.auth().currentUser.getIdToken(true)
(force-refresh) immediately after login / registration to receive a token
that includes the claims.
"""

import uuid
from datetime import datetime, timezone

import firebase_admin.auth
from fastapi import APIRouter, HTTPException
from google.cloud import firestore

from config.firebase import db
from models.admin_models import (
    AdminRegisterRequest,
    AdminRegisterResponse,
    StudentRegisterRequest,
    StudentRegisterResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


# ─────────────────────────────────────────────────────────────────────────────
# Admin Registration
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/admin-register",
    response_model=AdminRegisterResponse,
    status_code=201,
    summary="Register a new university and its first admin account",
)
async def admin_register(body: AdminRegisterRequest) -> AdminRegisterResponse:
    """
    Creates:
      • Firebase Auth user for the admin.
      • universities/{universityId}  — university root document.
      • universities/{universityId}/admins/{adminId} — admin profile.

    Sets custom claims { universityId, role: "admin" } on the Firebase Auth user.
    """
    print(f"[Auth] 📨 admin-register → university='{body.universityName}'  email='{body.email}'")

    # ── 1. Create Firebase Auth user ──────────────────────────────────────────
    try:
        fb_user = firebase_admin.auth.create_user(
            email=body.email,
            password=body.password,
            display_name=body.adminName,
        )
        admin_uid = fb_user.uid
        print(f"[Auth] ✅ Firebase Auth user created: {admin_uid}")
    except firebase_admin.auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=409, detail="Email already registered")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Firebase Auth error: {exc}")

    # ── 2. Create Firestore documents ─────────────────────────────────────────
    university_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    batch = db.batch()

    # universities/{universityId}
    uni_ref = db.collection("universities").document(university_id)
    batch.set(uni_ref, {
        "name":      body.universityName,
        "createdAt": firestore.SERVER_TIMESTAMP,
    })

    # universities/{universityId}/admins/{adminUid}
    admin_ref = uni_ref.collection("admins").document(admin_uid)
    batch.set(admin_ref, {
        "name":         body.adminName,
        "email":        body.email,
        "role":         "admin",
        "universityId": university_id,
        "createdAt":    firestore.SERVER_TIMESTAMP,
    })

    # default algorithm_config/current so the university is ready out-of-the-box
    algo_ref = uni_ref.collection("algorithm_config").document("current")
    batch.set(algo_ref, {
        "weights": {
            "leetcode_easy":   5.0,
            "leetcode_medium": 8.0,
            "leetcode_hard":   12.0,
            "github_repos":    5.0,
            "github_stars":    5.0,
            "cgpa":            10.0,
        },
        "updatedBy":  admin_uid,
        "updatedAt":  firestore.SERVER_TIMESTAMP,
    })

    batch.commit()
    print(f"[Auth] ✅ Firestore docs created — universityId={university_id}")

    # ── 3. Set custom claims ──────────────────────────────────────────────────
    firebase_admin.auth.set_custom_user_claims(admin_uid, {
        "universityId": university_id,
        "role":         "admin",
    })
    print(f"[Auth] ✅ Custom claims set on {admin_uid}")

    return AdminRegisterResponse(
        universityId=university_id,
        adminId=admin_uid,
        message=(
            "University and admin account created. "
            "Call getIdToken(true) on the client to refresh the token with platform claims."
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Student Registration
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/student-register",
    response_model=StudentRegisterResponse,
    status_code=201,
    summary="Register a student under an existing university",
)
async def student_register(body: StudentRegisterRequest) -> StudentRegisterResponse:
    """
    Creates:
      • Firebase Auth user for the student.
      • universities/{universityId}/students/{studentId} — student profile.

    Sets custom claims { universityId, role: "student" } on the Firebase Auth user.

    Raises 404 if the universityId does not exist.
    """
    print(f"[Auth] 📨 student-register → university='{body.universityId}'  email='{body.email}'")

    # ── 1. Verify university exists ───────────────────────────────────────────
    uni_ref = db.collection("universities").document(body.universityId)
    if not uni_ref.get().exists:
        raise HTTPException(status_code=404, detail=f"University '{body.universityId}' not found")

    # ── 2. Create Firebase Auth user ──────────────────────────────────────────
    try:
        fb_user = firebase_admin.auth.create_user(
            email=body.email,
            password=body.password,
            display_name=body.name,
        )
        student_uid = fb_user.uid
        print(f"[Auth] ✅ Firebase Auth user created: {student_uid}")
    except firebase_admin.auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=409, detail="Email already registered")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Firebase Auth error: {exc}")

    # ── 3. Firestore student profile ──────────────────────────────────────────
    student_ref = uni_ref.collection("students").document(student_uid)
    student_ref.set({
        "name":         body.name,
        "email":        body.email,
        "role":         "student",
        "batch":        body.batch,
        "branch":       body.branch,
        "cgpa":         body.cgpa,
        "universityId": body.universityId,
        "isActive":     True,
        "createdAt":    firestore.SERVER_TIMESTAMP,
    })
    print(f"[Auth] ✅ Firestore student doc created — studentId={student_uid}")

    # ── 4. Set custom claims ──────────────────────────────────────────────────
    firebase_admin.auth.set_custom_user_claims(student_uid, {
        "universityId": body.universityId,
        "role":         "student",
    })
    print(f"[Auth] ✅ Custom claims set on {student_uid}")

    return StudentRegisterResponse(
        studentId=student_uid,
        universityId=body.universityId,
        message=(
            "Student account created. "
            "Call getIdToken(true) on the client to refresh the token with platform claims."
        ),
    )
