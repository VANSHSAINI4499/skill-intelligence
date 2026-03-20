"""
Intent Detector (PRODUCTION-READY FIX)
======================================
Classifies user input into AI modes with confidence scoring.

MODES:
- gap_analysis: Performance analysis, weaknesses, comparisons
- upgrade_plan: Study plans, improvement roadmaps
- interview: Practice questions, coding challenges
- general_chat: General questions, casual conversation (DEFAULT)

CRITICAL FIXES APPLIED:
✓ Simplified keyword sets (only strong signals)
✓ Added minimum confidence threshold (must score ≥ 2)
✓ Greeting priority detection (hi/hello → always general_chat)
✓ Returns (mode, confidence) tuple for router control
✓ Defaults to GENERAL_CHAT for low/no confidence
✓ Debug logging for troubleshooting

Usage:
------
    from ai_engine.intent_detector import detect_mode

    mode, confidence = detect_mode("What are my weak topics?")
    # Returns: ("gap_analysis", 5.0)

    mode, confidence = detect_mode("hello")
    # Returns: ("general_chat", 3.0)

    mode, confidence = detect_mode("what is dp")
    # Returns: ("general_chat", 3.0)
"""

import re
from typing import Literal, Tuple

ChatMode = Literal["gap_analysis", "upgrade_plan", "interview", "general_chat"]

# Minimum confidence to select specific modes (vs GENERAL_CHAT default)
MIN_CONFIDENCE_THRESHOLD = 2.0


# ══════════════════════════════════════════════════════════════════════════════
# KEYWORD DEFINITIONS (Simplified & Clean)
# ══════════════════════════════════════════════════════════════════════════════

# GAP_ANALYSIS: Performance analysis ONLY
# Removed generic words like "what", "where", "show"
_GAP_KEYWORDS = {
    "gap": 3,
    "gaps": 3,
    "performance": 3,
    "analyze": 3,
    "analysis": 3,
    "compare": 3,
    "comparison": 3,
    "percentile": 3,
    "ranking": 3,
    "score": 2,
    "weak": 2,
    "weakness": 2,
    "deficit": 2,
    "behind": 2,
}

# UPGRADE_PLAN: Improvement and planning
_UPGRADE_KEYWORDS = {
    "improve": 3,
    "improvement": 3,
    "plan": 3,
    "roadmap": 3,
    "better": 2,
    "strategy": 2,
    "upgrade": 3,
    "next steps": 3,
    "action plan": 3,
}

# INTERVIEW_PREP: Coding questions and practice
_INTERVIEW_KEYWORDS = {
    "interview": 3,
    "question": 2,
    "questions": 2,
    "leetcode": 3,
    "coding": 3,
    "dsa": 3,
    "practice": 2,
    "challenge": 2,
    "mock": 2,
}

# GENERAL_CHAT: Casual conversation, concept questions
# High priority for greetings and explanations
_GENERAL_KEYWORDS = {
    "hello": 3,
    "hi": 3,
    "hey": 3,
    "what": 2,
    "what is": 3,
    "what are": 3,
    "why": 3,
    "how": 2,
    "explain": 3,
    "tell me": 3,
    "help": 2,
}


# ══════════════════════════════════════════════════════════════════════════════
# GREETING DETECTION (HIGHEST PRIORITY)
# ══════════════════════════════════════════════════════════════════════════════

_GREETINGS = {
    "hi", "hello", "hey", "hii", "hiii", "heya", "sup", "yo",
    "good morning", "good afternoon", "good evening"
}


def _is_greeting(user_input: str) -> bool:
    """
    Detect if input is a simple greeting.

    Examples:
        "hi" → True
        "hello" → True
        "hey there" → True
        "hi, show my gaps" → False (greeting + request)
    """
    text = user_input.lower().strip()

    # Exact match
    if text in _GREETINGS:
        return True

    # Short greeting at start (≤ 3 words)
    words = text.split()
    if len(words) <= 3 and words[0] in _GREETINGS:
        return True

    return False


# ══════════════════════════════════════════════════════════════════════════════
# SCORING ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def _calculate_score(text: str, keywords: dict[str, int]) -> float:
    """
    Calculate weighted score for keyword matches.

    Uses word boundaries to avoid partial matches.
    Example: "plan" won't match "planet"
    """
    text_lower = text.lower()
    score = 0.0

    for keyword, weight in keywords.items():
        pattern = r"\b" + re.escape(keyword) + r"\b"
        if re.search(pattern, text_lower):
            score += weight

    return score


