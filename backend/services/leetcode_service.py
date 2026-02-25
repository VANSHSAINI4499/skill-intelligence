"""
LeetCode GraphQL API client.

Pipeline:
  1. Fetch submitStatsGlobal      → easy / medium / hard totals  (public ✓)
  2. Fetch languageProblemCount   → all-time lang stats           (public ✓, fallback to recent)
  3. Fetch recentAcSubmissionList → last 20 accepted submissions  (public ✓)
  4. Aggregate language stats from submission `lang` field        (no extra request)
  5. Throttled detail fetches per unique slug (max 3 concurrent)
       → topicTags + difficulty                                   (public ✓)

NOTE: `tagProblemCounts` intentionally removed — requires LeetCode session
      cookies and returns null for unauthenticated requests.
"""

import asyncio
import random
import traceback
from collections import Counter

import httpx

from config.settings import settings
from models.student_model import (
    LeetCodeDeepStats,
    LeetCodeDifficulty,
    LeetCodeStats,
    RecentSubmission,
)

# Semaphore: max 3 concurrent detail requests to avoid rate-limiting
_DETAIL_SEMAPHORE = asyncio.Semaphore(3)

_HEADERS = {
    "Content-Type":    "application/json",
    "Referer":         "https://leetcode.com",
    "Origin":          "https://leetcode.com",
    "User-Agent":      (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept":          "application/json",
    "Accept-Language": "en-US,en;q=0.9",
}

# ── Query 1: public profile data (no auth-required fields) ──────────────────
# tagProblemCounts intentionally omitted — requires session cookies.
_PROFILE_QUERY = """
query getPublicProfile($username: String!) {
  matchedUser(username: $username) {
    submitStatsGlobal {
      acSubmissionNum { difficulty count }
    }
    languageProblemCount {
      languageName
      problemsSolved
    }
  }
  recentAcSubmissionList(username: $username, limit: 20) {
    title
    titleSlug
    timestamp
    lang
  }
}
"""

# ── Query 2: per-question detail (topicTags + difficulty) ───────────────────
_QUESTION_DETAIL_QUERY = """
query getQuestionDetail($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    difficulty
    topicTags { name }
  }
}
"""


async def _fetch_question_detail(
    client: httpx.AsyncClient,
    title_slug: str,
) -> tuple[str, str, list[str]]:
    """
    Returns (titleSlug, difficulty, [tag_names]).
    Throttled via semaphore + random jitter. Silently degrades on any error.
    """
    async with _DETAIL_SEMAPHORE:
        # Random jitter 150 – 500 ms between requests to avoid burst rate-limiting
        await asyncio.sleep(random.uniform(0.15, 0.5))
        try:
            resp = await client.post(
                settings.LEETCODE_GRAPHQL_URL,
                json={"query": _QUESTION_DETAIL_QUERY, "variables": {"titleSlug": title_slug}},
                timeout=12,
            )
            if resp.status_code != 200:
                print(f"[LeetCode]   ⚠ detail '{title_slug}': HTTP {resp.status_code}")
                return title_slug, "", []

            q = resp.json().get("data", {}).get("question") or {}
            difficulty = q.get("difficulty", "")
            tags = [t["name"] for t in (q.get("topicTags") or []) if t.get("name")]
            return title_slug, difficulty, tags

        except Exception as exc:
            print(f"[LeetCode]   ⚠ detail exception '{title_slug}': {exc}")
            return title_slug, "", []


async def fetch_leetcode_stats(username: str) -> LeetCodeStats:
    print(f"[LeetCode] ► Fetching stats for username='{username}'")

    try:
        # ── Step 1: single profile request ───────────────────────────────────
        async with httpx.AsyncClient(timeout=20, headers=_HEADERS) as client:
            profile_resp = await client.post(
                settings.LEETCODE_GRAPHQL_URL,
                json={"query": _PROFILE_QUERY, "variables": {"username": username}},
            )

        print(f"[LeetCode]   Profile HTTP status: {profile_resp.status_code}")
        if profile_resp.status_code != 200:
            print(f"[LeetCode] ❌ Non-200: {profile_resp.text[:300]}")
            return LeetCodeStats()

        raw = profile_resp.json()
        if errs := raw.get("errors"):
            print(f"[LeetCode]   ⚠ GraphQL errors: {errs}")

        payload_data = raw.get("data", {})
        matched_user = payload_data.get("matchedUser")
        if not matched_user:
            print(f"[LeetCode]   ⚠ matchedUser is None — private / non-existent profile")
            return LeetCodeStats()

        # ── Step 2: difficulty counts ─────────────────────────────────────────
        ac_list = (
            matched_user
            .get("submitStatsGlobal", {})
            .get("acSubmissionNum", [])
        )
        easy = medium = hard = 0
        for entry in ac_list:
            d = entry.get("difficulty", "").lower()
            c = entry.get("count", 0)
            if d == "easy":     easy   = c
            elif d == "medium": medium = c
            elif d == "hard":   hard   = c
        total_solved = easy + medium + hard
        print(f"[LeetCode] ◄ Difficulty: easy={easy}  medium={medium}  hard={hard}  total={total_solved}")

        # ── Step 3: language stats from API ─────────────────────────────────
        raw_langs = matched_user.get("languageProblemCount") or []
        api_lang_stats: dict[str, int] = {
            e["languageName"]: e["problemsSolved"]
            for e in raw_langs
            if e.get("languageName") and e.get("problemsSolved", 0) > 0
        }
        print(f"[LeetCode] ◄ API languageStats={api_lang_stats}")

        # ── Step 4: parse recent accepted submissions ─────────────────────────
        raw_subs = payload_data.get("recentAcSubmissionList") or []
        print(f"[LeetCode] ◄ recentAcSubmissions returned: {len(raw_subs)}")

        parsed_subs:  list[dict] = []
        seen_slugs:   set[str]   = set()
        lang_counter: Counter    = Counter()   # always available from submission.lang

        for sub in raw_subs[:20]:
            title      = sub.get("title", "")
            title_slug = sub.get("titleSlug", "")
            lang       = sub.get("lang", "")
            try:
                ts = int(sub.get("timestamp", 0))
            except (ValueError, TypeError):
                ts = 0
            if title and title_slug:
                parsed_subs.append({
                    "title": title, "titleSlug": title_slug,
                    "lang":  lang,  "timestamp": ts,
                })
                seen_slugs.add(title_slug)
                if lang:
                    lang_counter[lang] += 1

        # ── Step 5: throttled concurrent detail fetches ───────────────────────
        print(f"[LeetCode] ► Fetching question details for {len(seen_slugs)} slugs (max 3 concurrent) ...")
        async with httpx.AsyncClient(timeout=15, headers=_HEADERS) as detail_client:
            detail_results = await asyncio.gather(
                *[_fetch_question_detail(detail_client, slug) for slug in seen_slugs],
                return_exceptions=True,
            )

        # Build lookup: titleSlug → (difficulty, tags)
        slug_detail:   dict[str, tuple[str, list[str]]] = {}
        topic_counter: Counter = Counter()

        for result in detail_results:
            if isinstance(result, Exception):
                print(f"[LeetCode]   ⚠ gather exception: {result}")
                continue
            slug, difficulty, tags = result
            slug_detail[slug] = (difficulty, tags)
            topic_counter.update(tags)

        print(f"[LeetCode] ◄ topic_counter top 10: {dict(topic_counter.most_common(10))}")
        print(f"[LeetCode] ◄ lang_counter: {dict(lang_counter)}")

        # ── Step 6: build RecentSubmission list ───────────────────────────────
        recent_submissions: list[RecentSubmission] = []
        for sub in parsed_subs:
            slug = sub["titleSlug"]
            diff, tags = slug_detail.get(slug, ("", []))
            recent_submissions.append(
                RecentSubmission(
                    title=sub["title"],
                    titleSlug=slug,
                    timestamp=sub["timestamp"],
                    lang=sub["lang"],
                    difficulty=diff,
                    topicTags=tags,
                )
            )

        # ── Step 7: decide final lang / topic stats ───────────────────────────
        # Language: prefer all-time API stats; fall back to recent-submission count
        final_lang_stats: dict[str, int] = api_lang_stats if api_lang_stats else dict(lang_counter.most_common())
        # Topics: per-question detail fetches (the only reliable public source)
        final_topic_tags: dict[str, int] = dict(topic_counter.most_common())

        print(f"[LeetCode] ◄ final languageStats (n={len(final_lang_stats)}): {final_lang_stats}")
        print(f"[LeetCode] ◄ final topicTags     (n={len(final_topic_tags)}): {dict(list(final_topic_tags.items())[:10])}")
        print(f"[LeetCode] ◄ recentSubmissions   (n={len(recent_submissions)})")

        deep = LeetCodeDeepStats(
            totalSolved=total_solved,
            difficulty=LeetCodeDifficulty(easy=easy, medium=medium, hard=hard),
            languageStats=final_lang_stats,
            topicTags=final_topic_tags,
            recentSubmissions=recent_submissions,
        )

        print(f"[LeetCode] ✅ Stats assembled for '{username}'")
        return LeetCodeStats(easy=easy, medium=medium, hard=hard, deep=deep)

    except Exception as e:
        print(f"[LeetCode] ❌ EXCEPTION: {e}")
        traceback.print_exc()
        return LeetCodeStats()


