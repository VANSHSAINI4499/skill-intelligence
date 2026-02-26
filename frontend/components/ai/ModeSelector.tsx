"use client";

import { AiMode } from "@/models/ai";
import { motion } from "framer-motion";
import { BarChart2, TrendingUp, Mic } from "lucide-react";

interface ModeSelectorProps {
  selected: AiMode;
  onChange: (mode: AiMode) => void;
  disabled?: boolean;
}

const MODES: {
  id:          AiMode;
  label:       string;
  description: string;
  icon:        React.ReactNode;
  color:       string;
  activeClass: string;
}[] = [
  {
    id:          "gap_analysis",
    label:       "Gap Analysis",
    description: "See how you compare to your batch",
    icon:        <BarChart2 size={16} />,
    color:       "text-cyan-400",
    activeClass: "border-cyan-500/60 bg-cyan-500/10 text-cyan-300",
  },
  {
    id:          "upgrade_plan",
    label:       "Upgrade Plan",
    description: "Get a week-by-week study plan",
    icon:        <TrendingUp size={16} />,
    color:       "text-violet-400",
    activeClass: "border-violet-500/60 bg-violet-500/10 text-violet-300",
  },
  {
    id:          "interview",
    label:       "Interview Prep",
    description: "Practice with AI interview coach",
    icon:        <Mic size={16} />,
    color:       "text-amber-400",
    activeClass: "border-amber-500/60 bg-amber-500/10 text-amber-300",
  },
];

export function ModeSelector({ selected, onChange, disabled }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {MODES.map((m) => {
        const isActive = m.id === selected;
        return (
          <motion.button
            key={m.id}
            disabled={disabled}
            onClick={() => onChange(m.id)}
            whileHover={!disabled ? { scale: 1.02 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
            className={`
              relative flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left
              transition-all duration-200 select-none
              ${isActive
                ? m.activeClass
                : "border-slate-700/60 bg-slate-800/30 text-slate-400 hover:border-slate-600 hover:text-slate-300"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            <span className={`${isActive ? "" : m.color}`}>{m.icon}</span>
            <span className="text-sm font-semibold leading-tight">{m.label}</span>
            <span className="text-xs opacity-70 leading-tight hidden sm:block">
              {m.description}
            </span>
            {isActive && (
              <motion.div
                layoutId="mode-indicator"
                className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 pointer-events-none"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
