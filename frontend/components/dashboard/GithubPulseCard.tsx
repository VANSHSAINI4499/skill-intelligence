"use client";

import { motion } from "framer-motion";
import { Github, Star, GitFork, TrendingUp } from "lucide-react";

interface GithubPulseCardProps {
  totalRepos?: number;
  totalStars?: number;
}

const MOCK_LANGUAGES = [
  { name: "JavaScript", pct: 38, color: "bg-yellow-400" },
  { name: "TypeScript", pct: 28, color: "bg-blue-400" },
  { name: "Python", pct: 20, color: "bg-green-400" },
  { name: "C++", pct: 14, color: "bg-purple-400" },
];

export function GithubPulseCard({ totalRepos = 0, totalStars = 0 }: GithubPulseCardProps) {
  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0B1120] rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <GitFork size={14} className="text-cyan-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Repositories</span>
          </div>
          <motion.span
            className="text-4xl font-extrabold bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {totalRepos}
          </motion.span>
        </div>
        <div className="bg-[#0B1120] rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Star size={14} className="text-amber-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Total Stars</span>
          </div>
          <motion.span
            className="text-4xl font-extrabold bg-linear-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {totalStars}
          </motion.span>
        </div>
      </div>

      {/* Language distribution */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-violet-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Language Distribution (based on public repos)
          </span>
        </div>
        <div className="space-y-3">
          {MOCK_LANGUAGES.map((lang, i) => (
            <div key={lang.name}>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{lang.name}</span>
                <span>{lang.pct}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${lang.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${lang.pct}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-auto">
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/30">
          <Github size={12} />
          <span>Top repositories integration coming in Phase 2</span>
        </div>
      </div>
    </div>
  );
}
