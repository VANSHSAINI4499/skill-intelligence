"""
Role-based authentication middleware for FastAPI.

Usage
─────
  from core.auth_middleware import require_admin, require_authenticated

  # Admin-only endpoint
  @router.post("/something")
  async def my_endpoint(admin_uid: str = Depends(require_admin)):
      ...

  # Any authenticated user
  @router.get("/something")
  async def my_endpoint(uid: str = Depends(require_authenticated)):
      ...

The frontend must send the Firebase ID token in the Authorization header:
  Authorization: Bearer <firebase_id_token>
"""

import firebase_admin.auth
from fastapi import Depends, Header, HTTPException

from config.firebase import db


# ── Token extraction helper ───────────────────────────────────────────────────

async def _extract_uid(authorization: str = Header(...)) -> str:
    """
    Verifies the Firebase Bearer ID token supplied in the Authorization header
    and returns the Firebase UID of the caller.

    Raises 401 if the token is missing, malformed, or expired.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header must be 'Bearer <firebase_id_token>'",
        )

    token = authorization[len("Bearer "):]
    try:
        decoded = firebase_admin.auth.verify_id_token(token)
        return decoded["uid"]
    except firebase_admin.auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token has expired — please sign in again")
    except firebase_admin.auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {exc}")


# ── Public dependencies ───────────────────────────────────────────────────────

async def require_authenticated(uid: str = Depends(_extract_uid)) -> str:
    """
    Dependency: any valid Firebase user.
    Returns the caller's UID.
    """
    return uid


async def require_admin(uid: str = Depends(_extract_uid)) -> str:
    """
    Dependency: Firebase token must belong to a user with role='admin'
    in the users/{uid} Firestore document.

    Returns the admin's UID on success.
    Raises 403 if user lacks admin role.
    """
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=403, detail="User not found in Firestore")

    if user_doc.to_dict().get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied — admin role required",
        )

    return uid
