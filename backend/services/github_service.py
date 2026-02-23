"""
GitHub REST API v3 client.
Fetches public repository statistics for a given username.
"""

import traceback
from typing import Optional

import httpx

from config.settings import settings
from models.student_model import GitHubStats, TopRepository


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
        language_distribution: dict[str, int] = {}
        owned_repos = []

        for repo in repos:
            is_fork = repo.get("fork", False)
            name     = repo.get("name", "?")
            stars    = repo.get("stargazers_count", 0)
            language = repo.get("language")  # may be None
            print(f"[GitHub]   repo={name!r}  fork={is_fork}  stars={stars}  lang={language!r}")

            if not is_fork:
                total_repos += 1
                total_stars += stars

                # Accumulate language distribution (skip None)
                if language:
                    language_distribution[language] = language_distribution.get(language, 0) + 1

                # Collect for top-5 sort
                owned_repos.append({
                    "name":     name,
                    "stars":    stars,
                    "html_url": repo.get("html_url", ""),
                    "language": language,
                })

        # Sort by stars descending, take top 5
        top_repos = sorted(owned_repos, key=lambda r: r["stars"], reverse=True)[:5]

        print(f"[GitHub] ✅ totalRepos={total_repos}  totalStars={total_stars}")
        print(f"[GitHub] 🗣  languageDistribution={language_distribution}")
        print(f"[GitHub] ⭐ topRepositories={[r['name'] for r in top_repos]}")

        top_repo_models = [
            TopRepository(
                name=r["name"],
                stars=r["stars"],
                html_url=r["html_url"],
                language=r["language"],
            )
            for r in top_repos
        ]

        return GitHubStats(
            totalRepos=total_repos,
            totalStars=total_stars,
            languageDistribution=language_distribution,
            topRepositories=top_repo_models,
        )

    except Exception as e:
        print(f"[GitHub] ❌ EXCEPTION: {e}")
        traceback.print_exc()
        return GitHubStats()
