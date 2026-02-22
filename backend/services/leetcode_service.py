"""
LeetCode GraphQL API client.
Fetches accepted submission counts broken down by difficulty.
"""

import traceback

import httpx

from config.settings import settings
from models.student_model import LeetCodeStats

_QUERY = """
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
    }
  }
}
"""


def fetch_leetcode_stats(username: str) -> LeetCodeStats:
    print(f"[LeetCode] Fetching stats for username='{username}'")

    payload = {"query": _QUERY, "variables": {"username": username}}
    print(f"[LeetCode] POST {settings.LEETCODE_GRAPHQL_URL}")
    print(f"[LeetCode] Payload: {payload}")

    try:
        with httpx.Client(timeout=15) as client:
            response = client.post(
                settings.LEETCODE_GRAPHQL_URL,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Referer": "https://leetcode.com",
                    "User-Agent": "Mozilla/5.0",
                },
            )

        print(f"[LeetCode] Status code: {response.status_code}")

        if response.status_code != 200:
            print(f"[LeetCode] ❌ Non-200 response: {response.text[:300]}")
            return LeetCodeStats()

        data = response.json()
        print(f"[LeetCode] Raw response JSON: {data}")

        matched_user = data.get("data", {}).get("matchedUser")
        if not matched_user:
            print(f"[LeetCode] ⚠ matchedUser is None — username may not exist or profile is private")
            return LeetCodeStats()

        ac_list = (
            matched_user
            .get("submitStatsGlobal", {})
            .get("acSubmissionNum", [])
        )
        print(f"[LeetCode] Raw acSubmissionNum: {ac_list}")

        easy = medium = hard = 0
        for entry in ac_list:
            diff = entry.get("difficulty", "").lower()
            count = entry.get("count", 0)
            print(f"[LeetCode]   difficulty={diff!r}  count={count}")
            if diff == "easy":
                easy = count
            elif diff == "medium":
                medium = count
            elif diff == "hard":
                hard = count

        print(f"[LeetCode] ✅ Result: easy={easy}  medium={medium}  hard={hard}")
        return LeetCodeStats(easy=easy, medium=medium, hard=hard)

    except Exception as e:
        print(f"[LeetCode] ❌ EXCEPTION: {e}")
        traceback.print_exc()
        return LeetCodeStats()
