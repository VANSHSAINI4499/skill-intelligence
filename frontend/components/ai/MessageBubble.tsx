"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, TrendingDown, TrendingUp, ChevronDown, ChevronUp, Target } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage, GapReport, TopicGap, LanguageGapEntry } from "@/models/ai";
import { SplineScene } from "@/components/ui/splite";
import { useTypingEffect } from "@/hooks/useTypingEffect";

// ── Gap Report Card ─────────────────────────────────────────────────────────

function GapReportCard({ report }: { report: GapReport }) {
  const [expanded, setExpanded] = useState(false);
  const gapIsPositive = report.overallGap >= 0;

  const levelColor = {
    Low:    "bg-green-500/15 text-green-400 border-green-500/30",
    Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    High:   "bg-red-500/15   text-red-400   border-red-500/30",
  }[report.recommendationLevel] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30";

  const weakTopics   = report.weakTopics   ?? [];
  const strongTopics = report.strongTopics ?? [];
  const langGaps     = report.languageGaps ?? {};
  const hasTopicData = weakTopics.length > 0 || strongTopics.length > 0;
  const hasLangData  = Object.keys(langGaps).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-3 rounded-xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm text-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          📊 Gap Report · Batch {report.batch}
        </p>

        {/* Score row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-800/60 py-2 px-3">
            <p className="text-xs text-slate-500 mb-0.5">Your Score</p>
            <p className="text-lg font-bold text-white">{report.studentScore}</p>
          </div>
          <div className="rounded-lg bg-slate-800/60 py-2 px-3">
            <p className="text-xs text-slate-500 mb-0.5">Batch Avg</p>
            <p className="text-lg font-bold text-slate-300">{report.batchAvgScore}</p>
          </div>
          <div className={`rounded-lg py-2 px-3 ${gapIsPositive ? "bg-green-500/10" : "bg-red-500/10"}`}>
            <p className="text-xs text-slate-500 mb-0.5">Gap</p>
            <p className={`text-lg font-bold flex items-center justify-center gap-0.5 ${gapIsPositive ? "text-green-400" : "text-red-400"}`}>
              {gapIsPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(report.overallGap).toFixed(1)}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
            Grade {report.studentGrade}
          </span>
          {report.targetGrade && (
            <span className="px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 text-xs font-medium border border-violet-500/20 flex items-center gap-1">
              <Target size={10} /> Targeting {report.targetGrade}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-medium border border-blue-500/20">
            ~{report.percentileEstimate}th percentile
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs border border-slate-700">
            {report.batchSize} peers
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${levelColor}`}>
            {report.recommendationLevel} priority
          </span>
        </div>
      </div>

      {/* Expandable detail section — topic + language gaps */}
      {(hasTopicData || hasLangData) && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 transition-colors border-t border-slate-700/50"
          >
            <span>{expanded ? "Hide" : "Show"} skill breakdown</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-2 space-y-4 border-t border-slate-700/50">

                  {/* Weak topics */}
                  {weakTopics.length > 0 && (
                    <div>
                      <p className="text-xs text-red-400 font-semibold mb-2">
                        📉 Weak Topics (vs Grade {report.targetGrade ?? "target"})
                      </p>
                      <div className="space-y-1.5">
                        {weakTopics.map((t: TopicGap) => (
                          <div key={t.topic} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-32 shrink-0 truncate" title={t.topic}>
                              {t.topic}
                            </span>
                            <div className="flex-1 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-red-400/60"
                                style={{ width: `${Math.min(t.studentPct, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 w-20 text-right shrink-0">
                              {t.studentPct}% → {t.targetPct}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strong topics */}
                  {strongTopics.length > 0 && (
                    <div>
                      <p className="text-xs text-green-400 font-semibold mb-2">✅ Strong Topics</p>
                      <div className="flex flex-wrap gap-1.5">
                        {strongTopics.map((t: TopicGap) => (
                          <span key={t.topic} className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-300 text-xs border border-green-500/20">
                            {t.topic} ({t.studentPct}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Language gaps */}
                  {hasLangData && (
                    <div>
                      <p className="text-xs text-amber-400 font-semibold mb-2">
                        🌐 Language Gaps (GitHub)
                      </p>
                      <div className="space-y-1.5">
                        {Object.entries(langGaps)
                          .sort(([, a], [, b]) => b.gap - a.gap)
                          .map(([lang, data]: [string, LanguageGapEntry]) => (
                            <div key={lang} className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 w-24 shrink-0">{lang}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${data.gap > 0 ? "bg-amber-400/60" : "bg-green-400/60"}`}
                                  style={{ width: `${Math.min(data.studentPct, 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500 w-20 text-right shrink-0">
                                {data.studentPct}% → {data.targetPct}%
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Legacy skills if any */}
                  {report.weakSkills.length > 0 && (
                    <div>
                      <p className="text-xs text-red-400 font-semibold mb-1.5">Weak skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {report.weakSkills.map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-300 text-xs border border-red-500/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.strongSkills.length > 0 && (
                    <div>
                      <p className="text-xs text-green-400 font-semibold mb-1.5">Strong skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {report.strongSkills.map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-300 text-xs border border-green-500/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}


// ── Markdown renderer for AI messages ───────────────────────────────────────

function AiMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => <h1 className="text-base font-bold text-white mt-3 mb-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold text-slate-100 mt-3 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-0.5">{children}</h3>,
        // Paragraphs
        p: ({ children }) => <p className="text-slate-200 text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
        // Lists
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-sm text-slate-200">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-sm text-slate-200">{children}</ol>,
        li: ({ children }) => <li className="text-slate-300 leading-relaxed">{children}</li>,
        // Inline code
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          return isBlock ? (
            <code className={`block w-full text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 my-2 text-cyan-300 overflow-x-auto whitespace-pre ${className}`}>
              {children}
            </code>
          ) : (
            <code className="text-xs font-mono bg-slate-900/80 border border-slate-700/50 rounded px-1.5 py-0.5 text-cyan-300">
              {children}
            </code>
          );
        },
        // Block quotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-cyan-500/40 pl-3 my-2 text-slate-400 italic text-sm">
            {children}
          </blockquote>
        ),
        // Strong / em
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em:     ({ children }) => <em className="italic text-slate-300">{children}</em>,
        // Horizontal rule
        hr: () => <hr className="border-slate-700/50 my-3" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}


// ── Message Bubble ──────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message:    ChatMessage;
  isLatestAi: boolean;   // only the newest AI msg gets the typing effect
}

export function MessageBubble({ message, isLatestAi }: MessageBubbleProps) {
  const isUser = message.role === "user";

  // Typing effect only for the latest AI message
  const displayed = useTypingEffect(
    message.content,
    { speed: 8, tickMs: 18, enabled: !isUser && isLatestAi }
  );

  const content = isUser ? message.content : displayed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`
          shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center mt-0.5
          ${isUser ? "bg-gradient-to-br from-violet-500 to-indigo-600" : ""}
        `}
      >
        {isUser ? (
          <User size={14} className="text-white" />
        ) : (
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
          />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 ${isUser ? "items-end" : "items-start"} flex flex-col max-w-[80%]`}>
        {/* Bubble */}
        <div
          className={`
            rounded-2xl px-4 py-3 text-sm leading-relaxed
            ${isUser
              ? "bg-violet-600/30 border border-violet-500/30 text-violet-100 rounded-tr-sm whitespace-pre-wrap"
              : "bg-slate-800/70 border border-slate-700/60 text-slate-200 rounded-tl-sm"
            }
          `}
        >
          {isUser ? (
            content
          ) : (
            /* AI messages: render markdown for completed text, plain for in-progress typing */
            (isLatestAi && content !== message.content)
              ? <span className="whitespace-pre-wrap">{content}</span>   /* still typing → plain */
              : <AiMarkdown content={content} />                          /* done → rich markdown */
          )}

          {/* Blinking cursor while typing */}
          {!isUser && isLatestAi && content !== message.content && (
            <span className="inline-block w-0.5 h-3.5 ml-0.5 bg-cyan-400 animate-pulse rounded-sm align-middle" />
          )}
        </div>

        {/* Gap report attachment (AI + gap_analysis only) */}
        {!isUser && message.gapReport && content === message.content && (
          <div className="w-full mt-1">
            <GapReportCard report={message.gapReport} />
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-slate-600 mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
}
