"""
Router: /ai/*
=============
AI-powered chat endpoints for the Batch-Aware Chatbot.

Endpoints
---------
  POST /ai/chat   — multi-mode chat (gap analysis, upgrade plan, interview)
  POST /ai/batch/recalculate  — admin trigger to refresh batch analytics cache
"""

import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from config.settings import settings
from core.auth_middleware import CurrentUser, get_current_student, get_current_admin
from ai_engine.knowledge_gap_engine import generate_knowledge_gap_report
from ai_engine.llm_service import call_llm, LLMError
from services.batch_analytics_service import recalculate_batch_analytics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Chat"])


# ── Request / Response models ──────────────────────────────────────────────────

ChatMode = Literal["gap_analysis", "upgrade_plan", "interview"]


class ChatRequest(BaseModel):
    mode:    ChatMode
    message: str


class ChatResponse(BaseModel):
    mode:     ChatMode
    reply:    str
    gapReport: dict | None = None   # Returned with gap_analysis mode


class RecalculateRequest(BaseModel):
    batch: str


# ── Prompt builders ────────────────────────────────────────────────────────────

def _build_gap_analysis_prompt(message: str, report: dict) -> str:
    return f"""
You are analysing a student's performance in their university batch.

=== STUDENT DATA ===
Student Grade  : {report['studentGrade']}
Student Score  : {report['studentScore']}
Batch Avg Score: {report['batchAvgScore']}
Score Gap      : {report['overallGap']} (negative = below average)
Percentile     : ~{report['percentileEstimate']}th percentile
Batch Size     : {report['batchSize']} students
Weak Skills    : {', '.join(report['weakSkills']) or 'None identified'}
Strong Skills  : {', '.join(report['strongSkills']) or 'None identified'}
Recommendation : {report['recommendationLevel']} priority improvement needed

=== STUDENT MESSAGE ===
{message}

=== YOUR TASK ===
Provide a clear, empathetic gap analysis. Explain:
1. Where the student stands relative to peers.
2. Which weak skills are having the most impact.
3. Two immediate, concrete next steps.
Keep the response under 250 words. Use plain language.
""".strip()


def _build_upgrade_plan_prompt(message: str, report: dict) -> str:
    current_grade = report['studentGrade']
    # Determine target grade
    grade_ladder = {"D": "C", "C": "B", "B": "A", "A": "A+", "F": "D"}
    target_grade = grade_ladder.get(current_grade, "next grade")

    return f"""
You are building a personalised study upgrade plan for a student.

=== STUDENT PROFILE ===
Current Grade  : {current_grade}
Target Grade   : {target_grade}
Current Score  : {report['studentScore']}
Batch Avg      : {report['batchAvgScore']}
Weak Skills    : {', '.join(report['weakSkills']) or 'None'}
Strong Skills  : {', '.join(report['strongSkills']) or 'None'}
Priority Level : {report['recommendationLevel']}

=== STUDENT REQUEST ===
{message}

=== YOUR TASK ===
Create a structured 4-week upgrade plan:
- Week 1: Foundation (address top weak skill)
- Week 2: Practice (projects or exercises)
- Week 3: Assessment prep (mock problems)
- Week 4: Review & mock interview simulation

For each week give 2-3 specific actions.
End with a motivational one-liner.
Keep total response under 350 words.
""".strip()


def _build_interview_prompt(message: str, report: dict) -> str:
    return f"""
You are preparing a student for a technical interview.

=== STUDENT CONTEXT ===
Grade          : {report['studentGrade']}
Score          : {report['studentScore']} (batch avg: {report['batchAvgScore']})
Strong Skills  : {', '.join(report['strongSkills']) or 'General CS'}
Weak Skills    : {', '.join(report['weakSkills']) or 'None noted'}

=== STUDENT MESSAGE ===
{message}

=== YOUR TASK ===
Respond as an interviewer + coach:
1. If the message is a question: answer it clearly with an example.
2. If the message asks for practice: give 2 coding/conceptual questions
   appropriate to grade {report['studentGrade']} level, with hints.
3. If the message is an attempt at a question: evaluate it, point out gaps,
   suggest improvements.

Keep response focused and under 300 words.
""".strip()


