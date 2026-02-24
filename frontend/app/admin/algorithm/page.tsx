"use client";

import { motion } from "framer-motion";
import { Save, RotateCcw, CheckCircle2, AlertCircle, Info, Loader2 } from "lucide-react";
import { useAlgorithmViewModel } from "@/viewmodels/adminViewModel";
import { AlgorithmWeights } from "@/models/types";

// ── Weight metadata ───────────────────────────────────────────────────────────
const WEIGHT_META: {
  key: keyof AlgorithmWeights;
  label: string;
  description: string;
  max: number;
  accent: string;
  bar: string;
}[] = [
  { key: "leetcode_easy",   label: "LeetCode Easy",   description: "Points per Easy problem solved",   max: 20, accent: "text-emerald-400", bar: "from-emerald-500 to-emerald-400" },
  { key: "leetcode_medium", label: "LeetCode Medium", description: "Points per Medium problem solved", max: 30, accent: "text-amber-400",   bar: "from-amber-500 to-amber-400"   },
  { key: "leetcode_hard",   label: "LeetCode Hard",   description: "Points per Hard problem solved",   max: 50, accent: "text-rose-400",    bar: "from-rose-500 to-rose-400"     },
  { key: "github_repos",    label: "GitHub Repos",    description: "Weight for total repo count",      max: 20, accent: "text-cyan-400",    bar: "from-cyan-500 to-cyan-400"     },
  { key: "github_stars",    label: "GitHub Stars",    description: "Weight for total star count",      max: 20, accent: "text-sky-400",     bar: "from-sky-500 to-sky-400"       },
  { key: "cgpa",            label: "CGPA",            description: "Weight for academic performance",  max: 30, accent: "text-violet-400",  bar: "from-violet-500 to-violet-400" },
];

// ── Preview score calculator ──────────────────────────────────────────────────
function previewScore(w: AlgorithmWeights): number {
  // Sample student: easy=30, medium=20, hard=8, repos=12, stars=50, cgpa=8.5
  const easy = 30, medium = 20, hard = 8, repos = 12, stars = 50, cgpa = 8.5;
  const raw =
    easy   * w.leetcode_easy +
    medium * w.leetcode_medium +
    hard   * w.leetcode_hard +
    repos  * w.github_repos +
    stars  * w.github_stars +
    cgpa   * w.cgpa;
  const maxRaw = 200 * w.leetcode_easy + 150 * w.leetcode_medium + 100 * w.leetcode_hard +
                 50 * w.github_repos + 500 * w.github_stars + 10 * w.cgpa;
  return maxRaw > 0 ? Math.min(100, (raw / maxRaw) * 100) : 0;
}

export default function AlgorithmPage() {
  const {
    weights, updateWeight, total,
    loading, saving, saved, error,
    updatedAt, isDirty,
    saveWeights, resetWeights,
  } = useAlgorithmViewModel();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-cyan-400" size={28} />
      </div>
    );
  }

  const preview = previewScore(weights);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Algorithm Config</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Tune scoring weights — changes affect all future analyses
          {updatedAt && <span className="ml-2 text-slate-600">· Last saved {updatedAt}</span>}
        </p>
      </div>

      {/* Saved / Error banners */}
      {saved && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 size={16} /> Configuration saved successfully
        </motion.div>
      )}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Weight sliders */}
      <div className="rounded-2xl bg-white/3 border border-white/6 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Scoring Weights</h2>
          <span className="text-xs text-slate-500">
            Total weight: <span className="text-white font-bold">{total.toFixed(1)}</span>
          </span>
        </div>

        <div className="p-6 space-y-6">
          {WEIGHT_META.map(({ key, label, description, max, accent, bar }) => {
            const val = weights[key];
            const pct = (val / max) * 100;
            return (
              <div key={key} className="group">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className={`text-sm font-semibold ${accent}`}>{label}</p>
                    <p className="text-xs text-slate-600">{description}</p>
                  </div>
                  <input
                    type="number"
                    min={0} max={max} step={0.5}
                    value={val}
                    onChange={(e) => updateWeight(key, Number(e.target.value))}
                    className="w-16 rounded-lg bg-white/5 border border-white/8 text-center
                               text-sm font-bold text-white px-2 py-1.5
                               focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Track */}
                <div className="relative h-2 rounded-full bg-white/5">
                  <motion.div
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`absolute h-full rounded-full bg-linear-to-r ${bar}`}
                  />
                  <input
                    type="range" min={0} max={max} step={0.5} value={val}
                    onChange={(e) => updateWeight(key, Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-700 mt-1">
                  <span>0</span>
                  <span>{max}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-2xl bg-white/3 border border-white/6 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-300">Live Preview</h2>
          <span className="text-xs text-slate-600">— sample student: 30 easy, 20 medium, 8 hard, 12 repos, 50 stars, 8.5 CGPA</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              animate={{ width: `${preview}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="h-full rounded-full bg-linear-to-r from-cyan-500 via-violet-500 to-rose-500"
            />
          </div>
          <span className="text-2xl font-bold text-white tabular-nums w-16">
            {preview.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={saveWeights}
          disabled={saving || !isDirty}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm
                     bg-cyan-500 hover:bg-cyan-400 text-black transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed
                     shadow-lg shadow-cyan-500/20"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button
          onClick={resetWeights}
          disabled={!isDirty}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm
                     bg-white/5 hover:bg-white/10 text-slate-300 transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw size={14} /> Revert
        </button>
      </div>
    </div>
  );
}
