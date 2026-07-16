from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PORT: int = 5000
    APP_ENV: str = "development"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://skill_intelligence.vercel.app",
    ]
    FIREBASE_SERVICE_ACCOUNT_PATH: str = "serviceAccountKey.json"
    # On Vercel (read-only FS) paste the full service-account JSON as one line here.
    # Leave empty on local dev — FIREBASE_SERVICE_ACCOUNT_PATH is used instead.
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""
    GITHUB_TOKEN: str = ""
    LEETCODE_GRAPHQL_URL: str = "https://leetcode.com/graphql"

    # ── Phase 2: AI Chat (OpenAI) ─────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL:   str = "gpt-4o-mini"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