PROMPT_BUILDERS = {
    "gap_analysis":  _build_gap_analysis_prompt,
    "upgrade_plan":  _build_upgrade_plan_prompt,
    "interview":     _build_interview_prompt,
}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Batch-aware AI chat (student only)",
)
async def ai_chat(
    body: ChatRequest,
    user: CurrentUser = Depends(get_current_student),
) -> ChatResponse:
    """
    Multi-mode AI chat endpoint.

    Modes
    -----
    gap_analysis  — compares student to batch, explains gaps
    upgrade_plan  — generates a personalised week-by-week study plan
    interview     — simulates interview Q&A, evaluates answers

    Authentication
    --------------
    Requires a valid student Firebase ID token.
    University and batch are resolved from the student's Firestore document,
    ensuring strict multi-tenant isolation.
    """
    try:
        # 1. Build gap report (fetches student + batch analytics — multi-tenant safe)
        report = await generate_knowledge_gap_report(
            university_id=user.university_id,
            student_id=user.uid,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Student or batch data not found: {exc}. "
                "Verify the Firestore path /universities/{universityId}/students/{uid} "
                "exists and the JWT claim university_id is correct."
            ),
        )
    except Exception as exc:
        logger.exception("Failed to generate gap report for %s", user.uid)
        raise HTTPException(
            status_code=500,
            detail=(
                f"Analytics error while building gap report: {exc}. "
                "Check the uvicorn terminal for the full Python traceback."
            ),
        )

    # 2. Build the mode-specific prompt
    prompt_builder = PROMPT_BUILDERS[body.mode]
    prompt = prompt_builder(body.message, report)

    # 3. Call LLM
    try:
        reply = await call_llm(prompt)
    except LLMError as exc:
        # Propagate rate-limit (429) and auth errors (401/403) accurately;
        # everything else becomes 502 Bad Gateway.
        status = exc.status_code or 502
        if status in (401, 403):
            logger.error("Gemini auth error for user %s: %s", user.uid, exc)
            raise HTTPException(
                status_code=502,
                detail=(
                    f"Gemini API key rejected ({status}). "
                    "Fix: verify GEMINI_API_KEY in backend/.env is valid, "
                    "then restart uvicorn."
                ),
            )
        if status == 429:
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini free-tier rate limit exceeded. "
                    "Wait ~60 seconds and retry. "
                    "To prevent this, reduce call frequency or upgrade your Google AI Studio quota."
                ),
            )
        if status == 400:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Gemini rejected the request (400 bad request). "
                    f"Check GEMINI_MODEL in .env (current: {settings.GEMINI_MODEL}) "
                    "and verify the payload structure in llm_service.py."
                ),
            )
        logger.exception("LLM call failed for user %s", user.uid)
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API error (HTTP {status}): {exc}",
        )
    except Exception as exc:
        logger.exception("Unexpected LLM error for user %s", user.uid)
        raise HTTPException(
            status_code=502,
            detail=(
                f"Unexpected AI error: {exc}. "
                "Check the uvicorn terminal for the full Python traceback."
            ),
        )

    return ChatResponse(
        mode=body.mode,
        reply=reply,
        gapReport=report if body.mode == "gap_analysis" else None,
    )


@router.post(
    "/batch/recalculate",
    summary="Recalculate batch analytics (admin only)",
)
async def trigger_recalculate(
    body: RecalculateRequest,
    user: CurrentUser = Depends(get_current_admin),
) -> dict:
    """
    Admin-only endpoint to manually refresh the cached batch analytics
    for a given batch string (e.g. "2022-2026") within the admin's university.
    """
    try:
        result = await recalculate_batch_analytics(
            university_id=user.university_id,
            batch=body.batch,
        )
    except Exception as exc:
        logger.exception("Batch recalculate failed")
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "status":        "ok",
        "batch":         body.batch,
        "universityId":  user.university_id,
        "totalStudents": result["totalStudents"],
        "avgScore":      result["avgScore"],
    }
