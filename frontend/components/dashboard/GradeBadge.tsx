"use client";

import { motion } from "framer-motion";

interface GradeBadgeProps {
  grade?: string;
}

const gradeConfig: Record<string, { glow: string; ring: string; text: string; label: string }> = {
  A: {
    glow: "shadow-[0_0_32px_rgba(52,211,153,0.5)]",
    ring: "ring-emerald-400/60",
    text: "text-emerald-300",
    label: "Exceptional",
  },
  B: {
    glow: "shadow-[0_0_32px_rgba(96,165,250,0.5)]",
    ring: "ring-blue-400/60",
    text: "text-blue-300",
    label: "Proficient",
  },
  C: {
    glow: "shadow-[0_0_32px_rgba(251,191,36,0.5)]",
    ring: "ring-amber-400/60",
    text: "text-amber-300",
    label: "Developing",
  },
  D: {
    glow: "shadow-[0_0_32px_rgba(248,113,113,0.5)]",
    ring: "ring-red-400/60",
    text: "text-red-300",
    label: "Needs Work",
  },
};

export function GradeBadge({ grade = "N/A" }: GradeBadgeProps) {
  const config = gradeConfig[grade] ?? {
    glow: "shadow-[0_0_24px_rgba(148,163,184,0.3)]",
    ring: "ring-slate-500/50",
    text: "text-slate-400",
    label: "Unranked",
  };

  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
      className="flex flex-col items-center gap-2"
    >
      <div
        className={`w-24 h-24 rounded-full ring-4 ${config.ring} ${config.glow} bg-[#111827] flex items-center justify-center`}
      >
        <span className={`text-5xl font-extrabold tracking-tighter ${config.text}`}>
          {grade}
        </span>
      </div>
      <span className={`text-xs font-semibold uppercase tracking-widest ${config.text} opacity-80`}>
        {config.label}
      </span>
    </motion.div>
  );
}
