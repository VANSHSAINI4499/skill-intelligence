"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Download, Loader2, AlertCircle, Trophy,
  ChevronRight, Users, ExternalLink, ListOrdered,
} from "lucide-react";
import { useShortlistViewModel } from "@/viewmodels/adminViewModel";
import { RankedStudent, ShortlistResult } from "@/models/types";

const GRADE_STYLE: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  B: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  C: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  D: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const RANK_STYLE: Record<number, string> = {
  1: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  2: "bg-slate-400/20 text-slate-300 border-slate-400/30",
  3: "bg-orange-700/20 text-orange-400 border-orange-700/30",
};

function ShortlistTable({ sl, onExport }: { sl: ShortlistResult; onExport: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white/3 border border-white/6 overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div>
          <p className="font-semibold text-white text-sm">{sl.companyName || sl.companyId}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Batch {sl.batch} &bull; {sl.totalCandidates} candidates &bull; top {sl.rankedStudents.length}
          </p>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium
                     bg-cyan-500/10 border border-cyan-500/20 text-cyan-400
                     hover:bg-cyan-500/20 transition-colors"
        >
          <Download size={13} /> CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {["#", "Name", "Score", "Grade", "CGPA", "Hard", "Repos", "Branch", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold
                                       text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sl.rankedStudents.map((s: RankedStudent) => (
              <tr key={s.uid}
                className="border-b border-white/3 hover:bg-white/3 transition-colors group">
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg
                                    text-xs font-bold border
                                    ${RANK_STYLE[s.rank] ?? "bg-white/5 text-slate-400 border-white/10"}`}>
                    {s.rank <= 3 ? <Trophy size={12} /> : s.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-200 group-hover:text-white transition-colors">
                    {s.name ?? "—"}
                  </p>
                  <p className="text-[11px] text-slate-600">{s.email}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-linear-to-r from-cyan-500 to-violet-500"
                        style={{ width: `${Math.min(s.score, 100)}%` }} />
                    </div>
                    <span className="text-xs text-slate-300 font-mono">{s.score.toFixed(1)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border
                                    ${GRADE_STYLE[s.grade ?? ""] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30"}`}>
                    {s.grade ?? "–"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-slate-400">{s.cgpa?.toFixed(1) ?? "–"}</td>
                <td className="px-4 py-3 font-mono text-slate-400">{s.leetcodeHard}</td>
                <td className="px-4 py-3 font-mono text-slate-400">{s.githubRepos}</td>
                <td className="px-4 py-3 text-slate-500">{s.branch ?? "–"}</td>
                <td className="px-4 py-3">
                  {s.githubUsername && (
                    <a href={`https://github.com/${s.githubUsername}`} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10
                                 transition-all inline-flex opacity-0 group-hover:opacity-100">
                      <ExternalLink size={12} />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export default function ShortlistsPage() {
  const {
    companies, shortlists, activeShortlist, setActiveShortlist,
    selectedCompanyId, setSelectedCompanyId,
    batch, setBatch, topN, setTopN,
    generating, loadingHistory, error,
    generateShortlist, exportCSV,
  } = useShortlistViewModel();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Shortlists</h1>
        <p className="text-sm text-slate-500 mt-0.5">Generate ranked placement shortlists using live algorithm weights</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Generator form ─────────────────────────────────── */}
        <div className="rounded-2xl bg-white/3 border border-white/6 p-6 space-y-5 h-fit">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/20
                            flex items-center justify-center">
              <Zap size={16} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Generate Shortlist</p>
              <p className="text-xs text-slate-500">Ranked by algorithm score</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Company</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/8 text-sm text-slate-200
                         px-3 py-2.5 focus:outline-none focus:border-cyan-500/50 appearance-none"
            >
              <option value="">Select a company…</option>
              {companies.map((c) => (
                <option key={c.companyId} value={c.companyId}>{c.companyName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Batch Year</label>
            <input
              type="text" placeholder="e.g. 2026"
              value={batch} onChange={(e) => setBatch(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/8 text-sm text-slate-200
                         px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Top N students</span>
              <span className="text-white font-medium">{topN}</span>
            </div>
            <input
              type="range" min={5} max={100} step={5} value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-700">
              <span>5</span><span>100</span>
            </div>
          </div>

          <button
            onClick={generateShortlist}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                       bg-linear-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400
                       text-white font-semibold text-sm transition-all
                       shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {generating ? "Generating…" : "Generate Shortlist"}
          </button>
        </div>

        {/* ── History sidebar ─────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
            <ListOrdered size={16} /> History
          </h2>
          {loadingHistory ? (
            <div className="flex justify-center h-24 items-center">
              <Loader2 className="animate-spin text-slate-500" size={20} />
            </div>
          ) : shortlists.length === 0 ? (
            <div className="rounded-xl bg-white/3 border border-white/6 p-6 text-center">
              <p className="text-xs text-slate-600">No shortlists yet</p>
            </div>
          ) : (
            shortlists.map((sl) => (
              <button
                key={sl.shortlistId}
                onClick={() => setActiveShortlist(sl)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl
                             border text-left transition-all
                             ${activeShortlist?.shortlistId === sl.shortlistId
                               ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                               : "bg-white/3 border-white/6 text-slate-400 hover:bg-white/5"}`}
              >
                <div>
                  <p className="text-xs font-medium">{sl.companyName || sl.companyId}</p>
                  <p className="text-[10px] text-slate-600">Batch {sl.batch} · {sl.rankedStudents.length} ranked</p>
                </div>
                <ChevronRight size={14} />
              </button>
            ))
          )}
        </div>

        {/* ── Selected shortlist placeholder ─────────────────── */}
        <div className="flex items-start justify-center pt-2">
          {!activeShortlist && !generating && (
            <div className="text-center mt-16">
              <Users size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-600">Generate or select a shortlist to view results</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Full-width table ──────────────────────────────────── */}
      <AnimatePresence>
        {activeShortlist && (
          <ShortlistTable
            sl={activeShortlist}
            onExport={() => exportCSV(activeShortlist)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