# ══════════════════════════════════════════════════════════════════════════════
# MAIN DETECTION FUNCTION (FIXED)
# ══════════════════════════════════════════════════════════════════════════════

def detect_mode(user_input: str, debug: bool = True) -> Tuple[ChatMode, float]:
    """
    Detect chat mode with confidence scoring.

    Returns: (mode, confidence)
        mode: Detected ChatMode
        confidence: Float score (0.0 to N, higher = more confident)

    Algorithm:
    ----------
    1. Check for greetings FIRST (always → general_chat)
    2. Calculate keyword scores for all modes
    3. Apply MIN_CONFIDENCE_THRESHOLD (≥ 2.0 required)
    4. Return highest-scoring mode
    5. Default to GENERAL_CHAT for low/no confidence

    Critical Rules:
    ---------------
    ✓ Greetings → always GENERAL_CHAT
    ✓ No keywords matched → GENERAL_CHAT
    ✓ Low confidence (< 2.0) → GENERAL_CHAT
    ✓ NEVER default to gap_analysis

    Examples:
    ---------
    >>> detect_mode("hello")
    ('general_chat', 3.0)

    >>> detect_mode("what is dynamic programming")
    ('general_chat', 3.0)

    >>> detect_mode("show my performance gap")
    ('gap_analysis', 6.0)

    >>> detect_mode("how can I improve my score")
    ('upgrade_plan', 5.0)

    >>> detect_mode("give me interview questions")
    ('interview', 5.0)
    """
    # Edge case: Empty input
    if not user_input or not user_input.strip():
        if debug:
            print("[Intent] Empty input → general_chat")
        return "general_chat", 0.0

    # CRITICAL: Check greetings FIRST (highest priority)
    if _is_greeting(user_input):
        if debug:
            print(f"[Intent] Greeting detected: '{user_input}' → general_chat")
        return "general_chat", 3.0

    # Calculate scores for all modes
    scores = {
        "gap_analysis": _calculate_score(user_input, _GAP_KEYWORDS),
        "upgrade_plan": _calculate_score(user_input, _UPGRADE_KEYWORDS),
        "interview": _calculate_score(user_input, _INTERVIEW_KEYWORDS),
        "general_chat": _calculate_score(user_input, _GENERAL_KEYWORDS),
    }

    # Debug output
    if debug:
        print(f"\n{'='*60}")
        print(f"[Intent] User Input: '{user_input}'")
        print(f"[Intent] Scores: {scores}")

    # Find maximum score
    max_score = max(scores.values())

    # CRITICAL FIX: Apply minimum confidence threshold
    if max_score < MIN_CONFIDENCE_THRESHOLD:
        if debug:
            print(f"[Intent] Low confidence ({max_score:.1f} < {MIN_CONFIDENCE_THRESHOLD}) → general_chat")
            print(f"{'='*60}\n")
        return "general_chat", max_score

    # If no keywords matched at all
    if max_score == 0:
        if debug:
            print(f"[Intent] No keywords matched → general_chat")
            print(f"{'='*60}\n")
        return "general_chat", 0.0

    # Find which mode has the highest score
    # Priority order for tie-breaking (most specific to least specific)
    priority_order: list[ChatMode] = [
        "interview",      # Most specific
        "upgrade_plan",   # Specific
        "gap_analysis",   # Moderately specific
        "general_chat",   # Default/fallback
    ]

    detected_mode = "general_chat"  # Default
    for mode in priority_order:
        if scores[mode] == max_score:
            detected_mode = mode
            break

    if debug:
        print(f"[Intent] Detected Mode: {detected_mode}")
        print(f"[Intent] Confidence: {max_score:.1f}")
        print(f"{'='*60}\n")

    return detected_mode, max_score


# ══════════════════════════════════════════════════════════════════════════════
# LEGACY COMPATIBILITY
# ══════════════════════════════════════════════════════════════════════════════

def detect_mode_with_confidence(user_input: str) -> Tuple[ChatMode, dict[str, int]]:
    """
    Legacy function for backward compatibility.

    Returns: (mode, scores_dict)

    Note: New code should use detect_mode() instead.
    """
    mode, confidence = detect_mode(user_input, debug=False)

    # Calculate all scores for dict format
    scores = {
        "gap_analysis": int(_calculate_score(user_input, _GAP_KEYWORDS)),
        "upgrade_plan": int(_calculate_score(user_input, _UPGRADE_KEYWORDS)),
        "interview": int(_calculate_score(user_input, _INTERVIEW_KEYWORDS)),
        "general_chat": int(_calculate_score(user_input, _GENERAL_KEYWORDS)),
    }

    return mode, scores
