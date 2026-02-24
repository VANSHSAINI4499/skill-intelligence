"""
LeetCode GraphQL API client.

Pipeline (single profile query + concurrent question-detail queries):
  1. Fetch submitStatsGlobal  → easy / medium / hard totals
  2. Fetch languageProblemCount → all-time language stats
  3. Fetch tagProblemCounts   → all-time topic tags (3 tiers merged)
  4. Fetch recentAcSubmissionList (limit 20) → title, titleSlug, lang, timestamp
  5. For each unique titleSlug — concurrently fetch question detail
       → topicTags list + difficulty string
  6. Aggregate from recent subs:
       - recent_languageStats  (freq of lang across last 20)
       - recent_topicTags      (freq of tag  across last 20)
       - most_used_language    (argmax of recent_languageStats)
"""

import asyncio
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

_HEADERS = {
    "Content-Type": "application/json",
    "Referer":      "https://leetcode.com",
    "User-Agent":   "Mozilla/5.0",
}

# ── Query 1: full profile in one shot ───────────────────────────────────────
_PROFILE_QUERY = """
query getFullProfile($username: String!) {
  matchedUser(username: $username) {
    submitStatsGlobal {
      acSubmissionNum { difficulty count }
    }
    languageProblemCount {
      languageName
      problemsSolved
    }
    tagProblemCounts {
      advanced     { tagName problemsSolved }
      intermediate { tagName problemsSolved }
      fundamental  { tagName problemsSolved }
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
    Silently degrades to empty values on any error.
    """
    try:
        resp = await client.post(
            settings.LEETCODE_GRAPHQL_URL,
            json={"query": _QUESTION_DETAIL_QUERY, "variables": {"titleSlug": title_slug}},
            headers=_HEADERS,
        )
        if resp.status_code != 200:
            print(f"[LeetCode]   ⚠ detail fetch failed for '{title_slug}': HTTP {resp.status_code}")
            return title_slug, "", []

        q = resp.json().get("data", {}).get("question") or {}
        difficulty = q.get("difficulty", "")
        tags = [t["name"] for t in (q.get("topicTags") or []) if t.get("name")]
        return title_slug, difficulty, tags

    except Exception as exc:
        print(f"[LeetCode]   ⚠ detail exception for '{title_slug}': {exc}")
        return title_slug, "", []


