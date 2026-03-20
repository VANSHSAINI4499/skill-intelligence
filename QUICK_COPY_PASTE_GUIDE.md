# Quick Copy-Paste Code Snippets for ai_chat.py

## 🎯 STEP-BY-STEP UPDATE GUIDE

Follow these steps to update `backend/routers/ai_chat.py`:

---

## STEP 1: Update Imports (Line ~20)

**FIND:**
```python
from ai_engine.llm_service import call_llm, LLMError
from services.batch_analytics_service import recalculate_batch_analytics
```

**REPLACE WITH:**
```python
from ai_engine.llm_service import call_llm, LLMError
from ai_engine.intent_detector import detect_mode, detect_mode_with_confidence, ChatMode
from services.batch_analytics_service import recalculate_batch_analytics
```

---

## STEP 2: Remove Old ChatMode Type (Line ~31)

**FIND & DELETE:**
```python
ChatMode = Literal["gap_analysis", "upgrade_plan", "interview"]
```

**(Delete this line - ChatMode now comes from intent_detector)**

---

## STEP 3: Update ChatRequest Model (Line ~34)

**FIND:**
```python
class ChatRequest(BaseModel):
    mode:    ChatMode
    message: str
```

**REPLACE WITH:**
```python
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User's message or question")
    mode: ChatMode | None = Field(
        None,
        description="Optional: Override auto-detection. If not provided, mode is detected from message.",
    )
```

---

## STEP 4: Update ChatResponse Model (Line ~39)

**FIND:**
```python
class ChatResponse(BaseModel):
    mode:      ChatMode
    reply:     str
    gapReport: dict | None = None
```

**REPLACE WITH:**
```python
class ChatResponse(BaseModel):
    mode: ChatMode = Field(..., description="Chat mode used for this response")
    reply: str = Field(..., description="AI-generated response")
    gapReport: dict | None = Field(
        None,
        description="Detailed gap analysis data (only for gap_analysis mode)",
    )
    detectedMode: ChatMode | None = Field(
        None,
        description="Auto-detected mode (present if mode was auto-detected, not manually overridden)",
    )
    confidence: dict[str, int] | None = Field(
        None,
        description="Confidence scores for all modes (for debugging)",
    )
```

---

## STEP 5: Add General Chat Prompt Builder (After _build_interview_prompt, Line ~278)

**ADD THIS NEW FUNCTION:**
```python
def _build_general_chat_prompt(message: str, report: dict | None = None) -> str:
    """
    Build prompt for general chat mode.

    This mode handles:
    - General career questions
    - Concept explanations
    - Casual conversation
    - Questions that don't fit other modes

    If student data is available, includes lightweight context.
    Otherwise, pure conversational AI.
    """
    if report:
        grade = report.get("studentGrade", "?")
        score = report.get("studentScore", 0)
        return f"""
You are SkillSight AI, a friendly and helpful career coach for software engineering students.

LIGHT STUDENT CONTEXT:
- Current Grade: {grade}
- Score: {score:.1f}
(Note: Full analytics not needed for this question type)

=== STUDENT MESSAGE ===
{message}

=== YOUR TASK ===
Answer the student's question in a clear, helpful, and conversational way.

Guidelines:
- Be friendly but professional
- If it's a concept question (e.g., "What is Big O?"), explain with examples
- If it's career advice, be practical and realistic
- If it's a greeting, respond warmly and ask how you can help
- Keep responses concise (≤ 300 words)
- If the question would benefit from gap analysis, upgrade plan, or interview mode, suggest that

Do NOT:
- Force data-driven analysis if the question is conceptual
- Be overly formal
- Give generic platitudes
""".strip()
    else:
        # No student data available — pure conversational mode
        return f"""
You are SkillSight AI, a friendly and helpful career coach for software engineering students.

=== STUDENT MESSAGE ===
{message}

=== YOUR TASK ===
Answer the student's question in a clear, helpful, and conversational way.

Guidelines:
- Be friendly but professional
- If it's a concept question, explain with examples
- If it's career advice, be practical and realistic
- Keep responses concise (≤ 300 words)
- You don't have access to this student's performance data yet
- If they ask about their performance, suggest they run an analysis first

Do NOT:
- Fabricate performance data
- Give generic advice
- Be overly formal
""".strip()
```

