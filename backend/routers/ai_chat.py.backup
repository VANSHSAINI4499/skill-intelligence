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
    mode:      ChatMode
    reply:     str
    gapReport: dict | None = None


class RecalculateRequest(BaseModel):
    batch: str


# ── Shared context builder ─────────────────────────────────────────────────────

def _build_student_context(report: dict) -> str:
    """
    Assembles a dense, data-rich context block from the gap report.
    This is injected at the top of every prompt so the model always
    has the student's real numbers — removing the need to repeat
    individual fields in each mode prompt.
    """
    grade         = report.get("studentGrade", "?")
    target        = report.get("targetGrade",  "next grade")
    score         = report.get("studentScore",  0)
    batch_avg     = report.get("batchAvgScore", 0)
    gap           = report.get("overallGap",    0)
    percentile    = report.get("percentileEstimate", 0)
    batch_size    = report.get("batchSize",     0)
    rec_level     = report.get("recommendationLevel", "Medium")
    batch         = report.get("batch", "unknown")

    weak_topics   = report.get("weakTopics",   []) or []
    strong_topics = report.get("strongTopics", []) or []
    lang_gaps     = report.get("languageGaps", {}) or {}

    # Format weak topics as a numbered list with gap numbers
    if weak_topics:
        weak_lines = "\n".join(
            f"  {i+1}. {t['topic']}: student {t['studentPct']}% vs target-grade avg {t['targetPct']}%  (gap: {t['gap']}%)"
            for i, t in enumerate(weak_topics)
        )
    else:
        weak_lines = "  (insufficient data — student has not run analysis yet)"

    # Strong topics
    if strong_topics:
        strong_lines = ", ".join(
            f"{t['topic']} ({t['studentPct']}%)" for t in strong_topics
        )
    else:
        strong_lines = "none identified yet"

    # Language gaps — split into deficits vs strengths
    deficits   = {l: d for l, d in lang_gaps.items() if d["gap"] >  2}
    strengths  = {l: d for l, d in lang_gaps.items() if d["gap"] < -2}

    if deficits:
        deficit_lines = "\n".join(
            f"  • {lang}: student {d['studentPct']}% → target {d['targetPct']}%  (↑ {d['gap']}% needed)"
            for lang, d in sorted(deficits.items(), key=lambda x: -x[1]["gap"])
        )
    else:
        deficit_lines = "  No significant language deficits detected."

    if strengths:
        strength_lines = ", ".join(
            f"{lang} ({d['studentPct']}%)" for lang, d in strengths.items()
        )
    else:
        strength_lines = "none"

    direction = "above" if gap >= 0 else "below"
    gap_str   = f"+{gap:.1f}" if gap >= 0 else f"{gap:.1f}"

    return f"""
╔══════════════════════════════════════════════════════════
  STUDENT PERFORMANCE DATA  —  Batch {batch}  ·  {batch_size} peers
╠══════════════════════════════════════════════════════════
  Current Grade : {grade}        Target Grade : {target}
  Score         : {score:.1f}     Batch Average : {batch_avg:.1f}
  Gap vs Batch  : {gap_str} points ({direction} average)
  Percentile    : ~{percentile:.0f}th        Urgency : {rec_level}
╠══════════════════════════════════════════════════════════
  LEETCODE TOPIC WEAKNESSES (student% vs {target}-grade students):
{weak_lines}

  LEETCODE STRENGTHS:  {strong_lines}
╠══════════════════════════════════════════════════════════
  GITHUB LANGUAGE GAPS (to reach Grade {target}):
{deficit_lines}

  Language Strengths: {strength_lines}
╚══════════════════════════════════════════════════════════
""".strip()


# ── Prompt builders ────────────────────────────────────────────────────────────

_OUTPUT_FORMAT = """
Respond using EXACTLY this structure (use markdown headers):

## 1. Performance Summary
(2-3 sentences: where the student stands, grade gap, percentile)

## 2. Key Gaps
(Bullet points referencing SPECIFIC topics and languages from the data above)

## 3. Skill Comparison
(How the student compares to Grade {target} students on their top weak topics)

## 4. Action Plan
(Week-by-week steps, each tied to a specific weak topic or language from the data)

## 5. Practice Recommendations
(Specific LeetCode topic tags and GitHub project types to target next)
""".strip()


def _build_gap_analysis_prompt(message: str, report: dict) -> str:
    context = _build_student_context(report)
    target  = report.get("targetGrade", "next grade")
    return f"""
{context}

=== STUDENT MESSAGE ===
{message}

=== YOUR TASK ===
Perform a precise gap analysis for this student.
{_OUTPUT_FORMAT.format(target=target)}

Rules:
- Reference specific topic names and percentages from the data above.
- Do NOT give generic advice like "practice more LeetCode".
- In Section 4, give one concrete action per weak topic listed above.
- Keep each section concise (3-5 lines max). Total response ≤ 400 words.
""".strip()


