"""
LLM Service
===========
Async wrapper around the Google Gemini REST API (generateContent).

Uses httpx.AsyncClient — no SDK import-time global state, no OpenAI dependency.

Usage
-----
    from ai_engine.llm_service import call_llm

    response: str = await call_llm(prompt)
    response: str = await call_llm(prompt, system_prompt="You are …")

Requires
--------
    GEMINI_API_KEY  — set in .env  (never logged, never exposed to frontend)
    GEMINI_MODEL    — defaults to "gemini-1.5-flash"

Error handling
--------------
    * Missing API key   → RuntimeError at import time (fail fast)
    * HTTP 4xx / 5xx    → LLMError with status code and message
    * Empty candidates  → LLMError
    * Network timeouts  → LLMError wrapping httpx.TimeoutException
"""

import logging
from typing import Any

import httpx

from config.settings import settings

logger = logging.getLogger(__name__)

# ── Validate key at startup — fail fast, never log the value ─────────────────
if not settings.GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not set. "
        "Add it to your .env file: GEMINI_API_KEY=your_key_here"
    )

# ── Gemini REST endpoint template ─────────────────────────────────────────────
# gemini-1.5-* models are served under v1beta, not v1
_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={key}"
)

# Default system persona injected as a leading user turn
_DEFAULT_SYSTEM = (
    "You are SkillSight AI, an expert academic and career advisor. "
    "You analyse students' technical skills, compare them against batch peers, "
    "and provide concise, actionable, structured guidance. "
    "Always respond in clear English. Never hallucinate data."
)


# ── Custom exception ──────────────────────────────────────────────────────────

class LLMError(Exception):
    """Raised when the Gemini API returns an error or an unusable response."""
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


# ── Public API ────────────────────────────────────────────────────────────────

async def call_llm(prompt: str, system_prompt: str | None = None) -> str:
    """
    Send a prompt to Gemini and return the generated text.

    The system instruction (if any) is prepended as a model-role turn so it
    works uniformly across Gemini 1.0 and 1.5 families.

    Parameters
    ----------
    prompt        : Main user-turn content (may include structured data).
    system_prompt : Optional override for the system persona.

    Returns
    -------
    str — the model's text response, stripped of leading/trailing whitespace.

    Raises
    ------
    LLMError — on any API / network / parsing failure.
    """
    system = system_prompt or _DEFAULT_SYSTEM

    # Gemini uses a flat `contents` list; we simulate system + user turns
    # by sending two consecutive "user" parts with a "model" acknowledgement.
    payload: dict[str, Any] = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": system}],
            },
            {
                "role": "model",
                "parts": [{"text": "Understood. I am ready to assist."}],
            },
            {
                "role": "user",
                "parts": [{"text": prompt}],
            },
        ],
        "generationConfig": {
            "temperature":     0.4,
            "maxOutputTokens": 1024,
        },
    }

    url = _GEMINI_URL.format(
        model=settings.GEMINI_MODEL,
        key=settings.GEMINI_API_KEY,   # key only in URL query param, never logged
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
    except httpx.TimeoutException as exc:
        raise LLMError(
            "Gemini API request timed out after 30 s. "
            "Check your internet connection or increase the timeout in llm_service.py."
        ) from exc
    except httpx.RequestError as exc:
        raise LLMError(
            f"Network error contacting Gemini API: {exc}. "
            "Ensure the server has outbound HTTPS access to generativelanguage.googleapis.com."
        ) from exc

    # ── HTTP error handling ────────────────────────────────────────────────────
    if resp.status_code == 400:
        raise LLMError(
            f"Gemini API: bad request (400) — model name '{settings.GEMINI_MODEL}' may be wrong "
            "or the request payload is malformed. Verify GEMINI_MODEL in .env.",
            400,
        )
    if resp.status_code in (401, 403):
        raise LLMError(
            f"Gemini API: API key unauthorised ({resp.status_code}). "
            "Check GEMINI_API_KEY in backend/.env and restart uvicorn.",
            resp.status_code,
        )
    if resp.status_code == 404:
        raise LLMError(
            f"Gemini API: model '{settings.GEMINI_MODEL}' not found (404). "
            "Set GEMINI_MODEL=gemini-2.0-flash in backend/.env and restart uvicorn.",
            404,
        )
    if resp.status_code == 429:
        raise LLMError(
            "Gemini API: free-tier rate limit exceeded (429). "
            "Wait ~60 seconds before retrying. "
            "Monitor quota at https://ai.dev/rate-limit.",
            429,
        )
    if resp.status_code >= 500:
        raise LLMError(
            f"Gemini API: server-side error {resp.status_code}. "
            "This is a Google outage — retry in a few minutes.",
            resp.status_code,
        )
    if resp.status_code != 200:
        raise LLMError(
            f"Gemini API: unexpected status {resp.status_code}. Response: {resp.text[:200]}",
            resp.status_code,
        )

    # ── Parse response ─────────────────────────────────────────────────────────
    try:
        data: dict[str, Any] = resp.json()
        text: str = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, ValueError) as exc:
        logger.error("Unexpected Gemini response shape: %s", resp.text[:500])
        raise LLMError(
            "Gemini API returned an unrecognisable response structure. "
            f"Expected candidates[0].content.parts[0].text — got: {resp.text[:200]}"
        ) from exc

    if not text or not text.strip():
        raise LLMError(
            "Gemini API returned an empty response body (candidates list may be empty). "
            "This can happen when the prompt triggers a safety filter."
        )

    return text.strip()
