"use client";

import { useDashboardViewModel } from "@/viewmodels/dashboardViewModel";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GradeBadge } from "@/components/dashboard/GradeBadge";
import { ScoreCircle } from "@/components/dashboard/ScoreCircle";
import { GithubPulseCard } from "@/components/dashboard/GithubPulseCard";
import { LeetcodeMasteryCard } from "@/components/dashboard/LeetcodeMasteryCard";
import { SkillRadar } from "@/components/dashboard/SkillRadar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Loader2, Github, Code2, Cpu, SlidersHorizontal } from "lucide-react";

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

// ----- Loading skeleton -----
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
      <div className="space-y-4 w-full max-w-md p-8">
        <Skeleton className="h-16 w-16 rounded-full bg-slate-800" />
        <Skeleton className="h-4 w-56 bg-slate-800" />
        <Skeleton className="h-4 w-40 bg-slate-800" />
        <Skeleton className="h-4 w-48 bg-slate-800" />
      </div>
    </div>
  );
}

// =================== PAGE ===================
export default function DashboardPage() {
  const {
    userProfile,
    analytics,
    loading,
    analyzing,
    githubUsername, setGithubUsername,
    leetcodeUsername, setLeetcodeUsername,
    cgpa, setCgpa,
    semester, setSemester,
    updateProfile,
    handleLogout,
  } = useDashboardViewModel();

  if (loading) return <DashboardSkeleton />;

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
                <span className="bg-slate-800/80 border border-slate-700/50 rounded-full px-4 py-1.5 text-xs text-slate-300 font-medium">
                  ?? Sem {userProfile?.semester ?? "—"}
                </span>
                <span className="bg-slate-800/80 border border-slate-700/50 rounded-full px-4 py-1.5 text-xs text-slate-300 font-medium">
                  ?? CGPA {userProfile?.cgpa ?? "—"}
                </span>
                <span className="bg-slate-800/80 border border-slate-700/50 rounded-full px-4 py-1.5 text-xs text-slate-300 font-medium">
                  ?? {totalLeet} LeetCode Solved
                </span>
                <span className="bg-slate-800/80 border border-slate-700/50 rounded-full px-4 py-1.5 text-xs text-slate-300 font-medium">
                  ?? {analytics?.github_totalRepos ?? userProfile?.githubRepoCount ?? 0} GitHub Repos
                </span>
              </motion.div>
            </div>
          </div>
        </DarkCard>

        {/* SECTION 2 + 3 — GITHUB + LEETCODE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            />
          </DarkCard>

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
            />
          </DarkCard>
        </div>

        {/* SECTION 4 + FORM */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <DarkCard glowColor="shadow-[0_0_40px_rgba(124,58,237,0.07)]" className="p-6 lg:col-span-1">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-violet-500 to-indigo-500 rounded-t-2xl" />
            <SectionHeader
              icon={<Cpu size={16} />}
              title="Skill Insights"
              subtitle="AI-powered balance index"
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

          <DarkCard className="p-6 lg:col-span-2">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-slate-600 to-slate-700 rounded-t-2xl" />
            <SectionHeader
              icon={<SlidersHorizontal size={16} />}
              title="Update Profile"
              subtitle="Recalculate your score with new data"
              iconColor="text-slate-300"
              iconBg="bg-slate-700/60"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Semester</label>
                <Input
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  type="number"
                  className="bg-[#0B1120] border-slate-700 text-slate-100 placeholder:text-slate-600 rounded-xl"
                  placeholder="e.g. 3"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CGPA</label>
                <Input
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                  type="number"
                  step="0.01"
                  className="bg-[#0B1120] border-slate-700 text-slate-100 placeholder:text-slate-600 rounded-xl"
                  placeholder="e.g. 8.5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GitHub Username</label>
                <Input
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  className="bg-[#0B1120] border-slate-700 text-slate-100 placeholder:text-slate-600 rounded-xl"
                  placeholder="username"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">LeetCode Username</label>
                <Input
                  value={leetcodeUsername}
                  onChange={(e) => setLeetcodeUsername(e.target.value)}
                  className="bg-[#0B1120] border-slate-700 text-slate-100 placeholder:text-slate-600 rounded-xl"
                  placeholder="username"
                />
              </div>
            </div>

            <Button
              onClick={updateProfile}
              disabled={analyzing}
              className="w-full mt-5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl h-11 shadow-lg shadow-cyan-500/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Your Profile...
                </>
              ) : (
                "? Analyze & Update Score"
              )}
            </Button>

            {analyzing && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {["Fetching GitHub", "Fetching LeetCode", "Calculating Score", "Updating Firestore"].map((step, i) => (
                  <motion.span
                    key={step}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.3 }}
                    className="text-xs bg-slate-800 border border-slate-700 rounded-full px-3 py-1 text-slate-400"
                  >
                    <Loader2 className="inline mr-1 h-2.5 w-2.5 animate-spin" />
                    {step}
                  </motion.span>
                ))}
              </div>
            )}
          </DarkCard>
        </div>

      </motion.div>
    </DashboardLayout>
  );
}
