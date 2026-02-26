"""
Skill Intelligence Platform — FastAPI Backend
==============================================
Run:
    uvicorn main:app --reload --port 5000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from routers.auth    import router as auth_router
from routers.admin   import router as admin_router
from routers.student import router as student_router
from routers.ai_chat import router as ai_chat_router
from routers.debug   import router as debug_router

app = FastAPI(
    title="Skill Intelligence API",
    description="Multi-university Skill Intelligence SaaS — FastAPI Backend",
    version="2.0.0",
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
app.include_router(auth_router,    prefix="/api")   # /api/auth/*
app.include_router(admin_router,   prefix="/api")   # /api/admin/*
app.include_router(student_router, prefix="/api")   # /api/student/*
app.include_router(ai_chat_router, prefix="/api")   # /api/ai/*
app.include_router(debug_router,   prefix="/api")   # /api/debug/*


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "Skill Intelligence API v2.0 is running"}
