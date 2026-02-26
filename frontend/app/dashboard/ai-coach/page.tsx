"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, AlertCircle, X } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useAiChat } from "@/hooks/useAiChat";
import { AiMode } from "@/models/ai";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ModeSelector } from "@/components/ai/ModeSelector";
import { ChatWindow } from "@/components/ai/ChatWindow";

export default function AiCoachPage() {
  const router   = useRouter();
  const { user, role, loading: authLoading } = useAuth({ required: "student" });

  const { messages, sendMessage, loading, error, clearError } = useAiChat();

  const [mode,  setMode]  = useState<AiMode>("gap_analysis");
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    router.replace("/login");
  }, [router]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    inputRef.current?.focus();
    await sendMessage(text, mode);
  }, [input, loading, mode, sendMessage]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ── Auth gate ────────────────────────────────────────────────────────────────
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 animate-pulse" />
          <p className="text-slate-500 text-sm">Loading AI Coach…</p>
        </div>
      </div>
    );
  }

  const displayName = user.displayName || user.email?.split("@")[0] || "Student";

  return (
    <DashboardLayout
      userRole={role === "admin" ? "admin" : "student"}
      userName={displayName}
      onLogout={handleLogout}
    >
      <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] -m-8">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-800/60 bg-[#0B1120]">
          {/* Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">AI Coach</h1>
              <p className="text-slate-500 text-xs">Batch-aware intelligence · {messages.length} messages</p>
            </div>
          </div>

          {/* Mode selector */}
          <ModeSelector
            selected={mode}
            onChange={setMode}
            disabled={loading}
          />
        </div>

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="shrink-0 overflow-hidden"
            >
              <div className="flex items-start gap-2 px-6 py-3 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={clearError} className="shrink-0 hover:text-red-300 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Chat window (scrollable) ──────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden bg-[#0B1120]">
          <ChatWindow messages={messages} loading={loading} />
        </div>

        {/* ── Input bar (sticky bottom) ─────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-800/60 bg-[#0d1526]">
          <div className={`
            flex gap-3 items-end rounded-2xl border px-4 py-3
            transition-colors duration-200
            ${loading
              ? "border-slate-700/40 bg-slate-800/20"
              : "border-slate-700/60 bg-slate-800/40 focus-within:border-cyan-500/50 focus-within:bg-slate-800/60"
            }
          `}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              disabled={loading}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-grow up to ~5 lines
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                loading
                  ? "AI is thinking…"
                  : mode === "gap_analysis"
                  ? "Ask about your skills or batch standing…"
                  : mode === "upgrade_plan"
                  ? "Describe your goal or ask for a study plan…"
                  : "Ask a question or paste an answer to review…"
              }
              className="flex-1 resize-none bg-transparent text-slate-200 placeholder-slate-600 text-sm leading-relaxed focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed min-h-6"
            />
            <motion.button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              whileTap={{ scale: 0.92 }}
              className={`
                shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200
                ${input.trim() && !loading
                  ? "bg-cyan-500 hover:bg-cyan-400 text-white shadow-md shadow-cyan-500/30"
                  : "bg-slate-700/50 text-slate-600 cursor-not-allowed"
                }
              `}
            >
              <Send size={15} className={loading ? "animate-pulse" : ""} />
            </motion.button>
          </div>
          <p className="text-[10px] text-slate-700 text-center mt-2">
            Enter to send · Shift+Enter for new line · Responses use your live batch analytics
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
}
