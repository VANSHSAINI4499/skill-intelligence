"""
LLM Service
===========
Async wrapper around the OpenAI Chat Completions API.

Uses httpx.AsyncClient — no OpenAI SDK dependency, same pattern as before.

Usage
-----
    from ai_engine.llm_service import call_llm

    response: str = await call_llm(prompt)
    response: str = await call_llm(prompt, system_prompt="You are …")

Requires
--------
    OPENAI_API_KEY  — set in backend/.env
    OPENAI_MODEL    — defaults to "gpt-4o-mini"

Error handling
--------------
    * Missing API key   → RuntimeError at import time (fail fast)
    * HTTP 4xx / 5xx    → LLMError with status code and message
    * Empty choices     → LLMError
    * Network timeouts  → LLMError wrapping httpx.TimeoutException
"""

import logging
from typing import Any

import httpx

from config.settings import settings

logger = logging.getLogger(__name__)

# ── Validate key at startup — fail fast, never log the value ─────────────────
if not settings.OPENAI_API_KEY:
    raise RuntimeError(
        "OPENAI_API_KEY is not set. "
        "Add it to your .env file: OPENAI_API_KEY=sk-..."
    )

# ── OpenAI Chat Completions endpoint ─────────────────────────────────────────
_OPENAI_URL = "https://api.openai.com/v1/chat/completions"

# Default system persona — domain-specific career coach identity
_DEFAULT_SYSTEM = (
    "You are SkillSight AI, a highly precise, data-driven career coach for software engineering students.\n\n"

    "You receive structured student performance data including:\n"
    "- score, grade (A/B/C/D), percentile\n"
    "- group average and batch average\n"
    "- LeetCode topic breakdown (if available)\n"
    "- GitHub language distribution (if available)\n\n"

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    "CORE RULES (STRICT)\n"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

    "1. ONLY use the provided data. NEVER assume missing information.\n"
    "2. If data is missing, explicitly say:\n"
    "   'Insufficient data to determine this.'\n"
    "3. NEVER generate generic advice.\n"
    "4. NEVER contradict the student's performance level.\n"
    "5. Every insight MUST be backed by the input data.\n"

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    "PERFORMANCE-AWARE BEHAVIOR\n"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

    "GRADE A (Top performers, percentile > 80):\n"
    "- DO NOT suggest beginner topics.\n"
    "- Focus on optimization, advanced problem-solving, consistency, and specialization.\n"
    "- Suggest real-world projects, system design, and scaling skills.\n"
    "- If no topic data exists → DO NOT say 'no strengths', say data is missing.\n\n"

    "GRADE B (Above average):\n"
    "- Focus on strengthening weak areas and improving consistency.\n"
    "- Suggest moving toward advanced topics gradually.\n\n"

    "GRADE C (Average):\n"
    "- Focus on structured improvement and core concept clarity.\n"
    "- Identify weak areas and recommend targeted practice.\n\n"

    "GRADE D (Below average):\n"
    "- Focus on fundamentals and recovery.\n"
    "- Suggest basic topics, repetition, and structured learning.\n"

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    "GAP ANALYSIS RULES\n"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

    "- Always interpret:\n"
    "  groupGap = studentScore - groupAverage\n"
    "  batchGap = studentScore - batchAverage\n\n"

    "- If gap is negative → student is below average\n"
    "- If gap is positive → student is above average\n\n"

    "- Always explain BOTH:\n"
    "  1. Group comparison (primary, fair comparison)\n"
    "  2. Batch comparison (secondary, long-term goal)\n"

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    "DATA HANDLING RULES\n"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

    "- If LeetCode data is empty:\n"
    "  → Say 'No LeetCode topic data available'\n"
    "- If GitHub data is empty:\n"
    "  → Say 'No GitHub language data available'\n"
    "- NEVER fabricate strengths or weaknesses\n"

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    "OUTPUT STRUCTURE (MANDATORY)\n"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

    "1. Performance Summary\n"
    "- Explain score, percentile, and relative standing\n"
    "- Mention BOTH group and batch comparison\n\n"

    "2. Key Insights (NOT 'gaps' blindly)\n"
    "- Only include insights supported by data\n"
    "- If no data → explicitly state missing\n\n"

    "3. Skill Comparison\n"
    "- Compare with peers ONLY if data exists\n"
    "- Otherwise say comparison not possible\n\n"

    "4. Action Plan\n"
    "- Tailored to grade level (A/B/C/D)\n"
    "- Short-term (group improvement)\n"
    "- Long-term (batch improvement)\n\n"

    "5. Practice Recommendations\n"
    "- Based ONLY on available data\n"
    "- If no data → suggest tracking + exploration, NOT assumptions\n\n"

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    "FINAL PRIORITY\n"
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

    "Accuracy > Data Alignment > Relevance > Length\n"
)


