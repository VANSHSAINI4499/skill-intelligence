"use client";

import { motion } from "framer-motion";

interface ScoreCircleProps {
  score?: number;
  maxScore?: number;
}

export function ScoreCircle({ score = 0, maxScore = 100 }: ScoreCircleProps) {
  const pct = Math.min((score / maxScore) * 100, 100);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const getStrokeColor = () => {
    if (pct >= 80) return "url(#gradGreen)";
    if (pct >= 60) return "url(#gradBlue)";
    if (pct >= 40) return "url(#gradAmber)";
    return "url(#gradRed)";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <defs>
            <linearGradient id="gradGreen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="gradAmber" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="gradRed" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="10"
          />
          {/* Progress arc */}
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={getStrokeColor()}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          />
        </svg>
        {/* Centre text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-white leading-none">
            {score.toFixed(0)}
          </span>
          <span className="text-xs text-slate-400 mt-0.5">/ {maxScore}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
        Overall Score
      </span>
    </div>
  );
}
