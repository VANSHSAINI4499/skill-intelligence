"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Trash2, CheckCircle2, AlertCircle, Loader2,
  Building2, Tag, Code2,
} from "lucide-react";
import { useRequirementsViewModel } from "@/viewmodels/adminViewModel";
import { CompanyRequirement } from "@/models/types";

const Chip = ({ label, onRemove }: { label: string; onRemove?: () => void }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                   bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium">
    {label}
    {onRemove && (
      <button onClick={onRemove} className="hover:text-rose-400 transition-colors">
        <X size={10} />
      </button>
    )}
  </span>
);

const RequirementCard = ({
  req, onDelete,
}: { req: CompanyRequirement; onDelete: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.96 }}
    className="rounded-2xl bg-white/3 border border-white/6 p-5 hover:border-white/10
               hover:shadow-lg hover:shadow-black/20 transition-all group"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20
                        flex items-center justify-center">
          <Building2 size={16} className="text-violet-400" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">{req.companyName}</p>
          {req.createdAt && (
            <p className="text-[10px] text-slate-600">{req.createdAt}</p>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-600
                   hover:text-rose-400 hover:bg-rose-500/10 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>

    <div className="grid grid-cols-3 gap-3 mb-3">
      {[
        { label: "Min CGPA", value: req.minCGPA?.toFixed(1) ?? "–" },
        { label: "Min Hard", value: req.minLeetCodeHard ?? "–" },
        { label: "Min Repos", value: req.minRepos ?? "–" },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-xl bg-white/3 p-2.5 text-center">
          <p className="text-xs text-slate-600 mb-0.5">{label}</p>
          <p className="text-sm font-bold text-white">{value}</p>
        </div>
      ))}
    </div>

    {req.requiredTopics.length > 0 && (
      <div className="flex flex-wrap gap-1.5 mb-2">
        <Tag size={12} className="text-slate-600 shrink-0 mt-0.5" />
        {req.requiredTopics.map((t) => (
          <span key={t} className="text-[11px] px-2 py-0.5 rounded-md
                                   bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {t}
          </span>
        ))}
      </div>
    )}

    {req.preferredLanguages.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        <Code2 size={12} className="text-slate-600 shrink-0 mt-0.5" />
        {req.preferredLanguages.map((l) => (
          <span key={l} className="text-[11px] px-2 py-0.5 rounded-md
                                   bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {l}
          </span>
        ))}
      </div>
    )}
  </motion.div>
);

export default function RequirementsPage() {
  const {
    requirements, loading, error, successMsg,
    form, updateForm, topicInput, setTopicInput,
    langInput, setLangInput,
    addTopic, removeTopic, addLang, removeLang,
    submitting, submitRequirement, deleteRequirement,
  } = useRequirementsViewModel();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Company Requirements</h1>
        <p className="text-sm text-slate-500 mt-0.5">Define eligibility criteria for company placements</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Form ──────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white/3 border border-white/6 p-6 space-y-5 sticky top-20">
            <h2 className="text-sm font-semibold text-slate-300">Add Requirement</h2>

            {successMsg && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs py-2 px-3
                              rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 size={14} /> {successMsg}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-rose-400 text-xs py-2 px-3
                              rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Company Name <span className="text-rose-400">*</span></label>
              <input
                type="text" placeholder="e.g. Google"
                value={form.companyName}
                onChange={(e) => updateForm({ companyName: e.target.value })}
                className="w-full rounded-xl bg-white/5 border border-white/8 text-sm text-slate-200
                           px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Min CGPA", key: "minCGPA", step: 0.5, min: 0, max: 10 },
                { label: "Min Hard", key: "minLeetCodeHard", step: 1,   min: 0, max: 200 },
                { label: "Min Repos", key: "minRepos", step: 1, min: 0, max: 200 },
              ].map(({ label, key, step, min, max }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">{label}</label>
                  <input
                    type="number" step={step} min={min} max={max}
                    value={(form as any)[key] ?? ""}
                    onChange={(e) => updateForm({ [key]: Number(e.target.value) } as any)}
                    className="w-full rounded-xl bg-white/5 border border-white/8 text-sm text-slate-200
                               px-2 py-2 focus:outline-none focus:border-cyan-500/50 text-center"
                  />
                </div>
              ))}
            </div>

            {/* Topics */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Required Topics</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. dynamic-programming"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTopic())}
                  className="flex-1 rounded-xl bg-white/5 border border-white/8 text-sm text-slate-200
                             px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                />
                <button onClick={addTopic}
                  className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400
                             hover:bg-cyan-500/20 transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-8">
                {form.requiredTopics?.map((t) => (
                  <Chip key={t} label={t} onRemove={() => removeTopic(t)} />
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Preferred Languages</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. python3"
                  value={langInput}
                  onChange={(e) => setLangInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLang())}
                  className="flex-1 rounded-xl bg-white/5 border border-white/8 text-sm text-slate-200
                             px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                />
                <button onClick={addLang}
                  className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400
                             hover:bg-emerald-500/20 transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-8">
                {form.preferredLanguages?.map((l) => (
                  <span key={l}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                               bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    {l}
                    <button onClick={() => removeLang(l)} className="hover:text-rose-400 transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={submitRequirement}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                         bg-violet-500 hover:bg-violet-400 text-white font-semibold text-sm
                         transition-all shadow-lg shadow-violet-500/20
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {submitting ? "Saving…" : "Save Requirement"}
            </button>
          </div>
        </div>

        {/* ── List ──────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              Saved Requirements
              <span className="ml-2 text-slate-600 font-normal">({requirements.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center h-32 items-center">
              <Loader2 className="animate-spin text-violet-400" size={24} />
            </div>
          ) : requirements.length === 0 ? (
            <div className="rounded-2xl bg-white/3 border border-white/6 p-12 text-center">
              <Building2 size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No requirements yet</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {requirements.map((req) => (
                <RequirementCard
                  key={req.companyId}
                  req={req}
                  onDelete={() => deleteRequirement(req.companyId)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
