"use client";

import { motion } from "framer-motion";
import {
  Download, Loader2, AlertCircle, BarChart3, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { useReportsViewModel } from "@/viewmodels/adminViewModel";

const GRADE_COLORS: Record<string, string> = {
  A: "#10b981", B: "#06b6d4", C: "#f59e0b", D: "#f43f5e",
};

const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#0d1a30] border border-white/10 px-3 py-2 text-xs shadow-xl">
      {label && <p className="text-slate-400 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill || p.color || "#06b6d4" }} className="font-semibold">
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl bg-white/3 border border-white/6 backdrop-blur-sm p-6 ${className}`}>
    {children}
  </div>
);

export default function ReportsPage() {
  const { data, loading, error, exportCSV } = useReportsViewModel();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-cyan-400" size={28} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <AlertCircle className="text-rose-400" size={36} />
        <p className="text-slate-400 text-sm">{error ?? "No data"}</p>
      </div>
    );
  }

  const students = data.filteredStudents;

  // ── Score distribution (buckets of 10) ───────────────────────────────────
  const scoreBuckets: Record<string, number> = {};
  for (let i = 0; i <= 90; i += 10) {
    scoreBuckets[`${i}-${i + 9}`] = 0;
  }
  students.forEach((s) => {
    const bucket = Math.floor(s.score / 10) * 10;
    const key = `${bucket}-${bucket + 9}`;
    if (key in scoreBuckets) scoreBuckets[key]++;
    else scoreBuckets["90-99"] = (scoreBuckets["90-99"] ?? 0) + 1;
  });
  const scoreChartData = Object.entries(scoreBuckets).map(([range, count]) => ({
    range, count,
  }));

  // ── CGPA distribution ─────────────────────────────────────────────────────
  const cgpaBuckets: Record<string, number> = {
    "0-5": 0, "5-6": 0, "6-7": 0, "7-8": 0, "8-9": 0, "9-10": 0,
  };
  students.forEach((s) => {
    const c = s.cgpa ?? 0;
    if (c < 5) cgpaBuckets["0-5"]++;
    else if (c < 6) cgpaBuckets["5-6"]++;
    else if (c < 7) cgpaBuckets["6-7"]++;
    else if (c < 8) cgpaBuckets["7-8"]++;
    else if (c < 9) cgpaBuckets["8-9"]++;
    else cgpaBuckets["9-10"]++;
  });
  const cgpaChartData = Object.entries(cgpaBuckets).map(([range, count]) => ({ range, count }));

  // ── Grade pie ─────────────────────────────────────────────────────────────
  const gradeData = Object.entries(data.gradeDistribution).map(([grade, count]) => ({
    grade, count, fill: GRADE_COLORS[grade] ?? "#64748b",
  }));

  // ── Hard problems distribution ────────────────────────────────────────────
  const hardBuckets: Record<string, number> = {
    "0": 0, "1-5": 0, "6-15": 0, "16-30": 0, "31+": 0,
  };
  students.forEach((s) => {
    const h = s.leetcodeHardCount;
    if (h === 0) hardBuckets["0"]++;
    else if (h <= 5) hardBuckets["1-5"]++;
    else if (h <= 15) hardBuckets["6-15"]++;
    else if (h <= 30) hardBuckets["16-30"]++;
    else hardBuckets["31+"]++;
  });
  const hardChartData = Object.entries(hardBuckets).map(([range, count]) => ({ range, count }));

  // ── Top languages (aggregate across all students) ─────────────────────────
  const langAgg: Record<string, number> = {};
  students.forEach((s) => {
    Object.entries(s.langDistribution).forEach(([lang, cnt]) => {
      langAgg[lang] = (langAgg[lang] ?? 0) + cnt;
    });
  });
  const topLangs = Object.entries(langAgg)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([lang, total]) => ({ lang, total }));

  // ── Summary KPIs ──────────────────────────────────────────────────────────
  const scores = students.map((s) => s.score);
  const maxScore = scores.length ? Math.max(...scores).toFixed(1) : "–";
  const minScore = scores.length ? Math.min(...scores).toFixed(1) : "–";
  const cgpas   = students.map((s) => s.cgpa ?? 0).filter(Boolean);
  const avgCgpa = cgpas.length ? (cgpas.reduce((a, b) => a + b) / cgpas.length).toFixed(2) : "–";

  const KPIS = [
    { label: "Total Students",  value: data.totalStudents,        color: "text-cyan-400"    },
    { label: "Average Score",   value: data.avgScore.toFixed(1),  color: "text-violet-400"  },
    { label: "Highest Score",   value: maxScore,                  color: "text-emerald-400" },
    { label: "Average CGPA",    value: avgCgpa,                   color: "text-amber-400"   },
    { label: "Grade A Count",   value: data.gradeDistribution["A"] ?? 0, color: "text-emerald-400" },
    { label: "Grade D Count",   value: data.gradeDistribution["D"] ?? 0, color: "text-rose-400"    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Platform analytics across {data.totalStudents} students</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                     bg-emerald-500/10 border border-emerald-500/20 text-emerald-400
                     hover:bg-emerald-500/20 transition-colors shadow-sm">
          <Download size={14} /> Export All CSV
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {KPIS.map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <GlassCard className="text-center py-4">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-[11px] text-slate-500 mt-1">{label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score distribution */}
        <GlassCard>
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-cyan-400" /> Score Distribution
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreChartData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="range" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="count" fill="#06b6d4" radius={[4,4,0,0]} name="Students" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Grade pie */}
        <GlassCard>
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Grade Breakdown</h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={180}>
              <PieChart>
                <Pie data={gradeData} dataKey="count" nameKey="grade"
                  cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4}>
                  {gradeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5 flex-1">
              {gradeData.map(({ grade, count, fill }) => (
                <div key={grade} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fill }} />
                    <span className="text-xs text-slate-400">Grade {grade}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">{count}</span>
                    <span className="text-[10px] text-slate-600 ml-1">
                      ({data.totalStudents ? Math.round((count / data.totalStudents) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* CGPA distribution */}
        <GlassCard>
          <h2 className="text-sm font-semibold text-slate-300 mb-4">CGPA Distribution</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={cgpaChartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="range" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="count" fill="#7c3aed" radius={[4,4,0,0]} name="Students" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Hard problems */}
        <GlassCard>
          <h2 className="text-sm font-semibold text-slate-300 mb-4">LeetCode Hard Problems Solved</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hardChartData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="range" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="count" fill="#f43f5e" radius={[4,4,0,0]} name="Students" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Language aggregation */}
      {topLangs.length > 0 && (
        <GlassCard>
          <h2 className="text-sm font-semibold text-slate-300 mb-5">Top Languages Across Platform</h2>
          <div className="space-y-3">
            {topLangs.map(({ lang, total }, i) => {
              const max = topLangs[0]?.total ?? 1;
              const pct = Math.round((total / max) * 100);
              const COLORS = ["#06b6d4","#7c3aed","#10b981","#f59e0b","#f43f5e","#6366f1","#ec4899","#84cc16"];
              return (
                <div key={lang}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400 font-medium">{lang}</span>
                    <span className="text-slate-500">{total.toLocaleString()} submissions</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
