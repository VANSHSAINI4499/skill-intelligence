"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw,
  ExternalLink, Loader2, AlertCircle, GraduationCap, X, Code2, BookOpen,
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

// ── TopLanguage badge ─────────────────────────────────────────────────────────
const LangBadge = ({ lang }: { lang?: string }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium
                   bg-violet-500/15 text-violet-300 border border-violet-500/25 whitespace-nowrap">
    <Code2 size={10} />
    {lang ?? "—"}
  </span>
);

// ── Solved-topics pill strip (truncated, capped at `max`) ─────────────────────
const MAX_VISIBLE_TOPICS = 4;

const TopicPills = ({ topics }: { topics: string[] }) => {
  const visible = topics.slice(0, MAX_VISIBLE_TOPICS);
  const extra   = topics.length - MAX_VISIBLE_TOPICS;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((t) => (
        <span key={t}
          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium
                     bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          {t}
        </span>
      ))}
      {extra > 0 && (
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium
                         bg-white/5 text-slate-500 border border-white/8">
          +{extra} more
        </span>
      )}
    </div>
  );
};

// ── Student detail drawer ─────────────────────────────────────────────────────
const StudentDrawer = ({
  student, onClose,
}: {
  student: FilteredStudentDetail | null;
  onClose: () => void;
}) => (
  <AnimatePresence>
    {student && (
      <>
        {/* Backdrop */}
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
        {/* Drawer panel */}
        <motion.aside
          key="drawer"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-sm
                     bg-[#0d1a30] border-l border-white/8 overflow-y-auto shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-white/6">
            <div>
              <p className="text-lg font-bold text-white">{student.name ?? "—"}</p>
              <p className="text-xs text-slate-500 mt-0.5">{student.email}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/8
                         transition-colors shrink-0 mt-0.5"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Score",    value: student.score.toFixed(1),        color: "text-cyan-400" },
                { label: "CGPA",     value: student.cgpa?.toFixed(2) ?? "—", color: "text-violet-400" },
                { label: "Repos",    value: student.githubRepoCount,          color: "text-emerald-400" },
                { label: "LC Hard",  value: student.leetcodeHardCount,        color: "text-rose-400" },
              ].map(({ label, value, color }) => (
                <div key={label}
                  className="rounded-xl bg-white/3 border border-white/6 p-3 text-center">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Metadata */}
            <div className="rounded-2xl bg-white/3 border border-white/6 divide-y divide-white/5">
              {[
                { label: "Grade",  value: <GradeChip grade={student.grade} /> },
                { label: "Batch",  value: student.batch  ?? "—" },
                { label: "Branch", value: student.branch ?? "—" },
                { label: "Status", value: student.isActive
                    ? <span className="text-emerald-400 text-xs font-medium">Active</span>
                    : <span className="text-slate-500  text-xs font-medium">Inactive</span> },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-slate-500 text-xs">{label}</span>
                  <span className="text-slate-200">{value}</span>
                </div>
              ))}
            </div>

            {/* Top Language */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2
                             flex items-center gap-1.5">
                <Code2 size={12} className="text-violet-400" /> Top Language
              </p>
              <LangBadge lang={student.topLanguage} />
            </div>

            {/* Solved Topics — full list */}
            {(student.solvedTopics ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2
                               flex items-center gap-1.5">
                  <BookOpen size={12} className="text-cyan-400" /> Solved Topics
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(student.solvedTopics ?? []).map((t) => (
                    <span key={t}
                      className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium
                                 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="flex gap-3">
              {student.githubUsername && (
                <a href={`https://github.com/${student.githubUsername}`}
                   target="_blank" rel="noopener noreferrer"
                   className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm
                              bg-white/5 hover:bg-white/10 text-slate-300 border border-white/6
                              transition-colors">
                  <ExternalLink size={13} /> GitHub
                </a>
              )}
              {student.leetcodeUsername && (
                <a href={`https://leetcode.com/${student.leetcodeUsername}`}
                   target="_blank" rel="noopener noreferrer"
                   className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm
                              bg-white/5 hover:bg-white/10 text-slate-300 border border-white/6
                              transition-colors">
                  <ExternalLink size={13} /> LeetCode
                </a>
              )}
            </div>
          </div>
        </motion.aside>
      </>
    )}
  </AnimatePresence>
);

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const {
    students, totalStudents, avgScore, gradeDistribution,
    loading, error, filterOpen, setFilterOpen,
    draftFilters, updateDraft, submitFilters, resetFilters,
  } = useStudentsViewModel();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FilteredStudentDetail | null>(null);

  const displayed = students.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
  });

  const BRANCHES = ["CSE", "ECE", "EEE", "ME", "CE", "IT", "DS", "AI"];
  const BATCHES  = ["2023-2027", "2024-2028", "2025-2029", "2026-2030", "2027-2031"];  // ✅ FIXED: Proper batch formats
  const GRADES   = ["A", "B", "C", "D"];
  const LANGS    = ["python3", "cpp", "java", "javascript", "typescript", "c", "go", "rust"];

  return (
    <>
      <StudentDrawer student={selected} onClose={() => setSelected(null)} />

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
                    {["Name", "Batch", "Branch", "CGPA", "Grade", "Score", "Repos", "Hard", "Top Language", "Topics", ""].map((h) => (
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
                      onClick={() => setSelected(s)}
                      className="border-b border-white/3 hover:bg-white/3 transition-colors group cursor-pointer"
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

                      {/* ── NEW: Top Language ── */}
                      <td className="px-4 py-3">
                        <LangBadge lang={s.topLanguage ?? undefined} />
                      </td>

                      {/* ── NEW: Solved Topics (truncated pills) ── */}
                      <td className="px-4 py-3 min-w-48">
                        {(s.solvedTopics ?? []).length > 0
                          ? <TopicPills topics={s.solvedTopics ?? []} />
                          : <span className="text-slate-600 text-xs">—</span>
                        }
                      </td>

                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
    </>
  );
}
