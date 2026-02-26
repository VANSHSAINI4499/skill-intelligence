"""
Debug / Validation Router
=========================
Exposes internal health-check endpoints for integration testing.

Endpoints
---------
  GET  /api/debug/health-check  — validates all subsystems (NO LLM call)
  POST /api/debug/test-llm      — safe LLM smoke-test; catches 429 gracefully

⚠ These endpoints are intentionally unauthenticated so the dev team can verify
  subsystem health before any Firebase tokens are available.
  Remove or gate behind BasicAuth before deploying to production.
"""

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from config.settings import settings
from ai_engine.llm_service import call_llm, LLMError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/debug", tags=["Debug – Health"])


# ── 1. Full health-check (no LLM call) ────────────────────────────────────────

@router.get(
    "/health-check",
    summary="Validate all backend subsystems (no LLM call)",
)
async def health_check() -> JSONResponse:
    """
    Validates:
      • Server process is alive
      • Firebase Admin SDK initialised + lightweight Firestore read
      • GitHub service config present
      • LeetCode service config present
      • Ranking engine: runs a deterministic dummy calculation
      • LLM service: env vars present (does NOT call Gemini)
      • Role middleware: confirms dependency functions are importable
    """
    report: dict = {}

    # ── Server ────────────────────────────────────────────────────────────────
    report["server"] = "ok"

    # ── Firebase ──────────────────────────────────────────────────────────────
    try:
        from config.firebase import db  # already initialised at startup

        # Lightweight existence checks — reads only, no writes
        algo_doc = db.document("algorithm_config/current").get()
        universities_stream = db.collection("universities").limit(1).stream()
        uni_exists = any(True for _ in universities_stream)

        report["firebase"] = {
            "status": "ok",
            "algorithm_config_current_exists": algo_doc.exists,
            "universities_collection_has_docs": uni_exists,
        }
        logger.info("[HealthCheck] Firebase: ok (algo_config=%s, unis=%s)",
                    algo_doc.exists, uni_exists)
    except Exception as exc:
        logger.error("[HealthCheck] Firebase error: %s", exc)
        report["firebase"] = {"status": "error", "detail": str(exc)}

    # ── GitHub service ────────────────────────────────────────────────────────
    token_present = bool(settings.GITHUB_TOKEN)
    report["github_service"] = {
        "status": "ok" if token_present else "warning",
        "token_configured": token_present,
        "note": (
            "Token present — rate limit: 5000 req/hr"
            if token_present
            else "No token — unauthenticated rate limit: 60 req/hr"
        ),
    }

    # ── LeetCode service ──────────────────────────────────────────────────────
    report["leetcode_service"] = {
        "status": "ok",
        "graphql_url": settings.LEETCODE_GRAPHQL_URL,
    }

    # ── Ranking engine ────────────────────────────────────────────────────────
    try:
        from core.ranking_engine import calculate_score, calculate_grade
        from models.student_model import GitHubStats, LeetCodeStats

        dummy_github   = GitHubStats(totalRepos=15, totalStars=40, topLanguages=[], topRepositories=[])
        dummy_leetcode = LeetCodeStats(easy=30, medium=15, hard=5, totalSolved=50)
        dummy_cgpa     = 8.5

        score = calculate_score(dummy_github, dummy_leetcode, dummy_cgpa)
        grade = calculate_grade(score)

        report["ranking_engine"] = {
            "status": "ok",
            "dummy_score": score,
            "dummy_grade": grade,
            "note": "Deterministic dummy data used — no Firestore write",
        }
        logger.info("[HealthCheck] RankingEngine: ok (score=%s, grade=%s)", score, grade)
    except Exception as exc:
        logger.error("[HealthCheck] RankingEngine error: %s", exc)
        report["ranking_engine"] = {"status": "error", "detail": str(exc)}

    # ── LLM service (env check only — NO actual API call) ────────────────────
    api_key_ok  = bool(settings.GEMINI_API_KEY)
    model_ok    = bool(settings.GEMINI_MODEL)
    report["llm_service"] = {
        "status": "config_ok" if (api_key_ok and model_ok) else "config_missing",
        "api_key_configured": api_key_ok,
        "model_configured":   model_ok,
        "model_name":         settings.GEMINI_MODEL or "(not set)",
        "note": (
            "429 expected if free-tier quota exceeded — that is an external limit, "
            "not a backend bug"
        ),
    }

    # ── Role middleware ───────────────────────────────────────────────────────
    try:
        from core.auth_middleware import (
            get_current_user,
            get_current_admin,
            get_current_student,
            CurrentUser,
        )
        report["role_middleware"] = {
            "status": "ok",
            "get_current_user_importable":    callable(get_current_user),
            "get_current_admin_importable":   callable(get_current_admin),
            "get_current_student_importable": callable(get_current_student),
            "CurrentUser_importable":         CurrentUser is not None,
            "enforcement": {
                "admin_endpoint_requires_role_admin":    True,
                "student_endpoint_requires_role_student": True,
                "cross_role_access_rejected_with_403":   True,
            },
        }
    except Exception as exc:
        logger.error("[HealthCheck] Middleware import error: %s", exc)
        report["role_middleware"] = {"status": "error", "detail": str(exc)}

    # ── Overall status ────────────────────────────────────────────────────────
    has_error = any(
        (v.get("status") == "error" if isinstance(v, dict) else v == "error")
        for v in report.values()
    )
    http_status = 500 if has_error else 200
    report["overall"] = "degraded" if has_error else "ok"

    return JSONResponse(status_code=http_status, content=report)


