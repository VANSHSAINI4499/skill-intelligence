"use client";

import { motion, type Variants } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { LeetCodeDeepStats } from "@/models/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeetcodeMasteryCardProps {
  easy?: number;
  medium?: number;
  hard?: number;
  deepStats?: LeetCodeDeepStats;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp * 1000;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const w = Math.floor(d / 7);
  if (w > 0) return `${w}w ago`;
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const DIFF_CFG = {
  Easy:    { text: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30", bar: "bg-emerald-500" },
  Medium:  { text: "text-amber-400",   bg: "bg-amber-500/15",   border: "border-amber-500/30",   bar: "bg-amber-500"  },
  Hard:    { text: "text-rose-400",    bg: "bg-rose-500/15",    border: "border-rose-500/30",    bar: "bg-rose-500"   },
  Unknown: { text: "text-slate-400",   bg: "bg-slate-700/40",   border: "border-slate-700",      bar: "bg-slate-600"  },
};

const LANG_CFG: Record<string, { badge: string; bar: string }> = {
  python:     { badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",       bar: "bg-blue-500"    },
  python3:    { badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",       bar: "bg-blue-500"    },
  cpp:        { badge: "bg-violet-500/15 text-violet-300 border-violet-500/30", bar: "bg-violet-500"  },
  java:       { badge: "bg-orange-500/15 text-orange-300 border-orange-500/30", bar: "bg-orange-400"  },
  javascript: { badge: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30", bar: "bg-yellow-500"  },
  typescript: { badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",       bar: "bg-cyan-500"    },
  golang:     { badge: "bg-teal-500/15 text-teal-300 border-teal-500/30",       bar: "bg-teal-500"    },
  rust:       { badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",       bar: "bg-rose-500"    },
  c:          { badge: "bg-gray-500/15 text-gray-300 border-gray-600",          bar: "bg-gray-500"    },
  kotlin:     { badge: "bg-purple-500/15 text-purple-300 border-purple-500/30", bar: "bg-purple-500"  },
  swift:      { badge: "bg-orange-400/15 text-orange-200 border-orange-400/30", bar: "bg-orange-400"  },
};

function getLangCfg(lang: string) {
  return LANG_CFG[lang.toLowerCase()] ?? { badge: "bg-slate-700/40 text-slate-300 border-slate-700", bar: "bg-slate-500" };
}

// ─── Animation variants ───────────────────────────────────────────────────────

const stagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

// ─── Reusable primitives ──────────────────────────────────────────────────────

function SectionBlock({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-white/3 border border-white/6 p-4 ${className}`}>
      {children}
    </div>
  );
}

function BlockLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em] font-bold mb-3">{children}</p>
  );
}

// ─── Ring gauge (SVG arc) ─────────────────────────────────────────────────────

function RingGauge({ pct, colorClass, label, sublabel }: {
  pct: number; colorClass: string; label: string; sublabel: string;
}) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-14 h-14">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
          <motion.circle
            cx="26" cy="26" r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            className={colorClass}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center">
          <span className={`text-[10px] font-black font-mono ${colorClass}`}>{pct}%</span>
        </span>
      </div>
      <div className="text-center">
        <p className={`text-[10px] font-bold ${colorClass}`}>{label}</p>
        <p className="text-[9px] text-slate-600 mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LeetcodeMasteryCard({
  easy = 0,
  medium = 0,
  hard = 0,
  deepStats,
}: LeetcodeMasteryCardProps) {
  const total      = easy + medium + hard;
  const deepTotal  = deepStats?.totalSolved ?? total;
  const easyPct    = total ? Math.round((easy   / total) * 100) : 0;
  const medPct     = total ? Math.round((medium / total) * 100) : 0;
  const hardPct    = total ? Math.round((hard   / total) * 100) : 0;

  const langEntries    = Object.entries(deepStats?.languageStats ?? {}).sort((a, b) => b[1] - a[1]);
  const totalLangCount = langEntries.reduce((s, [, v]) => s + v, 0);
  const mostUsedLang   = langEntries[0]?.[0] ?? null;

  const topTopics  = Object.entries(deepStats?.topicTags ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const submissions = deepStats?.recentSubmissions ?? [];

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (total === 0 && !deepStats) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-2xl">🧩</div>
        <p className="text-slate-300 text-sm font-semibold">No LeetCode data yet</p>
        <p className="text-slate-600 text-xs">Enter your username and click Analyze</p>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">

      {/* S1 — HEADER: Total Solved + Difficulty bars */}
      <motion.div variants={fadeUp}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em] font-bold mb-1">Total Solved</p>
            <motion.span
              className="text-6xl font-black leading-none bg-linear-to-r from-orange-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 160, damping: 16, delay: 0.15 }}
            >
              {deepTotal}
            </motion.span>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            {(
              [
                { label: "Easy",   count: easy,   cfg: DIFF_CFG.Easy   },
                { label: "Medium", count: medium, cfg: DIFF_CFG.Medium },
                { label: "Hard",   count: hard,   cfg: DIFF_CFG.Hard   },
              ] as const
            ).map(({ label, count, cfg }) => (
              <div key={label} className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.text}`}>{label}</span>
                <span className={`text-xs font-black font-mono ${cfg.text}`}>{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {(
            [
              { label: "Easy",   pct: easyPct, cfg: DIFF_CFG.Easy   },
              { label: "Medium", pct: medPct,  cfg: DIFF_CFG.Medium },
              { label: "Hard",   pct: hardPct, cfg: DIFF_CFG.Hard   },
            ] as const
          ).map(({ label, pct, cfg }) => (
            <div key={label} className="flex items-center gap-3">
              <span className={`text-[10px] font-bold w-12 text-right uppercase tracking-wide ${cfg.text}`}>{label}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-800/80 overflow-hidden shadow-inner">
                <motion.div
                  className={`h-full rounded-full ${cfg.bar}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.0, ease: "easeOut", delay: 0.25 }}
                />
              </div>
              <span className={`text-xs font-mono font-semibold w-9 text-right ${cfg.text}`}>{pct}%</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* S2 — PERFORMANCE BREAKDOWN: SVG ring gauges */}
      <motion.div variants={fadeUp}>
        <SectionBlock>
          <BlockLabel>Performance Breakdown</BlockLabel>
          <div className="grid grid-cols-3 gap-2">
            <RingGauge pct={easyPct} colorClass="text-emerald-400" label="Easy"   sublabel={`${easy} solved`}   />
            <RingGauge pct={medPct}  colorClass="text-amber-400"   label="Medium" sublabel={`${medium} solved`} />
            <RingGauge pct={hardPct} colorClass="text-rose-400"    label="Hard"   sublabel={`${hard} solved`}   />
          </div>
        </SectionBlock>
      </motion.div>

      {/* S3 — LANGUAGE DISTRIBUTION */}
      {langEntries.length > 0 && (
        <motion.div variants={fadeUp}>
          <SectionBlock>
            <div className="flex items-center justify-between mb-3">
              <BlockLabel>Language Distribution</BlockLabel>
              {mostUsedLang && (
                <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold ${getLangCfg(mostUsedLang).badge}`}>
                  ★ {mostUsedLang}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {langEntries.map(([lang, count]) => {
                const pct = totalLangCount ? Math.round((count / totalLangCount) * 100) : 0;
                const cfg = getLangCfg(lang);
                return (
                  <div key={lang} className="flex items-center gap-2.5">
                    <span className="text-[10px] text-slate-400 w-20 truncate capitalize font-medium">{lang}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${cfg.bar}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.85, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </SectionBlock>
        </motion.div>
      )}

      {/* S4 — TOP PROBLEM CATEGORIES: Glowing cyan pills */}
      {topTopics.length > 0 && (
        <motion.div variants={fadeUp}>
          <SectionBlock>
            <BlockLabel>Top Problem Categories</BlockLabel>
            <div className="flex flex-wrap gap-2">
              {topTopics.map(([tag, count], i) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.04 * i, type: "spring", stiffness: 200 }}
                  className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-300 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.12)] hover:bg-cyan-500/20 hover:shadow-[0_0_18px_rgba(6,182,212,0.28)] hover:border-cyan-500/40 transition-all duration-200 cursor-default select-none"
                >
                  {tag} <span className="text-cyan-500 font-black">({count})</span>
                </motion.span>
              ))}
            </div>
          </SectionBlock>
        </motion.div>
      )}

      {/* S5 — RECENT SUBMISSIONS: Scrollable rows */}
      {submissions.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="rounded-xl bg-white/3 border border-white/6 overflow-hidden">
            <div className="px-4 pt-3.5 pb-3 border-b border-white/6 flex items-center justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em] font-bold">Recent Submissions</p>
              <span className="text-[9px] text-slate-700 font-mono">{submissions.length} entries</span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "17rem", scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
              {submissions.map((sub, i) => {
                const diffKey = (sub.difficulty || "Unknown") as keyof typeof DIFF_CFG;
                const dCfg    = DIFF_CFG[diffKey] ?? DIFF_CFG.Unknown;
                const lCfg    = getLangCfg(sub.lang ?? "");
                return (
                  <motion.a
                    key={`${sub.titleSlug}-${i}`}
                    href={`https://leetcode.com/problems/${sub.titleSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.025 * i }}
                    whileHover={{ backgroundColor: "rgba(6,182,212,0.04)" }}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-white/4 last:border-0 group transition-colors duration-150 cursor-pointer"
                  >
                    <span className="text-[10px] text-slate-700 font-mono w-4 shrink-0 text-right">{i + 1}</span>
                    <span className="flex-1 text-xs text-slate-300 font-medium group-hover:text-cyan-300 transition-colors truncate min-w-0">
                      {sub.title}
                      <ExternalLink className="inline ml-1 w-2.5 h-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold shrink-0 ${dCfg.bg} ${dCfg.border} ${dCfg.text}`}>{diffKey}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium shrink-0 capitalize ${lCfg.badge}`}>{sub.lang}</span>
                    <span className="text-[9px] text-slate-600 shrink-0 w-12 text-right font-mono">{relativeTime(sub.timestamp)}</span>
                  </motion.a>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

    </motion.div>
  );
}