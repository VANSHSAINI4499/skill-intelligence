"""
Skill Intelligence Platform — FastAPI Backend
==============================================
Run:
    uvicorn main:app --reload --port 5000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from routers.analyze import router as analyze_router
from routers.filter import router as filter_router

app = FastAPI(
    title="Skill Intelligence API",
    description="Backend for the Skill Intelligence Platform",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(analyze_router, prefix="/api")
app.include_router(filter_router,  prefix="/api")


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "Skill Intelligence API is running"}
