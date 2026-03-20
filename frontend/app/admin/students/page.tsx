"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw,
  ExternalLink, Loader2, AlertCircle, GraduationCap,
} from "lucide-react";
import { useStudentsViewModel } from "@/viewmodels/adminViewModel";
import { FilteredStudentDetail } from "@/models/types";

// ── Helpers ───────────────────────────────────────────────────────────────────
const GRADE_STYLE: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  B: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  C: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  D: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const GradeChip = ({ grade }: { grade?: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold
                    border ${GRADE_STYLE[grade ?? ""] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30"}`}>
    {grade ?? "–"}
  </span>
);

const ScoreBar = ({ score }: { score: number }) => (
  <div className="flex items-center gap-2 min-w-20">
    <div className="flex-1 h-1.5 rounded-full bg-white/5">
      <div
        className="h-full rounded-full bg-linear-to-r from-cyan-500 to-violet-500"
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
    <span className="text-xs text-slate-300 font-mono w-8 text-right">{score.toFixed(0)}</span>
  </div>
);

const Slider = ({
  label, min, max, step = 1, value, onChange,
}: {
  label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void;
}) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-xs text-slate-400">
      <span>{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-500
                 bg-white/10"
    />
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const {
    students, totalStudents, avgScore, gradeDistribution,
    loading, error, filterOpen, setFilterOpen,
    draftFilters, updateDraft, submitFilters, resetFilters,
  } = useStudentsViewModel();

  const [search, setSearch] = useState("");

  const displayed = students.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
  });

  const BRANCHES = ["CSE", "ECE", "EEE", "ME", "CE", "IT", "DS", "AI"];
  const BATCHES  = ["2023-2027", "2024-2028", "2025-2029", "2026-2030", "2027-2031"];  // ✅ FIXED: Proper batch formats
  const GRADES   = ["A", "B", "C", "D"];
  const LANGS    = ["python3", "cpp", "java", "javascript", "typescript", "c", "go", "rust"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Students</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalStudents} students &bull; avg score {avgScore.toFixed(1)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {Object.entries(gradeDistribution).map(([g, n]) => (
            <span key={g}
              className={`px-2 py-1 rounded-lg border font-bold ${GRADE_STYLE[g] ?? ""}`}>
              {g}: {n}
            </span>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Filter panel */}
      <div className="rounded-2xl bg-white/3 border border-white/6 overflow-hidden">
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center justify-between w-full px-5 py-4 text-sm font-medium
                     text-slate-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-cyan-400" />
            Advanced Filters
          </div>
          {filterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <AnimatePresence initial={false}>
          {filterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-white/5"
            >
              <div className="p-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-5">
                {/* Batch */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Batch</label>
                  <select
                    value={draftFilters.batch ?? ""}
                    onChange={(e) => updateDraft({ batch: e.target.value || undefined })}
                    className="w-full rounded-xl bg-white/5 border border-white/8 text-sm text-slate-200
                               px-3 py-2 focus:outline-none focus:border-cyan-500/50 appearance-none"
                  >
                    <option value="">All batches</option>
                    {BATCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                {/* Branch */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Branch</label>
                  <select
                    value={draftFilters.branch ?? ""}
                    onChange={(e) => updateDraft({ branch: e.target.value || undefined })}
                    className="w-full rounded-xl bg-white/5 border border-white/8 text-sm text-slate-200
                               px-3 py-2 focus:outline-none focus:border-cyan-500/50 appearance-none"
                  >
                    <option value="">All branches</option>
                    {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                {/* Grade */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Grade</label>
                  <select
                    value={draftFilters.grade ?? ""}
                    onChange={(e) => updateDraft({ grade: e.target.value || undefined })}
                    className="w-full rounded-xl bg-white/5 border border-white/8 text-sm text-slate-200
                               px-3 py-2 focus:outline-none focus:border-cyan-500/50 appearance-none"
                  >
                    <option value="">All grades</option>
                    {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>

                {/* Language */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Language</label>
                  <select
                    value={draftFilters.language ?? ""}
                    onChange={(e) => updateDraft({ language: e.target.value || undefined })}
                    className="w-full rounded-xl bg-white/5 border border-white/8 text-sm text-slate-200
                               px-3 py-2 focus:outline-none focus:border-cyan-500/50 appearance-none"
                  >
                    <option value="">Any language</option>
                    {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {/* Topic */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Topic Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. dynamic-programming"
                    value={draftFilters.topicTag ?? ""}
                    onChange={(e) => updateDraft({ topicTag: e.target.value || undefined })}
                    className="w-full rounded-xl bg-white/5 border border-white/8 text-sm text-slate-200
                               px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Score range */}
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <Slider label="Min Score" min={0} max={100} value={draftFilters.minScore ?? 0}
                    onChange={(v) => updateDraft({ minScore: v })} />
                  <Slider label="Max Score" min={0} max={100} value={draftFilters.maxScore ?? 100}
                    onChange={(v) => updateDraft({ maxScore: v })} />
                </div>

                {/* CGPA */}
                <Slider label="Min CGPA" min={0} max={10} step={0.5}
                  value={draftFilters.minCgpa ?? 0}
                  onChange={(v) => updateDraft({ minCgpa: v })} />

                {/* Hard */}
                <Slider label="Min LeetCode Hard" min={0} max={100}
                  value={draftFilters.minHard ?? 0}
                  onChange={(v) => updateDraft({ minHard: v })} />

                {/* Repos */}
                <Slider label="Min GitHub Repos" min={0} max={100}
                  value={draftFilters.minRepos ?? 0}
                  onChange={(v) => updateDraft({ minRepos: v })} />

                {/* Active only */}
                <div className="flex items-center gap-3 pt-4">
                  <input
                    type="checkbox"
                    id="activeOnly"
                    checked={draftFilters.activeOnly ?? true}
                    onChange={(e) => updateDraft({ activeOnly: e.target.checked })}
                    className="w-4 h-4 rounded accent-cyan-500"
                  />
                  <label htmlFor="activeOnly" className="text-xs text-slate-400 cursor-pointer">
                    Active students only
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 px-5 pb-4 pt-2 border-t border-white/5">
                <button onClick={submitFilters}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                             bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm
                             transition-colors shadow-lg shadow-cyan-500/20">
                  <Search size={14} /> Apply Filters
                </button>
                <button onClick={resetFilters}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                             bg-white/5 hover:bg-white/10 text-slate-300 text-sm transition-colors">
                  <RotateCcw size={14} /> Reset
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text" placeholder="Search by name or email…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/3 border border-white/6
                     text-sm text-slate-200 placeholder-slate-600 focus:outline-none
                     focus:border-cyan-500/40 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white/3 border border-white/6 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-cyan-400" size={24} />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <GraduationCap size={36} className="text-slate-700" />
            <p className="text-sm text-slate-500">No students match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {["Name", "Batch", "Branch", "CGPA", "Grade", "Score", "Repos", "Hard", ""].map((h) => (
                    <th key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500
                                 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((s: FilteredStudentDetail, i: number) => (
                  <motion.tr
                    key={s.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/3 hover:bg-white/3 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-200 group-hover:text-white transition-colors">
                          {s.name ?? "—"}
                        </p>
                        <p className="text-[11px] text-slate-600">{s.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{s.batch ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-400">{s.branch ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {s.cgpa?.toFixed(1) ?? "—"}
                    </td>
                    <td className="px-4 py-3"><GradeChip grade={s.grade} /></td>
                    <td className="px-4 py-3 min-w-28"><ScoreBar score={s.score} /></td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{s.githubRepoCount}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{s.leetcodeHardCount}</td>
                    <td className="px-4 py-3">
                      {s.githubUsername && (
                        <a
                          href={`https://github.com/${s.githubUsername}`}
                          target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-400
                                     hover:bg-cyan-500/10 transition-all inline-flex"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
