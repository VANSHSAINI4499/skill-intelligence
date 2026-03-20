"""
Ranking engine — pure scoring and grading logic. No I/O.

Default scoring weights (max points per component)
────────────────────────────────────────────────────
  LeetCode Hard    12 pts  (cap 20 problems)
  LeetCode Medium   8 pts  (cap 50 problems)
  LeetCode Easy     5 pts  (cap 100 problems)
  GitHub Repos      5 pts  (cap 30 repos)
  GitHub Stars      5 pts  (cap 100 stars)
  CGPA             10 pts  (cap 10.0)
  ───────────────────────────────────────────
  DEFAULT_MAX      45 pts  → scaled to 100

Grading Thresholds (0-100 scale)
────────────────────────────────────────────────────
  Grade A:  75-100  (top quartile)
  Grade B:  50-75   (above average)
  Grade C:  25-50   (below average)
  Grade D:   0-25   (needs significant improvement)

Weights are overridable via AlgorithmWeights (stored in algorithm_config/current).
"""

from typing import Optional, TYPE_CHECKING
from models.student_model import GitHubStats, LeetCodeStats

if TYPE_CHECKING:
    from models.admin_models import AlgorithmWeights


# ── Caps (fixed — only weights are configurable) ──────────────────────────────
_CAP_HARD   = 20
_CAP_MEDIUM = 50
_CAP_EASY   = 100
_CAP_REPOS  = 30
_CAP_STARS  = 100
_CAP_CGPA   = 10.0


def _clamp(value: float, cap: float) -> float:
    return min(value, cap)


def calculate_score(
    github: GitHubStats,
    leetcode: LeetCodeStats,
    cgpa: float,
    weights: Optional[object] = None,  # AlgorithmWeights | None
) -> float:
    """
    Compute a 0-100 score for a student.

    If `weights` is supplied (an AlgorithmWeights instance loaded from
    Firestore's algorithm_config/current document), those values override
    the compile-time defaults. This allows admins to tune the scoring
    formula without redeploying the backend.
    """
    # Resolve weights — fall back to hardcoded defaults when not provided
    w_hard   = getattr(weights, "leetcode_hard",   12.0) if weights else 12.0
    w_medium = getattr(weights, "leetcode_medium",  8.0) if weights else  8.0
    w_easy   = getattr(weights, "leetcode_easy",    5.0) if weights else  5.0
    w_repos  = getattr(weights, "github_repos",     5.0) if weights else  5.0
    w_stars  = getattr(weights, "github_stars",     5.0) if weights else  5.0
    w_cgpa   = getattr(weights, "cgpa",            10.0) if weights else 10.0

    phase1_max = w_hard + w_medium + w_easy + w_repos + w_stars + w_cgpa

    print(f"[RankingEngine] Inputs:")
    print(f"[RankingEngine]   github.totalRepos = {github.totalRepos}")
    print(f"[RankingEngine]   github.totalStars = {github.totalStars}")
    print(f"[RankingEngine]   leetcode.easy     = {leetcode.easy}")
    print(f"[RankingEngine]   leetcode.medium   = {leetcode.medium}")
    print(f"[RankingEngine]   leetcode.hard     = {leetcode.hard}")
    print(f"[RankingEngine]   cgpa              = {cgpa}")
    print(f"[RankingEngine]   weights           = hard={w_hard} med={w_medium} easy={w_easy} repos={w_repos} stars={w_stars} cgpa={w_cgpa} (max={phase1_max})")

    hard_pts   = _clamp(leetcode.hard,     _CAP_HARD)   / _CAP_HARD   * w_hard
    medium_pts = _clamp(leetcode.medium,   _CAP_MEDIUM) / _CAP_MEDIUM * w_medium
    easy_pts   = _clamp(leetcode.easy,     _CAP_EASY)   / _CAP_EASY   * w_easy
    repo_pts   = _clamp(github.totalRepos, _CAP_REPOS)  / _CAP_REPOS  * w_repos
    star_pts   = _clamp(github.totalStars, _CAP_STARS)  / _CAP_STARS  * w_stars
    cgpa_pts   = _clamp(cgpa,              _CAP_CGPA)   / _CAP_CGPA   * w_cgpa

    print(f"[RankingEngine]   hard_pts   = {hard_pts:.2f}")
    print(f"[RankingEngine]   medium_pts = {medium_pts:.2f}")
    print(f"[RankingEngine]   easy_pts   = {easy_pts:.2f}")
    print(f"[RankingEngine]   repo_pts   = {repo_pts:.2f}")
    print(f"[RankingEngine]   star_pts   = {star_pts:.2f}")
    print(f"[RankingEngine]   cgpa_pts   = {cgpa_pts:.2f}")

    raw = hard_pts + medium_pts + easy_pts + repo_pts + star_pts + cgpa_pts
    print(f"[RankingEngine]   raw score  = {raw:.2f}  (phase1_max={phase1_max})")

    scaled = round((raw / phase1_max) * 100, 2) if phase1_max > 0 else 0.0
    print(f"[RankingEngine] ✅ Scaled score = {scaled}")
    return scaled


def calculate_grade(score: float) -> str:
    """
    Assign letter grade based on score.

    Grade Distribution (0-100 scale):
    - Grade A: 75-100  (top quartile)
    - Grade B: 50-75   (above average)
    - Grade C: 25-50   (below average)
    - Grade D: 0-25    (needs significant improvement)
    """
    if score >= 75:
        grade = "A"
    elif score >= 50:
        grade = "B"
    elif score >= 25:
        grade = "C"
    else:
        grade = "D"

    print(f"[RankingEngine] ✅ Grade assigned  : {grade}  (score={score})")
    return grade


# ── Live weight loader (reads Firestore, falls back to defaults) ──────────────

def load_weights(university_id: str = "") -> "AlgorithmWeights":
    """
    Reads the algorithm_config/current document for the given university from
    Firestore and returns an AlgorithmWeights instance.

    Path (multi-tenant):  universities/{university_id}/algorithm_config/current
    Legacy fallback path: algorithm_config/current  (when university_id is empty)

    Falls back to default weights when the document is missing or on error.
    """
    from config.firebase import db          # local import — avoids circular dep
    from models.admin_models import AlgorithmWeights

    try:
        if university_id:
            doc = (
                db.collection("universities")
                .document(university_id)
                .collection("algorithm_config")
                .document("current")
                .get()
            )
        else:
            # Legacy flat path (kept for backward compatibility)
            doc = db.document("algorithm_config/current").get()

        if doc.exists:
            weights_raw = doc.to_dict().get("weights", {})
            weights = AlgorithmWeights(**weights_raw)
            print(f"[RankingEngine] ✅ Loaded Firestore weights (university={university_id or 'legacy'}): {weights.model_dump()}")
            return weights
    except Exception as exc:
        print(f"[RankingEngine] ⚠ Could not load Firestore weights ({exc}) — using defaults")

    print("[RankingEngine] ℹ Using default weights (algorithm_config/current not found)")
    return AlgorithmWeights()
