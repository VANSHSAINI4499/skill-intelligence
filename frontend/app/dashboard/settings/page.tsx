"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { studentService } from "@/services/studentService";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { firebaseService } from "@/services/firebaseService";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
} as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth({ required: "student" });

  const [name,             setName]             = useState("");
  const [githubUsername,   setGithubUsername]   = useState("");
  const [leetcodeUsername, setLeetcodeUsername] = useState("");
  const [cgpa,             setCgpa]             = useState("");
  const [batch,            setBatch]            = useState("");
  const [branch,           setBranch]           = useState("");

  const [analyzing,  setAnalyzing]  = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Prefill form from the stored profile
  useEffect(() => {
    if (authLoading || !user) return;
    studentService.getProfile()
      .then((p) => {
        setName(p.name ?? "");
        setGithubUsername(p.githubUsername ?? "");
        setLeetcodeUsername(p.leetcodeUsername ?? "");
        setCgpa(p.cgpa?.toString() ?? "");
        setBatch(p.batch ?? "");
        setBranch(p.branch ?? "");
      })
      .catch(() => {/* silent — form stays blank */})
      .finally(() => setProfileLoading(false));
  }, [authLoading, user]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setSuccess(false);
    try {
      await studentService.analyze({
        githubUsername,
        leetcodeUsername,
        cgpa: parseFloat(cgpa) || 0,
        batch,
        branch,
      });
      setSuccess(true);
      // Brief pause so the success state is visible, then go back to dashboard
      setTimeout(() => router.push("/dashboard"), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLogout = async () => {
    await firebaseService.logout();
    router.push("/login");
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <DashboardLayout userRole="student" userName={name} onLogout={handleLogout}>
      <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-2xl mx-auto space-y-6">

        {/* Back button */}
        <motion.button
          variants={fadeUp}
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 text-sm font-medium transition-colors duration-200 group"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
          Back to Dashboard
        </motion.button>

        {/* Header card */}
        <motion.div
          variants={fadeUp}
          className="relative rounded-2xl bg-[#111827] border border-slate-800/70 p-6 overflow-hidden shadow-xl"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-cyan-500 via-violet-500 to-blue-500 rounded-t-2xl" />
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-500/10">
              <SlidersHorizontal size={20} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">Update Profile</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Re-run the analysis to recalculate your score and grade
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form card */}
        <motion.div
          variants={fadeUp}
          className="relative rounded-2xl bg-[#111827] border border-slate-800/70 p-6 shadow-xl"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-slate-600 to-slate-700 rounded-t-2xl" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Batch</label>
              <Input
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="e.g. 2022-2026"
                className="bg-[#0B1120] border-slate-700 text-slate-100 placeholder:text-slate-600 rounded-xl h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CGPA</label>
              <Input
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                type="number"
                step="0.01"
                placeholder="e.g. 8.5"
                className="bg-[#0B1120] border-slate-700 text-slate-100 placeholder:text-slate-600 rounded-xl h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Branch</label>
              <Input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. Computer Science"
                className="bg-[#0B1120] border-slate-700 text-slate-100 placeholder:text-slate-600 rounded-xl h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GitHub Username</label>
              <Input
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="username"
                className="bg-[#0B1120] border-slate-700 text-slate-100 placeholder:text-slate-600 rounded-xl h-11"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">LeetCode Username</label>
              <Input
                value={leetcodeUsername}
                onChange={(e) => setLeetcodeUsername(e.target.value)}
                placeholder="username"
                className="bg-[#0B1120] border-slate-700 text-slate-100 placeholder:text-slate-600 rounded-xl h-11"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-xl border px-4 py-3.5 text-sm flex items-start gap-3 bg-red-500/8 border-red-500/30 text-red-300"
            >
              <span className="text-base shrink-0 mt-0.5">
                {error.toLowerCase().includes("timeout") ? "⏱️"
                  : error.toLowerCase().includes("cannot reach") ? "🔌"
                  : error.includes("401") ? "🔒" : "⚠️"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-red-200 mb-0.5">
                  {error.toLowerCase().includes("timeout") ? "Analysis timed out"
                    : error.toLowerCase().includes("cannot reach") ? "Backend unreachable"
                    : error.includes("401") ? "Session expired"
                    : "Analysis failed"}
                </p>
                <p className="text-red-400 text-xs leading-relaxed wrap-break-word">{error}</p>
                {error.toLowerCase().includes("timeout") && (
                  <p className="text-slate-500 text-xs mt-1.5">
                    LeetCode fetches are throttled — try again in 60–90 s.
                  </p>
                )}
              </div>
              <button
                onClick={handleAnalyze}
                className="text-xs text-red-400 hover:text-red-200 border border-red-500/30 hover:border-red-400/50 rounded-lg px-2.5 py-1 shrink-0 transition"
              >
                Retry
              </button>
            </motion.div>
          )}

          {/* Success */}
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-5 rounded-xl border px-4 py-3.5 flex items-center gap-3 bg-emerald-500/8 border-emerald-500/30 text-emerald-300"
            >
              <CheckCircle2 size={18} className="shrink-0" />
              <p className="text-sm font-semibold">Score updated! Redirecting to dashboard…</p>
            </motion.div>
          )}

          {/* Submit */}
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || success}
            className="w-full mt-6 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl h-11 shadow-lg shadow-cyan-500/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Your Profile…
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Done!
              </>
            ) : (
              "⚡ Analyze & Update Score"
            )}
          </Button>

          {/* Analyzing step list */}
          {analyzing && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 grid grid-cols-2 gap-2"
            >
              {(["Fetching GitHub", "Fetching LeetCode", "Calculating Score", "Saving Results"] as const).map((step, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.3 }}
                  className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2"
                >
                  <Loader2 className="h-3 w-3 animate-spin text-cyan-500 shrink-0" />
                  <span className="text-xs text-slate-400">{step}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Info note */}
        <motion.p variants={fadeUp} className="text-center text-slate-600 text-xs pb-4">
          Analysis fetches live data from GitHub and LeetCode — this can take up to 90 seconds.
        </motion.p>

      </motion.div>
    </DashboardLayout>
  );
}
