"""
Multi-tenant role-based authentication middleware for FastAPI.

Architecture
────────────
  Firebase Auth custom claims carry two fields:
    • universityId  — the Firestore university document this user belongs to
    • role          — "admin" | "student"

  These are set server-side during registration (admin-register / student-register)
  so every subsequent API call is fully self-contained — no extra Firestore lookup
  is required to determine tenant or role.

Usage
─────
  from core.auth_middleware import get_current_admin, get_current_student, CurrentUser

  # Admin-only endpoint
  @router.post("/something")
  async def my_endpoint(user: CurrentUser = Depends(get_current_admin)):
      # user.uid, user.university_id, user.role available
      ...

  # Student-only endpoint
  @router.get("/something")
  async def my_endpoint(user: CurrentUser = Depends(get_current_student)):
      ...

  # Any authenticated user
  @router.get("/something")
  async def my_endpoint(user: CurrentUser = Depends(get_current_user)):
      ...

The frontend must send the Firebase ID token in the Authorization header:
  Authorization: Bearer <firebase_id_token>
"""

from typing import Optional

import firebase_admin.auth
from fastapi import Depends, Header, HTTPException
from pydantic import BaseModel


# ── Typed user context ────────────────────────────────────────────────────────

class CurrentUser(BaseModel):
    """Decoded token identity, available as a FastAPI dependency."""
    uid:           str
    university_id: str
    role:          str            # "admin" | "student"
    email:         Optional[str] = None


# ── Token extraction & claims parsing ────────────────────────────────────────

async def get_current_user(authorization: str = Header(...)) -> CurrentUser:
    """
    Verifies the Firebase Bearer ID token and extracts the caller's
    identity from the JWT's custom claims.

    Raises 401 when the token is missing / invalid / expired.
    Raises 403 when the token lacks the required custom claims
    (i.e. the user was not registered through the platform).
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header must be 'Bearer <firebase_id_token>'",
        )

    token = authorization[len("Bearer "):]
    try:
        decoded = firebase_admin.auth.verify_id_token(token)
    except firebase_admin.auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token has expired — please sign in again")
    except firebase_admin.auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {exc}")

    uid           = decoded["uid"]
    university_id = decoded.get("universityId")
    role          = decoded.get("role")

    if not university_id or not role:
        raise HTTPException(
            status_code=403,
            detail=(
                "User has no platform claims. "
                "Please register through /api/auth/admin-register or /api/auth/student-register."
            ),
        )

    return CurrentUser(
        uid=uid,
        university_id=university_id,
        role=role,
        email=decoded.get("email"),
    )


# ── Role-scoped dependencies ──────────────────────────────────────────────────

async def get_current_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """
    Dependency: caller must have role='admin'.
    Returns the full CurrentUser context (includes university_id).
    Raises 403 if the role is not 'admin'.
    """
    if user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied — admin role required",
        )
    return user


async def get_current_student(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """
    Dependency: caller must have role='student'.
    Returns the full CurrentUser context (includes university_id).
    Raises 403 if the role is not 'student'.
    """
    if user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Access denied — student role required",
        )
    return user


# ── Backwards-compatibility shims (used by legacy routers) ───────────────────

async def require_authenticated(user: CurrentUser = Depends(get_current_user)) -> str:
    """Legacy shim — returns uid only."""
    return user.uid


async def require_admin(user: CurrentUser = Depends(get_current_admin)) -> str:
    """Legacy shim — returns uid only."""
    return user.uid
