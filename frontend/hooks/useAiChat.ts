"use client";
/**
 * useAiChat.ts
 * ─────────────
 * State and network logic for the AI Coach chat.
 *
 * Uses the shared `apiRequest` wrapper which:
 *  - Automatically attaches the Firebase JWT (Authorization: Bearer …)
 *  - Auto-retries once with a force-refreshed token on 401
 *  - Throws ApiError on non-2xx responses
 *
 * Returns:
 *   messages     — ordered list of ChatMessage
 *   sendMessage  — async, takes (text: string)
 *   loading      — true while waiting for AI response
 *   error        — last error string, null when clear
 *   clearError   — reset error state
 */

import { useState, useCallback } from "react";
import { apiRequest, ApiError } from "@/services/apiClient";
import { AiMode, ChatMessage, ChatResponse } from "@/models/ai";

let _counter = 0;
const uid = () => `msg-${Date.now()}-${++_counter}`;

interface UseAiChatReturn {
  messages:    ChatMessage[];
  sendMessage: (text: string, mode: AiMode) => Promise<void>;
  loading:     boolean;
  error:       string | null;
  clearError:  () => void;
}

export function useAiChat(): UseAiChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const sendMessage = useCallback(async (text: string, mode: AiMode) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // 1 — Optimistically append user message
    const userMsg: ChatMessage = {
      id:        uid(),
      role:      "user",
      content:   trimmed,
      mode,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    // 2 — POST /ai/chat
    try {
      const data = await apiRequest<ChatResponse>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ mode, message: trimmed }),
      });

      const aiMsg: ChatMessage = {
        id:        uid(),
        role:      "ai",
        content:   data.reply,
        mode,
        gapReport: data.gapReport,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? _aiErrorMessage(err)
          : err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return { messages, sendMessage, loading, error, clearError };
}

/**
 * Maps each HTTP status code from POST /ai/chat to an actionable
 * message so the developer/student knows exactly what to fix.
 */
function _aiErrorMessage(err: ApiError): string {
  switch (err.status) {
    case 0:
      return (
        "Cannot reach the backend. " +
        "Make sure uvicorn is running: " +
        "`uvicorn main:app --reload --port 5000` in the backend/ folder."
      );
    case 401:
      return (
        "Your session expired. " +
        "Refresh the page and log in again to get a new token."
      );
    case 403:
      return (
        "Access denied — this endpoint is for students only. " +
        "Make sure you are logged in with a student account."
      );
    case 404:
      return (
        "Student profile not found in Firestore. " +
        "Ensure your account document exists at " +
        "`/universities/{universityId}/students/{uid}` " +
        "and the `university_id` JWT claim is set."
      );
    case 408:
      return (
        "Request timed out (>30 s). " +
        "Gemini may be slow — wait a moment and try again. " +
        "If this repeats, increase `timeoutMs` in apiClient.ts."
      );
    case 422:
      return (
        "Validation error — the server rejected the request body. " +
        "Check that `mode` is one of: gap_analysis | upgrade_plan | interview, " +
        "and that `message` is a non-empty string. " +
        `Server detail: ${err.message}`
      );
    case 429:
      return (
        "Gemini free-tier rate limit hit (429). " +
        "Wait ~60 seconds, then try again. " +
        "To avoid this, upgrade your Google AI Studio plan or reduce request frequency."
      );
    case 500:
      return (
        "Internal server error on the backend. " +
        "Check the uvicorn terminal for the Python traceback. " +
        `Server detail: ${err.message}`
      );
    case 502:
      return (
        "Backend could not reach the Gemini API (502). " +
        "Check: (1) GEMINI_API_KEY in backend/.env is valid, " +
        "(2) GEMINI_MODEL=gemini-2.0-flash in .env, " +
        "(3) restart uvicorn after any .env change. " +
        `Server detail: ${err.message}`
      );
    case 503:
      return (
        "Gemini API is temporarily unavailable (503). " +
        "This is a Google-side outage — wait a few minutes and retry."
      );
    default:
      return err.message;
  }
}