---

## STEP 6: Update PROMPT_BUILDERS Registry (Line ~280)

**FIND:**
```python
PROMPT_BUILDERS = {
    "gap_analysis": _build_gap_analysis_prompt,
    "upgrade_plan": _build_upgrade_plan_prompt,
    "interview":    _build_interview_prompt,
}
```

**REPLACE WITH:**
```python
PROMPT_BUILDERS = {
    "gap_analysis": _build_gap_analysis_prompt,
    "upgrade_plan": _build_upgrade_plan_prompt,
    "interview":    _build_interview_prompt,
    "general_chat": _build_general_chat_prompt,  # NEW
}
```

---

## STEP 7: Add Main Handler Function (After PROMPT_BUILDERS, Line ~285)

**ADD THIS NEW FUNCTION:**
```python
# ── Main AI request handler ────────────────────────────────────────────────────


async def handle_ai_request(
    user_input: str,
    student_data: dict | None = None,
    mode_override: ChatMode | None = None,
) -> tuple[ChatMode, str, dict | None, dict[str, int] | None]:
    """
    Main router for AI requests with automatic intent detection.

    Flow
    ----
    1. Detect mode from user input (unless manually overridden)
    2. Select appropriate prompt builder
    3. Build context-aware prompt
    4. Call LLM
    5. Return response with metadata

    Parameters
    ----------
    user_input     : User's message/question
    student_data   : Optional gap report (dict from knowledge_gap_engine)
    mode_override  : Optional manual mode override (bypasses detection)

    Returns
    -------
    (mode, reply, gap_report, confidence_scores)
    - mode: ChatMode used for this response
    - reply: LLM-generated response
    - gap_report: Full gap data (only for gap_analysis mode)
    - confidence_scores: Intent detection scores (None if mode was manual)

    Raises
    ------
    LLMError — if LLM call fails
    """
    # Edge case: Empty input
    if not user_input or not user_input.strip():
        return "general_chat", "Hi! How can I help you today? You can ask me about your performance gaps, request an upgrade plan, or practice interview questions!", None, None

    # Step 1: Determine mode (auto-detect or manual override)
    if mode_override:
        mode = mode_override
        confidence_scores = None  # No detection happened
        logger.info(f"[AI] Manual mode override: {mode}")
    else:
        mode, confidence_scores = detect_mode_with_confidence(user_input)
        logger.info(f"[AI] Auto-detected mode: {mode} (scores: {confidence_scores})")

    # Step 2: Select prompt builder
    prompt_builder = PROMPT_BUILDERS[mode]

    # Step 3: Build prompt (with fallback for missing data)
    if mode == "general_chat":
        # General chat can work with or without student data
        prompt = prompt_builder(user_input, student_data)
    else:
        # Other modes require student data
        if not student_data:
            # Fallback: Student data not available
            logger.warning(f"[AI] {mode} mode requires student data, but none provided. Falling back to general_chat.")
            prompt = _build_general_chat_prompt(
                user_input="The student asked: " + user_input + "\n\nNote: Performance data is not currently available.",
                report=None,
            )
            mode = "general_chat"
        else:
            prompt = prompt_builder(user_input, student_data)

    # Step 4: Call LLM
    reply = await call_llm(prompt)

    # Step 5: Prepare response
    gap_report = student_data if mode == "gap_analysis" else None

    return mode, reply, gap_report, confidence_scores
```

---

## STEP 8: Update ai_chat Endpoint (Line ~289)

