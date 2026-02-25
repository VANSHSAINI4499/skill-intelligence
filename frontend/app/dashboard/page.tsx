"use client";

import { useDashboardViewModel } from "@/viewmodels/dashboardViewModel";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GradeBadge } from "@/components/dashboard/GradeBadge";
import { ScoreCircle } from "@/components/dashboard/ScoreCircle";
import { GithubPulseCard } from "@/components/dashboard/GithubPulseCard";
import { LeetcodeMasteryCard } from "@/components/dashboard/LeetcodeMasteryCard";
import { SkillRadar } from "@/components/dashboard/SkillRadar";
import { motion } from "framer-motion";
import { Github, Code2, Cpu } from "lucide-react";
import { useRouter } from "next/navigation";

// ----- Animation Variants -----
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

// ----- Reusable dark card wrapper -----
function DarkCard({
  children,
  className = "",
  glowColor = "",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ scale: 1.015, transition: { duration: 0.2 } }}
      className={`
        relative rounded-2xl bg-[#111827] border border-slate-800/70
        shadow-xl backdrop-blur-sm overflow-hidden
        ${glowColor}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  iconColor = "text-cyan-400",
  iconBg = "bg-cyan-500/10",
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className={`p-2.5 rounded-xl ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div>
        <h3 className="font-bold text-white text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ----- Circular progress with label (mirrors MUI CircularProgressWithLabel) -----
function CircularProgressWithLabel({ value, size = 100, strokeWidth = 8 }: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ position: "relative", display: "inline-flex", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* track */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
        {/* progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="url(#lcGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        <defs>
          <linearGradient id="lcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <span style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span className="text-cyan-300 font-black font-mono" style={{ fontSize: size * 0.18 }}>
          {Math.round(value)}%
        </span>
      </span>
    </div>
  );
}

// ----- Loading screen (driven by real loadingStep data from VM) -----
const STEP_THRESHOLDS = [30, 60, 85, 100] as const;
const STEP_ACTIVE_AT  = [5,  30, 60, 85]  as const;
const STEP_NAMES      = ["Authenticating", "Connecting", "Profile", "Analytics"] as const;

function DashboardSkeleton({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center gap-8">
      {/* Glowing ring backdrop */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-2xl opacity-20 bg-cyan-500 scale-150" />
        <div className="flex flex-col items-center gap-4">
          <CircularProgressWithLabel value={pct} size={120} strokeWidth={10} />
          <p className="text-slate-300 text-sm font-semibold tracking-wide">{label}</p>
        </div>
      </div>
      {/* Step progress track */}
      <div className="w-64 space-y-2">
        {STEP_NAMES.map((name, i) => {
          const done   = pct >= STEP_THRESHOLDS[i];
          const active = !done && pct >= STEP_ACTIVE_AT[i];
          return (
            <div key={name} className="flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full shrink-0 transition-colors duration-500 ${
                done ? "bg-cyan-400" : active ? "bg-cyan-500 animate-pulse" : "bg-slate-700"
              }`} />
              <span className={`text-xs transition-colors duration-500 ${
                done ? "text-slate-400 line-through" : active ? "text-slate-200 font-medium" : "text-slate-600"
              }`}>{name}</span>
              {done && <span className="text-cyan-500 text-[10px] ml-auto">✓</span>}
            </div>
          );
        })}
      </div>
      <p className="text-slate-600 text-xs max-w-xs text-center">
        Please wait — page will appear automatically once loading reaches 100%.
      </p>
    </div>
  );
}

// ----- Fatal load-error screen (shown when startup API calls fail) -----
function DashboardErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  const is401 = message.includes("401") || message.toLowerCase().includes("unauthorized");
  return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center gap-6 px-6">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl">
        {is401 ? "🔒" : "⚠️"}
      </div>
      <div className="text-center space-y-2 max-w-sm">
        <h2 className="text-white font-bold text-lg">
          {is401 ? "Session expired" : "Could not load dashboard"}
        </h2>
        <p className="text-slate-400 text-sm">
          {is401
            ? "Your session token isn't ready yet. Click \"Try again\" below — it usually resolves in one retry."
            : "Something went wrong while loading your profile. Please try again."}
        </p>
        <p className="text-slate-600 text-xs font-mono bg-slate-900 rounded-lg px-3 py-2 mt-1 break-all">
          {message}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="mt-2 px-8 py-3 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20 transition-all duration-200 active:scale-95"
      >
        Try again
      </button>
    </div>
  );
}

// =================== PAGE ===================
export default function DashboardPage() {
  const {
    userProfile,
    analytics,
    loadingStep,
    loadError,
    retryLoad,
    loadingPct,
    loadingLabel,
    handleLogout,
  } = useDashboardViewModel();

  const router = useRouter();

  // Show error screen for any fatal startup failure (401, network, etc.)
  // Page stays gated — the user never sees a blank/broken dashboard.
  if (loadError) return <DashboardErrorScreen message={loadError} onRetry={retryLoad} />;

  // Hold the page until loadingStep reaches 4 (all API calls returned 200).
  // 0 = waiting for auth · 1 = profile · 2 = analytics · 3 = applying · 4 = done
  if (loadingStep < 4) return <DashboardSkeleton pct={loadingPct} label={loadingLabel} />;

  const totalLeet =
    (analytics?.leetcode_easy ?? 0) +
    (analytics?.leetcode_medium ?? 0) +
    (analytics?.leetcode_hard ?? 0);

  return (
    <DashboardLayout
      userRole={userProfile?.role}
      userName={userProfile?.name}
      onLogout={handleLogout}
    >
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >

        {/* SECTION 1 — HERO */}
        <DarkCard glowColor="shadow-[0_0_60px_rgba(6,182,212,0.07)]" className="p-6">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-cyan-500 via-blue-500 to-violet-500 rounded-t-2xl" />
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="flex flex-col md:flex-row items-center gap-10">
              <GradeBadge grade={userProfile?.grade} />
              <ScoreCircle score={userProfile?.score ?? 0} />
            </div>
            <div className="flex flex-col justify-center flex-1 text-center md:text-left">
              <motion.h2
                variants={fadeUp}
                className="text-2xl md:text-3xl font-extrabold text-white leading-tight"
              >
                {userProfile?.name?.split(" ")[0]}&apos;s{" "}
                <span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Skill Profile
                </span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-slate-400 text-sm mt-2 max-w-lg">
                Your performance places you in the{" "}
                <span className="text-cyan-400 font-semibold">top tier</span> of active coders.
                Keep solving, keep building.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mt-5 justify-center md:justify-start">
                {userProfile?.universityName && (
                  <span className="bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-xs text-blue-300 font-medium">
                    🏫 {userProfile.universityName}
                  </span>
                )}
                <span className="bg-slate-800/80 border border-slate-700/50 rounded-full px-4 py-1.5 text-xs text-slate-300 font-medium">
                  🎓 {userProfile?.batch ?? "—"}
                </span>
                <span className="bg-slate-800/80 border border-slate-700/50 rounded-full px-4 py-1.5 text-xs text-slate-300 font-medium">
                  🌿 {userProfile?.branch ?? "—"}
                </span>
                <span className="bg-slate-800/80 border border-slate-700/50 rounded-full px-4 py-1.5 text-xs text-slate-300 font-medium">
                  📊 CGPA {userProfile?.cgpa ?? "—"}
                </span>
                <span className="bg-slate-800/80 border border-slate-700/50 rounded-full px-4 py-1.5 text-xs text-slate-300 font-medium">
                  💻 {totalLeet} LeetCode Solved
                </span>
                <span className="bg-slate-800/80 border border-slate-700/50 rounded-full px-4 py-1.5 text-xs text-slate-300 font-medium">
                  🐙 {analytics?.github_totalRepos ?? userProfile?.githubRepoCount ?? 0} GitHub Repos
                </span>
              </motion.div>
              {/* Update Profile CTA */}
              <motion.button
                variants={fadeUp}
                onClick={() => router.push("/dashboard/settings")}
                className="mt-5 self-start flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-all duration-200 group"
              >
                <span>⚡ Update Profile &amp; Score</span>
                <span className="text-cyan-600 group-hover:translate-x-0.5 transition-transform duration-200">→</span>
              </motion.button>
            </div>
          </div>
        </DarkCard>

        {/* SECTION 2 — GITHUB + LEETCODE + SKILL INSIGHTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

          {/* LEFT: GitHub Pulse + Skill Insights stacked */}
          <div className="flex flex-col gap-6">
            <DarkCard glowColor="shadow-[0_0_40px_rgba(34,211,238,0.06)]" className="p-6">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-cyan-500 to-blue-500 rounded-t-2xl" />
              <SectionHeader
                icon={<Github size={16} />}
                title="GitHub Pulse"
                subtitle="Repository activity & language distribution"
                iconColor="text-cyan-400"
                iconBg="bg-cyan-500/10"
              />
              <GithubPulseCard
                totalRepos={analytics?.github_totalRepos ?? userProfile?.githubRepoCount ?? 0}
                totalStars={analytics?.github_totalStars ?? 0}
                languageDistribution={analytics?.github_languageDistribution ?? {}}
                repositories={analytics?.topRepositories ?? []}
              />
            </DarkCard>

            <DarkCard glowColor="shadow-[0_0_40px_rgba(124,58,237,0.07)]" className="p-6 flex-1">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-violet-500 to-indigo-500 rounded-t-2xl" />
              <SectionHeader
                icon={<Cpu size={16} />}
                title="Skill Insights"
                subtitle="Normalised balance index"
                iconColor="text-violet-400"
                iconBg="bg-violet-500/10"
              />
              <SkillRadar
                easy={analytics?.leetcode_easy ?? 0}
                medium={analytics?.leetcode_medium ?? 0}
                hard={analytics?.leetcode_hard ?? userProfile?.leetcodeHardCount ?? 0}
                repos={analytics?.github_totalRepos ?? userProfile?.githubRepoCount ?? 0}
                cgpa={userProfile?.cgpa ?? 0}
              />
            </DarkCard>
          </div>

          {/* RIGHT: LeetCode Mastery — full height */}
          <DarkCard glowColor="shadow-[0_0_40px_rgba(251,146,60,0.06)]" className="p-6">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-orange-500 to-yellow-400 rounded-t-2xl" />
            <SectionHeader
              icon={<Code2 size={16} />}
              title="LeetCode Mastery"
              subtitle="Difficulty breakdown & performance insights"
              iconColor="text-orange-400"
              iconBg="bg-orange-500/10"
            />
            <LeetcodeMasteryCard
              easy={analytics?.leetcode_easy ?? 0}
              medium={analytics?.leetcode_medium ?? 0}
              hard={analytics?.leetcode_hard ?? userProfile?.leetcodeHardCount ?? 0}
              deepStats={analytics?.leetcode}
            />
          </DarkCard>
        </div>

      </motion.div>
    </DashboardLayout>
  );
}
