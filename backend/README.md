# Skill Intelligence Backend (FastAPI)

This directory contains the FastAPI backend for the Skill Intelligence platform.

## Vercel Deployment Configuration (`vercel.json`)

When deploying this `backend` folder as a separate project on Vercel (`Root Directory = "backend"`), relying on pure auto-detection without explicit build configuration resulted in Vercel returning its 404 NOT_FOUND page on every API request.

To ensure Vercel builds `main.py` with `@vercel/python` and routes all incoming HTTP requests to our FastAPI ASGI app (`main.py`), explicit `builds` and `routes` are configured in `backend/vercel.json`:

```json
{
  "builds": [
    { "src": "main.py", "use": "@vercel/python" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "main.py" }
  ]
}
```

### Important Notes on Configuration Models
- **Do not mix `builds`/`routes` with `functions`**: The `builds`/`routes` format (`@vercel/python` builder) and the `functions` property (`api/*.py` serverless functions model) are two distinct Vercel deployment architectures and cannot/should not be mixed in the same `vercel.json`.
- **Requirements Declaration**: `@vercel/python` reads `backend/requirements.txt` during the build step. All dependencies (`fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`, `httpx`, `firebase-admin`, `python-dotenv`) must be listed there for the serverless builder to install them into the deployment environment.
