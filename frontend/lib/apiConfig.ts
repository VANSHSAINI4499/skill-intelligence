/**
 * apiConfig.ts — Single source of truth for the backend API base URL.
 *
 * Set NEXT_PUBLIC_BACKEND_URL in your environment:
 *   - Local dev  : http://127.0.0.1:5000/api  (default)
 *   - Vercel     : https://skill-intelligence-backend.vercel.app/api
 *
 * Add to Vercel → Project Settings → Environment Variables:
 *   NEXT_PUBLIC_BACKEND_URL = https://skill-intelligence-backend.vercel.app/api
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000/api";