async def fetch_leetcode_stats(username: str) -> LeetCodeStats:
    print(f"[LeetCode] ► Fetching full stats for username='{username}'")
    print(f"[LeetCode]   POST {settings.LEETCODE_GRAPHQL_URL}")

    try:
        async with httpx.AsyncClient(timeout=20) as client:

            # ── Step 1: profile query ──────────────────────────────────────────
            profile_resp = await client.post(
                settings.LEETCODE_GRAPHQL_URL,
                json={"query": _PROFILE_QUERY, "variables": {"username": username}},
                headers=_HEADERS,
            )

        print(f"[LeetCode]   Profile status: {profile_resp.status_code}")
        if profile_resp.status_code != 200:
            print(f"[LeetCode] ❌ Non-200: {profile_resp.text[:300]}")
            return LeetCodeStats()

        raw = profile_resp.json()
        if errs := raw.get("errors"):
            print(f"[LeetCode]   ⚠ GraphQL errors: {errs}")

        payload_data = raw.get("data", {})
        matched_user = payload_data.get("matchedUser")
        if not matched_user:
            print(f"[LeetCode]   ⚠ matchedUser is None — private/non-existent profile")
            return LeetCodeStats()

        # ── Step 2: difficulty counts ──────────────────────────────────────────
        ac_list = (
            matched_user
            .get("submitStatsGlobal", {})
            .get("acSubmissionNum", [])
        )
        easy = medium = hard = 0
        for entry in ac_list:
            d = entry.get("difficulty", "").lower()
            c = entry.get("count", 0)
            if d == "easy":    easy   = c
            elif d == "medium": medium = c
            elif d == "hard":   hard   = c
        total_solved = easy + medium + hard
        print(f"[LeetCode] ◄ Difficulty: easy={easy}  medium={medium}  hard={hard}  total={total_solved}")

        # ── Step 3: all-time language stats ───────────────────────────────────
        raw_langs = matched_user.get("languageProblemCount") or []
        all_time_lang_stats: dict[str, int] = {
            e["languageName"]: e["problemsSolved"]
            for e in raw_langs
            if e.get("languageName") and e.get("problemsSolved", 0) > 0
        }
        print(f"[LeetCode] ◄ all-time languageStats={all_time_lang_stats}")

        # ── Step 4: all-time topic tags (3 tiers merged) ───────────────────────
        all_time_topics: dict[str, int] = {}
        for tier in ("advanced", "intermediate", "fundamental"):
            for e in (matched_user.get("tagProblemCounts") or {}).get(tier) or []:
                tag = e.get("tagName", "")
                cnt = e.get("problemsSolved", 0)
                if tag and cnt > 0:
                    all_time_topics[tag] = all_time_topics.get(tag, 0) + cnt
        all_time_topics = dict(
            sorted(all_time_topics.items(), key=lambda x: x[1], reverse=True)
        )
        print(f"[LeetCode] ◄ all-time topicTags (top 10)={dict(list(all_time_topics.items())[:10])}")

        # ── Step 5: recent accepted submissions ────────────────────────────────
        raw_subs = payload_data.get("recentAcSubmissionList") or []
        print(f"[LeetCode] ◄ raw recentAcSubmissions returned: {len(raw_subs)}")

        # Parse basic fields; deduplicate slugs so we fire at most 1 detail request per problem
        parsed_subs: list[dict] = []
        seen_slugs: set[str] = set()
        for sub in raw_subs[:20]:
            title     = sub.get("title", "")
            titleSlug = sub.get("titleSlug", "")
            lang      = sub.get("lang", "")
            try:
                ts = int(sub.get("timestamp", 0))
            except (ValueError, TypeError):
                ts = 0
            if title and titleSlug:
                parsed_subs.append({"title": title, "titleSlug": titleSlug, "lang": lang, "timestamp": ts})
                seen_slugs.add(titleSlug)

        # ── Step 6: concurrently fetch question details for all unique slugs ───
        print(f"[LeetCode] ► Fetching question details for {len(seen_slugs)} unique slugs ...")
        async with httpx.AsyncClient(timeout=15) as detail_client:
            detail_results = await asyncio.gather(
                *[_fetch_question_detail(detail_client, slug) for slug in seen_slugs],
                return_exceptions=True,
            )

        # Build lookup: titleSlug → (difficulty, [tags])
        slug_detail: dict[str, tuple[str, list[str]]] = {}
        for result in detail_results:
            if isinstance(result, Exception):
                print(f"[LeetCode]   ⚠ detail gather exception: {result}")
                continue
            slug, difficulty, tags = result
            slug_detail[slug] = (difficulty, tags)
            print(f"[LeetCode]   detail slug={slug!r}  diff={difficulty!r}  tags={tags}")

        # ── Step 7: build RecentSubmission objects + aggregate counters ─────────
        lang_counter:  Counter = Counter()
        topic_counter: Counter = Counter()
        recent_submissions: list[RecentSubmission] = []

        for sub in parsed_subs:
            slug = sub["titleSlug"]
            diff, tags = slug_detail.get(slug, ("", []))

            lang_counter[sub["lang"]] += 1
            topic_counter.update(tags)

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

        # Frequency dicts sorted descending
        recent_lang_stats  = dict(lang_counter.most_common())
        recent_topic_tags  = dict(topic_counter.most_common())
        most_used_language = lang_counter.most_common(1)[0][0] if lang_counter else ""

        print(f"[LeetCode] ◄ recent languageStats      = {recent_lang_stats}")
        print(f"[LeetCode] ◄ recent topicTags (top 10) = {dict(topic_counter.most_common(10))}")
        print(f"[LeetCode] ◄ mostUsedLanguage          = {most_used_language!r}")
        print(f"[LeetCode] ◄ recentSubmissions built   = {len(recent_submissions)}")

        # ── Step 8: assemble deep stats ────────────────────────────────────────
        # languageStats / topicTags use the *recent* aggregations for relevance;
        # all-time data is available in all_time_lang_stats / all_time_topics.
        deep = LeetCodeDeepStats(
            totalSolved=total_solved,
            difficulty=LeetCodeDifficulty(easy=easy, medium=medium, hard=hard),
            languageStats=recent_lang_stats,
            topicTags=recent_topic_tags,
            recentSubmissions=recent_submissions,
        )

        print(f"[LeetCode] ✅ Full LeetCode stats assembled")
        return LeetCodeStats(easy=easy, medium=medium, hard=hard, deep=deep)

    except Exception as e:
        print(f"[LeetCode] ❌ EXCEPTION: {e}")
        traceback.print_exc()
        return LeetCodeStats()


