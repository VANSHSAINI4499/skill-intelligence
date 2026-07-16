# Skill Intelligence Backend (FastAPI)

This directory contains the FastAPI backend for the Skill Intelligence platform.

## Vercel Deployment & Serverless Functions Note

When deploying this `backend` folder as a separate project on Vercel using the Python runtime, Vercel automatically detects `main.py` (or the ASGI application entrypoint) without needing a `vercel.json` configuration file.

### Function Timeout / `maxDuration` Configuration

We previously attempted to configure a custom function timeout using `backend/vercel.json`:
```json
{
  "functions": {
    "main.py": { "maxDuration": 30 }
  }
}
```
However, specifying `"main.py"` caused Vercel deployments to fail with:
> *Error: The pattern "main.py" defined in `functions` doesn't match any Serverless Functions inside the `api` directory.*

**Important:** Do **not** blindly recreate `vercel.json` with guessed patterns (e.g., `api/main.py` or `*.py`). 

To correctly configure `maxDuration` or other function properties in the future:
1. First, deploy the backend to Vercel **without** `vercel.json`.
2. Once the deployment succeeds, go to the project's **Functions** tab in the Vercel dashboard.
3. Check the exact resolved serverless function entrypoint path that Vercel detected and created for `main.py`.
4. Use that exact path pattern as the key inside the `functions` object in `vercel.json`.
