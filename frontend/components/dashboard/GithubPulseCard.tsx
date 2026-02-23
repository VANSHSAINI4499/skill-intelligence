"use client";

import { motion } from "framer-motion";
import { Star, GitFork, TrendingUp, AlertCircle } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

interface GithubPulseCardProps {
  totalRepos?: number;
  totalStars?: number;
  languageDistribution?: Record<string, number>;
}

// Canonical color map for well-known languages
const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript:  "#f7df1e",
  TypeScript:  "#3178c6",
  Python:      "#3572a5",
  Java:        "#b07219",
  "C++":       "#f34b7d",
  "C#":        "#178600",
  C:           "#555555",
  Go:          "#00add8",
  Rust:        "#dea584",
  PHP:         "#4f5d95",
  Ruby:        "#701516",
  Kotlin:      "#a97bff",
  Swift:       "#ff6b35",
  Dart:        "#00b4ab",
  HTML:        "#e34c26",
  CSS:         "#563d7c",
  Shell:       "#89e051",
  Vue:         "#41b883",
  Svelte:      "#ff3e00",
};

const FALLBACK_PALETTE = [
  "#06b6d4", "#7c3aed", "#f97316", "#10b981",
  "#ec4899", "#0ea5e9", "#a78bfa", "#34d399",
];

const getLangColor = (lang: string, idx: number) =>
  LANGUAGE_COLORS[lang] ?? FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-[#0d1424] border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-white font-semibold">{name}</p>
      <p className="text-slate-400">{value} repo{value !== 1 ? "s" : ""}</p>
    </div>
  );
}

export function GithubPulseCard({
  totalRepos = 0,
  totalStars = 0,
  languageDistribution = {},
}: GithubPulseCardProps) {
  const langEntries = Object.entries(languageDistribution).sort(([, a], [, b]) => b - a);
  const total = langEntries.reduce((s, [, v]) => s + v, 0);
  const chartData = langEntries.map(([name, value]) => ({ name, value }));
  const hasData   = chartData.length > 0;

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* ── Stat chips ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0B1120] rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <GitFork size={14} className="text-cyan-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Repositories</span>
          </div>
          <motion.span
            className="text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"
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
            className="text-4xl font-extrabold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {totalStars}
          </motion.span>
        </div>
      </div>

      {/* ── Language distribution ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-violet-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Language Distribution
          </span>
          {hasData && (
            <span className="ml-auto text-xs text-slate-600">{langEntries.length} languages</span>
          )}
        </div>

        {!hasData ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 min-h-[160px]
                          rounded-xl border border-dashed border-slate-700/60 bg-slate-800/20">
            <AlertCircle size={20} className="text-slate-600" />
            <p className="text-xs text-slate-500">No language data available</p>
            <p className="text-xs text-slate-600">Run Analyze to fetch live data</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Donut chart */}
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%" cy="50%"
                  innerRadius={48}
                  outerRadius={76}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  animationBegin={200}
                  animationDuration={900}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={entry.name} fill={getLangColor(entry.name, i)} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend bars */}
            <div className="space-y-2">
              {langEntries.slice(0, 5).map(([lang, count], i) => {
                const pct   = total ? Math.round((count / total) * 100) : 0;
                const color = getLangColor(lang, i);
                return (
                  <motion.div
                    key={lang}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.07 }}
                  >
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: color }}
                        />
                        <span className="text-slate-300">{lang}</span>
                      </span>
                      <span className="text-slate-500">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{
                          duration: 0.9,
                          delay: 0.35 + i * 0.08,
                          ease: "easeOut",
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
