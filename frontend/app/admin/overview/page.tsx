"use client";

import { motion } from "framer-motion";
import {
  Users, TrendingUp, CheckCircle2, AlertCircle, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, Legend,
} from "recharts";
import { useOverviewViewModel } from "@/viewmodels/adminViewModel";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GRADE_COLORS: Record<string, string> = {
  A: "#10b981", B: "#06b6d4", C: "#f59e0b", D: "#f43f5e",
};

const GlassCard = ({
  children, className = "",
}: { children: React.ReactNode; className?: string }) => (
  <div
    className={`rounded-2xl bg-white/3 border border-white/6 backdrop-blur-sm
                shadow-lg shadow-black/20 ${className}`}
  >
    {children}
  </div>
);

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08 } }),
};

// ── Custom recharts tooltip ───────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#0d1a30] border border-white/10 px-3 py-2 text-xs shadow-xl">
      {label && <p className="text-slate-400 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill || p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function OverviewPage() {
  const { stats, loading, error, refresh } = useOverviewViewModel();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="text-rose-400" size={40} />
        <p className="text-slate-400 text-sm">{error}</p>
        <button onClick={refresh}
          className="px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-sm hover:bg-cyan-500/20 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const gradeData = Object.entries(stats.gradeDistribution).map(([grade, count]) => ({
    grade, count, fill: GRADE_COLORS[grade] ?? "#64748b",
  }));

  const batchData = Object.entries(stats.batchDistribution)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([batch, count]) => ({ batch, count }));

  const branchData = Object.entries(stats.branchDistribution)
    .sort(([, a], [, b]) => b - a)
    .map(([branch, count]) => ({ branch, count }));

  const KPI_CARDS = [
    {
      label: "Total Students", value: stats.totalStudents, icon: Users,
      color: "cyan", sub: `${stats.activeStudents} active`,
    },
    {
      label: "Average Score", value: `${stats.avgScore.toFixed(1)}`, icon: TrendingUp,
      color: "violet", sub: "out of 100",
    },
    {
      label: "Grade A Students", value: stats.gradeDistribution["A"] ?? 0, icon: CheckCircle2,
      color: "emerald", sub: "top performers",
    },
    {
      label: "Active Students", value: stats.activeStudents, icon: AlertCircle,
      color: "amber", sub: "currently active",
    },
  ];

  const COLOR_MAP: Record<string, string> = {
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    violet: "from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Platform-wide student performance at a glance</p>
        </div>
        <button onClick={refresh}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 border border-white/6
                     text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_CARDS.map((card, i) => (
          <motion.div key={card.label} custom={i} initial="hidden" animate="show" variants={fadeUp}>
            <div className={`rounded-2xl bg-linear-to-br ${COLOR_MAP[card.color]}
                             border p-5 shadow-lg`}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{card.label}</p>
                <card.icon size={18} className={COLOR_MAP[card.color].split(" ").pop()} />
              </div>
              <p className="text-3xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        <motion.div custom={4} initial="hidden" animate="show" variants={fadeUp}>
          <GlassCard className="p-6">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Grade Distribution</h2>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="60%" height={180}>
                <PieChart>
                  <Pie data={gradeData} dataKey="count" nameKey="grade"
                    cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4}>
                    {gradeData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {gradeData.map(({ grade, count, fill }) => (
                  <div key={grade} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fill }} />
                      <span className="text-sm text-slate-400">Grade {grade}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Batch Distribution */}
        <motion.div custom={5} initial="hidden" animate="show" variants={fadeUp}>
          <GlassCard className="p-6">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Students by Batch</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={batchData} barSize={32}>
                <XAxis dataKey="batch" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      </div>

      {/* Branch Distribution */}
      {branchData.length > 0 && (
        <motion.div custom={6} initial="hidden" animate="show" variants={fadeUp}>
          <GlassCard className="p-6">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Students by Branch</h2>
            <div className="space-y-3">
              {branchData.map(({ branch, count }) => {
                const pct = Math.round((count / stats.totalStudents) * 100);
                return (
                  <div key={branch}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{branch}</span>
                      <span className="text-slate-300 font-medium">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-linear-to-r from-violet-500 to-cyan-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