# ── Custom exception ──────────────────────────────────────────────────────────

class LLMError(Exception):
    """Raised when the OpenAI API returns an error or an unusable response."""
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


# ── Public API ────────────────────────────────────────────────────────────────

async def call_llm(prompt: str, system_prompt: str | None = None) -> str:
    """
    Send a prompt to OpenAI Chat Completions and return the generated text.

    OpenAI natively supports a 'system' role, so the system instruction is
    passed as the first message in the messages array — cleaner than the
    Gemini user/model turn workaround.

    Parameters
    ----------
    prompt        : Main user-turn content (may include structured gap data).
    system_prompt : Optional override for the system persona.

    Returns
    -------
    str — the model's text response, stripped of leading/trailing whitespace.

    Raises
    ------
    LLMError — on any API / network / parsing failure.
    """
    system = system_prompt or _DEFAULT_SYSTEM

    payload: dict[str, Any] = {
        "model": settings.OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 1024,
    }

    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type":  "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(_OPENAI_URL, json=payload, headers=headers)
    except httpx.TimeoutException as exc:
        raise LLMError(
            "OpenAI API request timed out after 30 s. "
            "Check your internet connection or increase the timeout in llm_service.py."
        ) from exc
    except httpx.RequestError as exc:
        raise LLMError(
            f"Network error contacting OpenAI API: {exc}. "
            "Ensure the server has outbound HTTPS access to api.openai.com."
        ) from exc

    # ── HTTP error handling ────────────────────────────────────────────────────
    if resp.status_code == 400:
        raise LLMError(
            f"OpenAI API: bad request (400) — the request payload may be malformed. "
            f"Check model name '{settings.OPENAI_MODEL}' in .env and the messages structure. "
            f"Detail: {resp.text[:300]}",
            400,
        )
    if resp.status_code == 401:
        raise LLMError(
            "OpenAI API: invalid API key (401). "
            "Check OPENAI_API_KEY in backend/.env and restart uvicorn.",
            401,
        )
    if resp.status_code == 403:
        raise LLMError(
            "OpenAI API: access forbidden (403). "
            "Your API key may not have access to the requested model. "
            f"Current model: '{settings.OPENAI_MODEL}'.",
            403,
        )
    if resp.status_code == 404:
        raise LLMError(
            f"OpenAI API: model '{settings.OPENAI_MODEL}' not found (404). "
            "Set OPENAI_MODEL=gpt-4o-mini in backend/.env and restart uvicorn.",
            404,
        )
    if resp.status_code == 429:
        raise LLMError(
            "OpenAI API: rate limit or quota exceeded (429). "
            "Wait before retrying. Check your usage at https://platform.openai.com/usage.",
            429,
        )
    if resp.status_code >= 500:
        raise LLMError(
            f"OpenAI API: server-side error {resp.status_code}. "
            "This is an OpenAI outage — retry in a few minutes.",
            resp.status_code,
        )
    if resp.status_code != 200:
        raise LLMError(
            f"OpenAI API: unexpected status {resp.status_code}. Response: {resp.text[:200]}",
            resp.status_code,
        )

    # ── Parse response ─────────────────────────────────────────────────────────
    try:
        data: dict[str, Any] = resp.json()
        text: str = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, ValueError) as exc:
        logger.error("Unexpected OpenAI response shape: %s", resp.text[:500])
        raise LLMError(
            "OpenAI API returned an unrecognisable response structure. "
            f"Expected choices[0].message.content — got: {resp.text[:200]}"
        ) from exc

    if not text or not text.strip():
        raise LLMError(
            "OpenAI API returned an empty response. "
            "This can happen when the prompt triggers a content filter."
        )

    return text.strip()
