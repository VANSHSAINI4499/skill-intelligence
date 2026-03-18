"use client";

import { useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/models/ai";
import { MessageBubble } from "./MessageBubble";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";

interface ChatWindowProps {
  messages: ChatMessage[];
  loading:  boolean;
}

// ── Animated "Thinking" Indicator ────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 items-end"
    >
      {/* AI avatar */}
      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
        <SplineScene
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="w-full h-full"
        />
      </div>

      {/* Bouncing dot bubble */}
      <div className="rounded-2xl rounded-tl-sm bg-slate-800/70 border border-slate-700/60 px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block w-2 h-2 rounded-full bg-cyan-400"
            animate={{
              y: ["0%", "-60%", "0%"],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
        <span className="text-slate-500 text-xs ml-1">SkillSight AI is thinking…</span>
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-2xl bg-black/[0.96] relative">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />

      {/* Left — text content */}
      <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
          SkillSight AI Coach
        </h1>
        <p className="mt-4 text-neutral-400 text-sm max-w-xs">
          Select a mode above and type a message to get started. I&apos;ll compare
          you against your batch and provide personalised guidance.
        </p>
        <div className="flex flex-wrap gap-2 mt-5">
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

      {/* Right — interactive 3D bot */}
      <div className="flex-1 relative">
        <SplineScene
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

// ── Chat Window ───────────────────────────────────────────────────────────────

export function ChatWindow({ messages, loading }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll whenever a message is added or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  // Determine the id of the latest AI message so only it gets the typing effect
  const latestAiId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "ai") return messages[i].id;
    }
    return null;
  }, [messages]);

  return (
    <div className="h-full overflow-y-auto px-6 py-4 space-y-5 scroll-smooth">
      {messages.length === 0 && !loading ? (
        <EmptyState />
      ) : (
        <>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLatestAi={msg.role === "ai" && msg.id === latestAiId}
            />
          ))}
          <AnimatePresence>
            {loading && <TypingIndicator key="typing" />}
          </AnimatePresence>
        </>
      )}
      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
