"use client";
/**
 * Admin ViewModels (MVVM)
 * One hook per page section — zero Firestore calls, all through adminApiService.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { firebaseService } from "@/services/firebaseService";
import { adminApiService } from "@/services/adminApiService";
import {
  AdminFilterParams,
  AlgorithmWeights,
  CompanyRequirement,
  CreateCompanyRequirementPayload,
  FilteredStudentDetail,
  FilterStudentsResponse,
  GenerateShortlistPayload,
  RankedStudent,
  ShortlistResult,
} from "@/models/types";

// ─── Shared admin auth guard ──────────────────────────────────────────────────

export function useAdminAuth() {
  const [adminUid, setAdminUid] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string>("Administrator");
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      const profile = await firebaseService.getUserProfile(user.uid);
      if (profile?.role !== "admin") { router.push("/dashboard"); return; }
      setAdminUid(user.uid);
      setAdminName(profile.name || "Administrator");
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  const logout = useCallback(async () => {
    await firebaseService.logout();
    router.push("/login");
  }, [router]);

  return { adminUid, adminName, authReady, logout };
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export interface OverviewStats {
  totalStudents: number;
  avgScore: number;
  gradeDistribution: Record<string, number>;
  batchDistribution: Record<string, number>;
  branchDistribution: Record<string, number>;
  activeStudents: number;
}

export function useOverviewViewModel() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: FilterStudentsResponse = await adminApiService.filterStudents({
        activeOnly: false,
      });
      const students = res.filteredStudents;
      const batchDist: Record<string, number> = {};
      const branchDist: Record<string, number> = {};
      let active = 0;
      for (const s of students) {
        if (s.batch) batchDist[s.batch] = (batchDist[s.batch] || 0) + 1;
        if (s.branch) branchDist[s.branch] = (branchDist[s.branch] || 0) + 1;
        if (s.isActive) active++;
      }
      setStats({
        totalStudents: res.totalStudents,
        avgScore: res.avgScore,
        gradeDistribution: res.gradeDistribution,
        batchDistribution: batchDist,
        branchDistribution: branchDist,
        activeStudents: active,
      });
    } catch (e: any) {
      setError(e.message || "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { stats, loading, error, refresh: load };
}

// ─── Students ─────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: AdminFilterParams = {
  activeOnly: true,
  minScore: 0,
  maxScore: 100,
  minCgpa: 0,
  minHard: 0,
  minRepos: 0,
};

export function useStudentsViewModel() {
  const [draftFilters, setDraftFilters] = useState<AdminFilterParams>(DEFAULT_FILTERS);
  const [students, setStudents] = useState<FilteredStudentDetail[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [gradeDistribution, setGradeDistribution] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(true);

  const applyFilters = useCallback(async (f: AdminFilterParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiService.filterStudents(f);
      setStudents(res.filteredStudents);
      setTotalStudents(res.totalStudents);
      setAvgScore(res.avgScore);
      setGradeDistribution(res.gradeDistribution);
    } catch (e: any) {
      setError(e.message || "Failed to filter students");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { applyFilters(DEFAULT_FILTERS); }, [applyFilters]);

  const updateDraft = (patch: Partial<AdminFilterParams>) =>
    setDraftFilters((prev) => ({ ...prev, ...patch }));

  const submitFilters = () => applyFilters(draftFilters);
  const resetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    applyFilters(DEFAULT_FILTERS);
  };

  return {
    students, totalStudents, avgScore, gradeDistribution,
    loading, error, filterOpen, setFilterOpen,
    draftFilters, updateDraft, submitFilters, resetFilters,
  };
}

// ─── Algorithm Config ─────────────────────────────────────────────────────────

const DEFAULT_WEIGHTS: AlgorithmWeights = {
  leetcode_easy: 5,
  leetcode_medium: 8,
  leetcode_hard: 12,
  github_repos: 5,
  github_stars: 5,
  cgpa: 10,
};

export function useAlgorithmViewModel() {
  const [weights, setWeights] = useState<AlgorithmWeights>(DEFAULT_WEIGHTS);
  const [savedWeights, setSavedWeights] = useState<AlgorithmWeights>(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await adminApiService.getAlgorithmConfig();
        setWeights(cfg.weights);
        setSavedWeights(cfg.weights);
        setUpdatedAt(cfg.updatedAt || null);
      } catch { /* use defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const updateWeight = (key: keyof AlgorithmWeights, val: number) =>
    setWeights((prev) => ({ ...prev, [key]: val }));

  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  const saveWeights = async () => {
    setSaving(true); setError(null);
    try {
      const cfg = await adminApiService.updateAlgorithmConfig(weights);
      setSavedWeights(cfg.weights);
      setUpdatedAt(cfg.updatedAt || null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally { setSaving(false); }
  };

  const resetWeights = () => setWeights(savedWeights);
  const isDirty = JSON.stringify(weights) !== JSON.stringify(savedWeights);

  return {
    weights, updateWeight, total,
    loading, saving, saved, error,
    updatedAt, isDirty, saveWeights, resetWeights,
  };
}

// ─── Company Requirements ─────────────────────────────────────────────────────

const EMPTY_FORM: CreateCompanyRequirementPayload = {
  companyName: "",
  minCgpa: 6.0,
  minHard: 5,
  minRepos: 3,
  requiredTopics: [],
  preferredLanguages: [],
};

export function useRequirementsViewModel() {
  const [requirements, setRequirements] = useState<CompanyRequirement[]>([]);
  const [form, setForm] = useState<CreateCompanyRequirementPayload>(EMPTY_FORM);
  const [topicInput, setTopicInput] = useState("");
  const [langInput, setLangInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadRequirements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApiService.getCompanyRequirements();
      setRequirements(data);
    } catch (e: any) {
      setError(e.message || "Failed to load requirements");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRequirements(); }, [loadRequirements]);

  const updateForm = (patch: Partial<CreateCompanyRequirementPayload>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !form.requiredTopics?.includes(t))
      updateForm({ requiredTopics: [...(form.requiredTopics || []), t] });
    setTopicInput("");
  };
  const removeTopic = (t: string) =>
    updateForm({ requiredTopics: form.requiredTopics?.filter((x) => x !== t) });

  const addLang = () => {
    const l = langInput.trim();
    if (l && !form.preferredLanguages?.includes(l))
      updateForm({ preferredLanguages: [...(form.preferredLanguages || []), l] });
    setLangInput("");
  };
  const removeLang = (l: string) =>
    updateForm({ preferredLanguages: form.preferredLanguages?.filter((x) => x !== l) });

  const submitRequirement = async () => {
    if (!form.companyName.trim()) { setError("Company name is required"); return; }
    setSubmitting(true); setError(null);
    try {
      await adminApiService.createCompanyRequirement(form);
      setForm(EMPTY_FORM); setTopicInput(""); setLangInput("");
      setSuccessMsg("Saved successfully");
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadRequirements();
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally { setSubmitting(false); }
  };

  const deleteRequirement = async (id: string) => {
    try {
      await adminApiService.deleteCompanyRequirement(id);
      setRequirements((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) { setError(e.message || "Failed to delete"); }
  };

  return {
    requirements, loading, error, successMsg,
    form, updateForm, topicInput, setTopicInput,
    langInput, setLangInput,
    addTopic, removeTopic, addLang, removeLang,
    submitting, submitRequirement, deleteRequirement,
  };
}

// ─── Shortlists ───────────────────────────────────────────────────────────────

export function useShortlistViewModel() {
  const [companies, setCompanies] = useState<CompanyRequirement[]>([]);
  const [shortlists, setShortlists] = useState<ShortlistResult[]>([]);
  const [activeShortlist, setActiveShortlist] = useState<ShortlistResult | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [batch, setBatch] = useState("");
  const [topN, setTopN] = useState(20);
  const [generating, setGenerating] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [comps, history] = await Promise.all([
          adminApiService.getCompanyRequirements(),
          adminApiService.getShortlists(),
        ]);
        setCompanies(comps);
        setShortlists(history);
      } catch (e: any) { setError(e.message || "Failed to load"); }
      finally { setLoadingHistory(false); }
    })();
  }, []);

  const generateShortlist = async () => {
    if (!selectedCompanyId || !batch) { setError("Select a company and enter batch"); return; }
    setGenerating(true); setError(null);
    try {
      const result = await adminApiService.generateShortlist({ companyId: selectedCompanyId, batch, topN });
      setActiveShortlist(result);
      setShortlists((prev) => [result, ...prev]);
    } catch (e: any) { setError(e.message || "Generation failed"); }
    finally { setGenerating(false); }
  };

  const exportCSV = (sl: ShortlistResult) => {
    const header = ["Rank","Name","Email","Score","Grade","CGPA","Hard","Repos","Batch","Branch"].join(",");
    const rows = sl.rankedStudents.map((s) =>
      [s.rank, s.name||"", s.email||"", s.score, s.grade||"", s.cgpa||"", s.leetcodeHard, s.githubRepos, s.batch||"", s.branch||""].join(",")
    );
    const blob = new Blob([[header,...rows].join("\n")], { type:"text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`shortlist_${sl.companyName||sl.companyId}_${sl.batch}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return {
    companies, shortlists, activeShortlist, setActiveShortlist,
    selectedCompanyId, setSelectedCompanyId,
    batch, setBatch, topN, setTopN,
    generating, loadingHistory, error,
    generateShortlist, exportCSV,
  };
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export function useReportsViewModel() {
  const [data, setData] = useState<FilterStudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApiService.filterStudents({ activeOnly: false });
        setData(res);
      } catch (e: any) { setError(e.message || "Failed to load"); }
      finally { setLoading(false); }
    })();
  }, []);

  const exportCSV = () => {
    if (!data) return;
    const header = ["Name","Email","Grade","Score","CGPA","Batch","Branch","Hard","Repos"].join(",");
    const rows = data.filteredStudents.map((s) =>
      [s.name||"", s.email||"", s.grade||"", s.score, s.cgpa||"", s.batch||"", s.branch||"", s.leetcodeHardCount, s.githubRepoCount].join(",")
    );
    const blob = new Blob([[header,...rows].join("\n")], { type:"text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download="all_students_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return { data, loading, error, exportCSV };
}