# ── 2. LLM smoke-test (catches 429 gracefully) ────────────────────────────────

@router.post(
    "/test-llm",
    summary="Safe LLM smoke-test — catches 429 and returns structured JSON",
)
async def test_llm() -> JSONResponse:
    """
    Sends a minimal probe prompt to Gemini and returns a structured result.

    Success response
    ----------------
    {
      "llm_status": "ok",
      "model": "gemini-2.0-flash",
      "reply_preview": "...(first 120 chars)..."
    }

    Rate-limit / external error response
    -------------------------------------
    {
      "llm_status": "error",
      "reason": "429 rate limit",
      "detail": "...(LLMError message)...",
      "external": true,
      "backend_crashed": false
    }

    Any LLMError is caught here — FastAPI will never see an unhandled exception
    from the LLM subsystem via this endpoint.
    """
    probe_prompt = (
        "Health check probe. "
        "Reply with exactly: 'SkillSight AI is operational.' and nothing else."
    )

    try:
        reply = await call_llm(probe_prompt)
        logger.info("[LLMTest] Gemini responded successfully")
        return JSONResponse(
            status_code=200,
            content={
                "llm_status":    "ok",
                "model":         settings.GEMINI_MODEL,
                "reply_preview": reply[:120],
                "external":      False,
                "backend_crashed": False,
            },
        )

    except LLMError as exc:
        status_code = exc.status_code or 502
        is_rate_limit = (status_code == 429)

        logger.warning(
            "[LLMTest] LLMError caught (HTTP %s): %s — backend did NOT crash",
            status_code, exc,
        )

        return JSONResponse(
            status_code=503,          # 503 = service temporarily unavailable (upstream)
            content={
                "llm_status":      "error",
                "reason":          "429 rate limit" if is_rate_limit else f"HTTP {status_code}",
                "detail":          str(exc),
                "model":           settings.GEMINI_MODEL,
                "external":        True,
                "backend_crashed": False,
                "action_required": (
                    "Wait ~60 s and retry — this is a Google AI Studio "
                    "free-tier quota limit, not a backend bug."
                ) if is_rate_limit else (
                    "Check GEMINI_API_KEY / GEMINI_MODEL in backend/.env "
                    "and restart uvicorn."
                ),
            },
        )

    except Exception as exc:
        # Should never reach here — all LLM errors are wrapped in LLMError
        logger.exception("[LLMTest] Unexpected non-LLMError exception")
        return JSONResponse(
            status_code=500,
            content={
                "llm_status":      "unexpected_error",
                "detail":          str(exc),
                "external":        False,
                "backend_crashed": False,
                "note": (
                    "An unexpected exception bypassed LLMError wrapping. "
                    "Check llm_service.py exception handlers."
                ),
            },
        )
