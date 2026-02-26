"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Loader2 } from "lucide-react";
import { ChatMessage } from "@/models/ai";
import { MessageBubble } from "./MessageBubble";

interface ChatWindowProps {
  messages: ChatMessage[];
  loading:  boolean;
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex gap-3 items-end"
    >
      <div className="w-8 h-8 rounded-full bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-white" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-slate-800/70 border border-slate-700/60 px-4 py-3 flex items-center gap-2">
        <Loader2 size={14} className="text-cyan-400 animate-spin" />
        <span className="text-slate-400 text-sm">SkillSight AI is thinking…</span>
      </div>
    </motion.div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center">
        <Bot size={28} className="text-cyan-400" />
      </div>
      <div>
        <p className="text-white font-semibold text-lg">SkillSight AI Coach</p>
        <p className="text-slate-500 text-sm mt-1 max-w-xs">
          Select a mode above and type a message to get started. I&apos;ll compare
          you against your batch and provide personalised guidance.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {[
          "What should I improve first?",
          "Build me a 4-week plan",
          "Give me a mock interview question",
        ].map((hint) => (
          <span
            key={hint}
            className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-500 bg-slate-800/40"
          >
            {hint}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Chat Window ────────────────────────────────────────────────────────────────

export function ChatWindow({ messages, loading }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll whenever messages or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scroll-smooth">
      {messages.length === 0 && !loading ? (
        <EmptyState />
      ) : (
        <>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <AnimatePresence>
            {loading && <TypingIndicator key="typing" />}
          </AnimatePresence>
        </>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