**FIND:**
```python
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
        # ... error handling ...

    return ChatResponse(
        mode=body.mode,
        reply=reply,
        gapReport=report if body.mode == "gap_analysis" else None,
    )
```

**REPLACE WITH:**
```python
@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Multi-mode AI chat with auto intent detection",
)
async def ai_chat(
    body: ChatRequest,
    user: CurrentUser = Depends(get_current_student),
) -> ChatResponse:
    """
    Multi-mode AI chat endpoint with automatic intent detection.

    Modes (auto-detected or manual)
    --------------------------------
    gap_analysis  — Performance analysis, weaknesses, batch comparisons
    upgrade_plan  — Personalized 4-week study plans using topic/language gaps
    interview     — Coding questions at grade-appropriate difficulty
    general_chat  — General questions, explanations, casual conversation

    Intent Detection
    ----------------
    If `mode` is not provided in the request, the system automatically
    detects the intent from the message using keyword-based classification.

    Manual Override
    ---------------
    Pass `"mode": "gap_analysis"` (or other mode) to bypass auto-detection.

    Authentication
    --------------
    Requires a valid student Firebase ID token.
    University and batch are resolved from the student's Firestore document.

    Example Requests
    ----------------
    Auto-detect mode:
      {"message": "What are my weak topics?"}
      → Detects: gap_analysis

    Manual override:
      {"message": "Help me improve", "mode": "upgrade_plan"}
      → Uses: upgrade_plan (ignores detection)

    General chat:
      {"message": "What is dynamic programming?"}
      → Detects: general_chat
    """
    # Attempt to load student gap report (may fail for new students)
    student_data = None
    try:
        student_data = await generate_knowledge_gap_report(
            university_id=user.university_id,
            student_id=user.uid,
        )
    except ValueError as exc:
        logger.warning(f"[AI] Gap report not found for student {user.uid}: {exc}")
        # Continue — general_chat mode can work without data
    except Exception as exc:
        logger.exception(f"[AI] Failed to generate gap report for {user.uid}")
        # Continue — will fallback to general_chat

    # Handle AI request (with or without student data)
    try:
        mode, reply, gap_report, confidence_scores = await handle_ai_request(
            user_input=body.message,
            student_data=student_data,
            mode_override=body.mode,
        )
    except LLMError as exc:
        status = exc.status_code or 502
        if status in (401, 403):
            logger.error(f"[AI] OpenAI auth error for user {user.uid}: {exc}")
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
        logger.exception(f"[AI] LLM call failed for user {user.uid}")
        raise HTTPException(status_code=502, detail=f"OpenAI API error (HTTP {status}): {exc}")
    except Exception as exc:
        logger.exception(f"[AI] Unexpected error for user {user.uid}")
        raise HTTPException(status_code=502, detail=f"Unexpected AI error: {exc}.")

    return ChatResponse(
        mode=mode,
        reply=reply,
        gapReport=gap_report,
        detectedMode=mode if not body.mode else None,  # Only include if auto-detected
        confidence=confidence_scores,
    )
```

---

## ✅ VERIFICATION

After making changes, verify:

```bash
# 1. Check syntax
cd backend
python -m py_compile routers/ai_chat.py

# 2. Restart server
uvicorn main:app --reload --port 5000

# 3. Test with curl
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are my weak topics?"}'

# Expected response:
# {
#   "mode": "gap_analysis",
#   "reply": "...",
#   "detectedMode": "gap_analysis",
#   "confidence": {"gap_analysis": 5, ...}
# }
```

---

## 🎉 DONE!

Your multi-mode AI chat system is now complete with:
- ✅ Automatic intent detection
- ✅ 4 modes (gap_analysis, upgrade_plan, interview, general_chat)
- ✅ Manual override support
- ✅ Graceful fallback for missing student data
- ✅ Confidence scoring

**Test queries to try:**
- "What are my gaps?" → gap_analysis
- "How can I improve?" → upgrade_plan
- "Give me a coding question" → interview
- "What is dynamic programming?" → general_chat
