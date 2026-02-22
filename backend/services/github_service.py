"""
GitHub REST API v3 client.
Fetches public repository statistics for a given username.
"""

import traceback
from typing import Optional

import httpx

from config.settings import settings
from models.student_model import GitHubStats


def _build_headers() -> dict:
    headers = {"Accept": "application/vnd.github+json"}
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"
        print("[GitHub] Auth header: Bearer token present")
    else:
        print("[GitHub] ⚠ No GITHUB_TOKEN set — using unauthenticated (60 req/hr limit)")
    return headers


def fetch_github_stats(username: str) -> GitHubStats:
    print(f"[GitHub] Fetching stats for username='{username}'")
    url = f"https://api.github.com/users/{username}/repos?per_page=100&type=owner"
    print(f"[GitHub] GET {url}")

    try:
        with httpx.Client(timeout=15) as client:
            response = client.get(url, headers=_build_headers())

        print(f"[GitHub] Status code: {response.status_code}")
        remaining = response.headers.get("X-RateLimit-Remaining", "unknown")
        print(f"[GitHub] X-RateLimit-Remaining: {remaining}")

        if response.status_code != 200:
            print(f"[GitHub] ❌ Non-200 response: {response.text[:300]}")
            return GitHubStats()

        repos = response.json()
        print(f"[GitHub] Total repos returned by API: {len(repos)}")

        total_repos = 0
        total_stars = 0

        for repo in repos:
            is_fork = repo.get("fork", False)  # default False — owned repos rarely omit this
            name = repo.get("name", "?")
            stars = repo.get("stargazers_count", 0)
            print(f"[GitHub]   repo={name!r}  fork={is_fork}  stars={stars}")
            if not is_fork:
                total_repos += 1
                total_stars += stars

        print(f"[GitHub] ✅ Result: totalRepos={total_repos}  totalStars={total_stars}")
        return GitHubStats(totalRepos=total_repos, totalStars=total_stars)

    except Exception as e:
        print(f"[GitHub] ❌ EXCEPTION: {e}")
        traceback.print_exc()
        return GitHubStats()