def _build_upgrade_plan_prompt(message: str, report: dict) -> str:
    context = _build_student_context(report)
    grade   = report.get("studentGrade", "?")
    target  = report.get("targetGrade",  "next grade")

    # Pull top 3 weak topics by gap magnitude for the plan
    weak_topics = (report.get("weakTopics") or [])[:3]
    lang_gaps   = {l: d for l, d in (report.get("languageGaps") or {}).items() if d["gap"] > 2}
    top_langs   = list(lang_gaps.keys())[:2]

    week_focus = []
    if weak_topics:
        week_focus.append(f"Week 1 focus: {weak_topics[0]['topic']} (your biggest gap at {weak_topics[0]['gap']}%)")
    if len(weak_topics) > 1:
        week_focus.append(f"Week 2 focus: {weak_topics[1]['topic']} + {weak_topics[2]['topic'] if len(weak_topics) > 2 else 'review'}")
    if top_langs:
        week_focus.append(f"Week 3 language focus: {', '.join(top_langs)}")
    week_focus.append("Week 4: Mock assessments + consolidation")

    week_hints = "\n".join(f"  {w}" for w in week_focus)

    return f"""
{context}

=== STUDENT REQUEST ===
{message}

=== YOUR TASK ===
Build a personalised 4-week upgrade plan to move this student from Grade {grade} → Grade {target}.

Pre-computed week structure (use this as the backbone, expand each point with 2-3 specific actions):
{week_hints}

{_OUTPUT_FORMAT.format(target=target)}

Rules:
- Every action must reference a SPECIFIC topic or language from the data above.
- Link Week 1-2 actions directly to the top weak topics by gap magnitude.
- Link Week 3 to language deficits if present.
- End Section 5 with 3-5 specific LeetCode topic tags to study (exact tag names from the data).
- Keep total response ≤ 450 words.
""".strip()


# ── Grade → difficulty mapping for interview mode ─────────────────────────────

_GRADE_DIFFICULTY: dict[str, str] = {
    "A": "hard (LC hard / system-design level)",
    "B": "medium-hard (LC medium with optimisation follow-ups)",
    "C": "medium (LC medium, focus on correctness first)",
    "D": "easy-medium (LC easy-medium, build fundamentals)",
    "F": "easy (LC easy, core data structures only)",
}


def _build_interview_prompt(message: str, report: dict) -> str:
    context      = _build_student_context(report)
    grade        = report.get("studentGrade", "C")
    target       = report.get("targetGrade",  "B")
    difficulty   = _GRADE_DIFFICULTY.get(grade, "medium")
    weak_topics  = (report.get("weakTopics") or [])[:3]
    strong_topics= (report.get("strongTopics") or [])[:2]

    weak_tag_names  = [t["topic"] for t in weak_topics]  if weak_topics  else ["Arrays", "Strings"]
    strong_tag_names= [t["topic"] for t in strong_topics] if strong_topics else []

    return f"""
{context}

=== STUDENT MESSAGE ===
{message}

=== YOUR TASK ===
You are acting as both an interviewer and a coach simultaneously.

Interview configuration for this student:
  • Difficulty level : {difficulty}  (Grade {grade} student)
  • Question topics  : PRIMARILY from weak topics → {", ".join(weak_tag_names)}
  • Avoid over-weighting: {", ".join(strong_tag_names) or "none (no strong topics yet)"}

Respond based on what the student said:

A) If asking for a practice question:
   → Give ONE question from their #1 weak topic ({weak_tag_names[0] if weak_tag_names else "Arrays"}).
   → Difficulty: {difficulty}.
   → After the question, give:
     - A hint (one sentence, direction without spoiling solution)
     - Expected approach (data structure / algorithm pattern to use)
     - Why this topic matters for Grade {target} students.

B) If attempting / submitting an answer:
   → Evaluate correctness, time complexity, space complexity.
   → Point out any gap between their approach and the optimal {difficulty} solution.
   → Give the optimal approach in pseudocode if theirs is suboptimal.
   → End with one follow-up question from their second weak topic.

C) If asking a conceptual question:
   → Answer clearly with a concrete example relevant to {weak_tag_names[0] if weak_tag_names else "their weak area"}.
   → Show how it applies to a real interview scenario.

Keep response focused. ≤ 350 words. Do not be generic — reference the student's actual weak topics.
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
    interview     — topic-targeted interview questions at grade-appropriate difficulty

    Authentication
    --------------
    Requires a valid student Firebase ID token.
    University and batch are resolved from the student's Firestore document,
    ensuring strict multi-tenant isolation.
    """
    try:
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
            detail=f"Analytics error while building gap report: {exc}.",
        )

    # Build mode-specific prompt with full data context
    prompt = PROMPT_BUILDERS[body.mode](body.message, report)

    try:
        reply = await call_llm(prompt)
    except LLMError as exc:
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
                detail="OpenAI rate limit or quota exceeded. Wait before retrying.",
            )
        if status == 400:
            raise HTTPException(
                status_code=502,
                detail=(
                    f"OpenAI rejected the request (400). "
                    f"Check OPENAI_MODEL in .env (current: {settings.OPENAI_MODEL})."
                ),
            )
        logger.exception("LLM call failed for user %s", user.uid)
        raise HTTPException(status_code=502, detail=f"OpenAI API error (HTTP {status}): {exc}")
    except Exception as exc:
        logger.exception("Unexpected LLM error for user %s", user.uid)
        raise HTTPException(status_code=502, detail=f"Unexpected AI error: {exc}.")

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
