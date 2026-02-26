from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PORT: int = 5000
    APP_ENV: str = "development"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    FIREBASE_SERVICE_ACCOUNT_PATH: str = "serviceAccountKey.json"
    GITHUB_TOKEN: str = ""
    LEETCODE_GRAPHQL_URL: str = "https://leetcode.com/graphql"

    # ── Phase 2: AI Chat ───────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL:   str = "gemini-1.5-flash"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
