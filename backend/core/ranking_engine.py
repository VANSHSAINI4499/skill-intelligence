"""
Ranking engine — pure scoring and grading logic. No I/O.

Scoring weights
───────────────
  LeetCode Hard    12 %   (cap 20 problems  → 12 pts)
  LeetCode Medium   8 %   (cap 50 problems  →  8 pts)
  LeetCode Easy     5 %   (cap 100 problems →  5 pts)
  GitHub Repos      5 %   (cap 30 repos     →  5 pts)
  GitHub Stars      5 %   (cap 100 stars    →  5 pts)
  CGPA             10 %   (cap 10.0         → 10 pts)
                    ──────────────────────────────────
  PHASE1_MAX       45 pts   → scaled to 100
"""

from models.student_model import GitHubStats, LeetCodeStats


# ── Caps ─────────────────────────────────────────────────────────────────────
_CAP_HARD   = 20
_CAP_MEDIUM = 50
_CAP_EASY   = 100
_CAP_REPOS  = 30
_CAP_STARS  = 100
_CAP_CGPA   = 10.0

# ── Max raw score before scaling ─────────────────────────────────────────────
_PHASE1_MAX = 12 + 8 + 5 + 5 + 5 + 10  # = 45


def _clamp(value: float, cap: float) -> float:
    return min(value, cap)


def calculate_score(
    github: GitHubStats,
    leetcode: LeetCodeStats,
    cgpa: float,
) -> float:
    print(f"[RankingEngine] Inputs:")
    print(f"[RankingEngine]   github.totalRepos = {github.totalRepos}")
    print(f"[RankingEngine]   github.totalStars = {github.totalStars}")
    print(f"[RankingEngine]   leetcode.easy     = {leetcode.easy}")
    print(f"[RankingEngine]   leetcode.medium   = {leetcode.medium}")
    print(f"[RankingEngine]   leetcode.hard     = {leetcode.hard}")
    print(f"[RankingEngine]   cgpa              = {cgpa}")

    hard_pts   = _clamp(leetcode.hard,        _CAP_HARD)   / _CAP_HARD   * 12
    medium_pts = _clamp(leetcode.medium,      _CAP_MEDIUM) / _CAP_MEDIUM *  8
    easy_pts   = _clamp(leetcode.easy,        _CAP_EASY)   / _CAP_EASY   *  5
    repo_pts   = _clamp(github.totalRepos,    _CAP_REPOS)  / _CAP_REPOS  *  5
    star_pts   = _clamp(github.totalStars,    _CAP_STARS)  / _CAP_STARS  *  5
    cgpa_pts   = _clamp(cgpa,                 _CAP_CGPA)   / _CAP_CGPA   * 10

    print(f"[RankingEngine]   hard_pts   = {hard_pts:.2f}")
    print(f"[RankingEngine]   medium_pts = {medium_pts:.2f}")
    print(f"[RankingEngine]   easy_pts   = {easy_pts:.2f}")
    print(f"[RankingEngine]   repo_pts   = {repo_pts:.2f}")
    print(f"[RankingEngine]   star_pts   = {star_pts:.2f}")
    print(f"[RankingEngine]   cgpa_pts   = {cgpa_pts:.2f}")

    raw = hard_pts + medium_pts + easy_pts + repo_pts + star_pts + cgpa_pts
    print(f"[RankingEngine]   raw score  = {raw:.2f}  (PHASE1_MAX={_PHASE1_MAX})")

    scaled = round((raw / _PHASE1_MAX) * 100, 2)
    print(f"[RankingEngine] ✅ Scaled score = {scaled}")
    return scaled


def calculate_grade(score: float) -> str:
    if score >= 85:
        grade = "A"
    elif score >= 70:
        grade = "B"
    elif score >= 55:
        grade = "C"
    else:
        grade = "D"

    print(f"[RankingEngine] ✅ Grade assigned  : {grade}  (score={score})")
    return grade
