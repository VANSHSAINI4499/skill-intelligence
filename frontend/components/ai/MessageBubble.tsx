"use client";

import { motion } from "framer-motion";
import { User, TrendingDown, TrendingUp } from "lucide-react";
import { ChatMessage, GapReport } from "@/models/ai";
import { SplineScene } from "@/components/ui/splite";

// ── Gap Report Card ────────────────────────────────────────────────────────────

function GapReportCard({ report }: { report: GapReport }) {
  const gapIsPositive = report.overallGap >= 0;

  const levelColor = {
    Low:    "bg-green-500/15 text-green-400 border-green-500/30",
    Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    High:   "bg-red-500/15   text-red-400   border-red-500/30",
  }[report.recommendationLevel] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-3 rounded-xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-4 space-y-3 text-sm"
    >
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

      {/* Percentile + grade + batch size */}
      <div className="flex flex-wrap gap-2">
        <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
          Grade {report.studentGrade}
        </span>
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

      {/* Skills */}
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
    </motion.div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`
          shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center mt-0.5
          ${isUser ? "bg-linear-to-br from-violet-500 to-indigo-600" : ""}
        `}
      >
        {isUser ? (
          <User size={14} className="text-white" />
        ) : (
          /* 3D bot — scaled up slightly so it fills the circle nicely */
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
          />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 ${isUser ? "items-end" : "items-start"} flex flex-col max-w-[78%]`}>
        {/* Bubble */}
        <div
          className={`
            rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
            ${isUser
              ? "bg-violet-600/30 border border-violet-500/30 text-violet-100 rounded-tr-sm"
              : "bg-slate-800/70 border border-slate-700/60 text-slate-200 rounded-tl-sm"
            }
          `}
        >
          {message.content}
        </div>

        {/* Gap report attachment (AI only) */}
        {!isUser && message.gapReport && (
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
