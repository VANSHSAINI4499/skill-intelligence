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


# ── Shared prompt helpers ─────────────────────────────────────────────────────

def _fmt_weak_topics(topics: list[dict]) -> str:
    """Format top weak topics as a bullet list for injection into prompts."""
    if not topics:
        return "None identified"
    lines = []
    for t in topics:
        lines.append(
            f"  • {t['topic']} (student {t['studentPct']}% vs target {t['targetPct']}%)"
        )
    return "\n".join(lines)


def _fmt_strong_topics(topics: list[dict]) -> str:
    """Format top strong topics as a bullet list."""
    if not topics:
        return "None identified"
    return "\n".join(f"  • {t['topic']} ({t['studentPct']}%)" for t in topics)


def _fmt_language_gaps(lang_gaps: dict) -> str:
    """Format language gaps as a bullet list, deficits first."""
    if not lang_gaps:
        return "No significant language gaps detected"
    # Sort: biggest deficit (gap > 0) first, then advantages
    sorted_langs = sorted(lang_gaps.items(), key=lambda x: -x[1]["gap"])
    lines = []
    for lang, data in sorted_langs:
        direction = "needs improvement" if data["gap"] > 0 else "strength"
        lines.append(
            f"  • {lang}: student {data['studentPct']}% vs target {data['targetPct']}% ({direction})"
        )
    return "\n".join(lines)


# ── Prompt builders ────────────────────────────────────────────────────────────

def _build_gap_analysis_prompt(message: str, report: dict) -> str:
    return f"""
You are analysing a student's performance in their university batch.

=== STUDENT DATA ===
Student Grade  : {report['studentGrade']}
Target Grade   : {report['targetGrade']}
Student Score  : {report['studentScore']}
Batch Avg Score: {report['batchAvgScore']}
Score Gap      : {report['overallGap']} (negative = below average)
Percentile     : ~{report['percentileEstimate']}th percentile
Batch Size     : {report['batchSize']} students
Recommendation : {report['recommendationLevel']} priority improvement needed

=== TOPIC ANALYSIS (LeetCode) ===
Weak Topics (student % vs target grade %):
{_fmt_weak_topics(report.get('weakTopics', []))}

Strong Topics:
{_fmt_strong_topics(report.get('strongTopics', []))}

=== LANGUAGE ANALYSIS (GitHub) ===
{_fmt_language_gaps(report.get('languageGaps', {}))}

=== STUDENT MESSAGE ===
{message}

=== YOUR TASK ===
Provide a clear, empathetic gap analysis. Explain:
1. Where the student stands relative to peers.
2. The top 2-3 weak topics that are having the most impact.
3. Two immediate, concrete next steps referencing the specific weak topics and languages above.
Keep the response under 300 words. Use plain language.
""".strip()


def _build_upgrade_plan_prompt(message: str, report: dict) -> str:
    current_grade = report['studentGrade']
    target_grade  = report['targetGrade']

    return f"""
You are building a personalised study upgrade plan for a student.

=== STUDENT PROFILE ===
Current Grade  : {current_grade}
Target Grade   : {target_grade}
Current Score  : {report['studentScore']}
Batch Avg      : {report['batchAvgScore']}
Priority Level : {report['recommendationLevel']}

=== WEAK TOPICS TO ADDRESS (LeetCode) ===
{_fmt_weak_topics(report.get('weakTopics', []))}

=== STRONG TOPICS TO BUILD ON ===
{_fmt_strong_topics(report.get('strongTopics', []))}

=== LANGUAGE GAPS (GitHub) ===
{_fmt_language_gaps(report.get('languageGaps', {}))}

=== STUDENT REQUEST ===
{message}

=== YOUR TASK ===
Create a structured 4-week upgrade plan from grade {current_grade} to {target_grade}:
- Week 1: Foundation (address the #1 weak topic from the list above)
- Week 2: Practice (coding exercises + a small project in the gap languages)
- Week 3: Assessment prep (mock problems on weak topics)
- Week 4: Review & mock interview simulation

For each week give 2-3 specific, named actions referencing the data above.
End with a motivational one-liner.
Keep total response under 400 words.
""".strip()


def _build_interview_prompt(message: str, report: dict) -> str:
    return f"""
You are preparing a student for a technical interview.

=== STUDENT CONTEXT ===
Grade          : {report['studentGrade']} (targeting {report['targetGrade']})
Score          : {report['studentScore']} (batch avg: {report['batchAvgScore']})

Strong Topics (LeetCode):
{_fmt_strong_topics(report.get('strongTopics', []))}

Weak Topics (LeetCode):
{_fmt_weak_topics(report.get('weakTopics', []))}

Language Profile (GitHub):
{_fmt_language_gaps(report.get('languageGaps', {}))}

=== STUDENT MESSAGE ===
{message}

=== YOUR TASK ===
Respond as an interviewer + coach:
1. If the message is a question: answer it clearly with an example relevant to the student's weak topics.
2. If the message asks for practice: give 2 coding/conceptual questions from the weak topic list,
   appropriate to grade {report['studentGrade']} level, with hints.
3. If the message is an attempt at a question: evaluate it, point out gaps,
   suggest improvements referencing the student's specific weak topics.

Keep response focused and under 350 words.
""".strip()


PROMPT_BUILDERS = {
    "gap_analysis": _build_gap_analysis_prompt,
    "upgrade_plan": _build_upgrade_plan_prompt,
    "interview":    _build_interview_prompt,
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
    gap_analysis  — compares student to batch (score + topics + languages)
    upgrade_plan  — personalised week-by-week study plan using topic/language gaps
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

    # 2. Build the mode-specific prompt (now includes topic + language data)
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
            logger.error("OpenAI auth error for user %s: %s", user.uid, exc)
            raise HTTPException(
                status_code=502,
                detail=(
                    f"OpenAI API key rejected ({status}). "
                    "Fix: verify OPENAI_API_KEY in backend/.env is valid, "
                    "then restart uvicorn."
                ),
            )
        if status == 429:
            raise HTTPException(
                status_code=429,
                detail=(
                    "OpenAI rate limit or quota exceeded. "
                    "Wait before retrying or check your usage at https://platform.openai.com/usage."
                ),
            )
        if status == 400:
            raise HTTPException(
                status_code=502,
                detail=(
                    "OpenAI rejected the request (400 bad request). "
                    f"Check OPENAI_MODEL in .env (current: {settings.OPENAI_MODEL}) "
                    "and verify the payload structure in llm_service.py."
                ),
            )
        logger.exception("LLM call failed for user %s", user.uid)
        raise HTTPException(
            status_code=502,
            detail=f"OpenAI API error (HTTP {status}): {exc}",
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
