"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import {
  Zap,
  GraduationCap,
  Shield,
  Code2,
  Sparkles,
  BarChart3,
  ArrowRight,
  LogIn,
  Layers,
} from "lucide-react";
import ShaderBackground from "@/components/ui/shader-background";
import { useAuthContext } from "@/context/AuthContext";

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 200, damping: 24 },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 220, damping: 22 },
  },
};

export default function LandingPage() {
  const { user, role, loading } = useAuthContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dashboardPath = role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden text-white">
      {/* Layer 1: Fixed WebGL Shader Background at z-0 */}
      <div className="fixed inset-0 z-0" aria-hidden="true">
        <ShaderBackground />
      </div>

      {/* Layer 2: Dark overlay for text readability at z-[1] */}
      <div
        className="fixed inset-0 z-[1] bg-black/40 pointer-events-none"
        aria-hidden="true"
      />

      {/* Layer 3: Content container at z-[2] */}
      <div className="relative z-[2] flex flex-col flex-grow">
        {/* Navbar Header */}
        <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between border-b border-white/5">
          <Link href="/" className="flex items-center gap-2 group. sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center transition group-hover:border-blue-500/50">
              <Zap className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-blue-400" />
            </div>
            <span className="font-semibold text-lg sm:text-xl tracking-tight text-white">
              SkillSightAI
            </span>
          </Link>

          {/* Auth-dependent Header CTA with hydration gating */}
          <div className="flex items-center gap-3">
            {mounted && !loading && user ? (
              <Link
                href={dashboardPath}
                className="bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl px-4 py-2 text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md shadow-blue-500/20"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-slate-300 hover:text-white font-medium text-xs sm:text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition flex items-center gap-1.5"
                >
                  <LogIn className="h-3.5 w-3.5 hidden sm:inline" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl px-3.5 sm:px-4 py-2 text-xs sm:text-sm transition shadow-md shadow-blue-500/20"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-12 pb-20 max-w-5xl mx-auto text-center relative">
          {/* Spotlight glowing effect behind hero */}
          <div
            className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[600px] md:w-[750px] h-[300px] bg-gradient-to-tr from-blue-500/20 via-violet-500/15 to-cyan-500/10 blur-3xl rounded-full opacity-0 animate-spotlight -z-10"
            aria-hidden="true"
          />

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs sm:text-sm font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Next-Gen Placement & Skill Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight sm:leading-tight md:leading-tight mb-6">
            AI-Powered Career Guidance &{" "}
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Placement Analytics
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Empowering universities and students with real-time GitHub & LeetCode intelligence,
            conversational AI gap diagnosis, and algorithmic shortlist rankings.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            {mounted && !loading && user ? (
              <Link
                href={dashboardPath}
                className="w-full sm:w-auto bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl px-7 py-3.5 text-sm transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                <span>Enter Your Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="w-full sm:w-auto bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl px-7 py-3.5 text-sm transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                >
                  <span>Get Started Now</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto bg-[#0c1627]/80 hover:bg-[#111c2d] border border-slate-700/60 hover:border-slate-600 text-slate-200 font-semibold rounded-xl px-7 py-3.5 text-sm transition flex items-center justify-center gap-2"
                >
                  <LogIn className="h-4 w-4 text-slate-400" />
                  <span>Sign In</span>
                </Link>
              </>
            )}
          </div>
        </main>

        {/* Features / Value Proposition Section */}
        <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800/60">
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
              Intelligence Across Every Dimension
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              A comprehensive platform bridging raw developer telemetry and university placement requirements.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Card 1 */}
            <motion.div
              variants={cardVariants}
              className="bg-[#0c1627] border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/40 transition-all duration-300 shadow-xl shadow-black/30 flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Code2 className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2.5">
                  Live Code & Mastery Telemetry
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Ingests real-time GitHub repository stats, language distributions, and LeetCode
                  easy/medium/hard problem solving velocity into a single score.
                </p>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              variants={cardVariants}
              className="bg-[#0c1627] border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/40 transition-all duration-300 shadow-xl shadow-black/30 flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Sparkles className="h-6 w-6 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2.5">
                  AI Career Coach & Gap Analysis
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Personalized AI guidance with target grade pathways, percentile benchmarks, and
                  actionable recommendations tailored to peer group performance.
                </p>
              </div>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              variants={cardVariants}
              className="bg-[#0c1627] border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/40 transition-all duration-300 shadow-xl shadow-black/30 flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <BarChart3 className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2.5">
                  Algorithmic Shortlist Engine
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Multi-tenant admin dashboard allowing placement officers to customize ranking weights
                  and instantly match candidates against company requirement thresholds.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Split CTA Section */}
        <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="bg-[#0c1627]/90 border border-slate-700/60 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md"
          >
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Choose Your Pathway
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                Whether you are leveling up your engineering skill profile or managing batch placements, get started below.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Student Path */}
              <Link
                href="/register"
                className="flex flex-col items-center justify-center text-center bg-[#111c2d] hover:bg-[#162030] border border-violet-500/30 hover:border-violet-500/60 rounded-2xl p-6 sm:p-7 transition group shadow-lg"
              >
                <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap className="h-7 w-7 text-violet-400" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  For Students
                </span>
                <h3 className="text-lg font-bold text-violet-400 mb-2">
                  I&apos;m a Student
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
                  Track your GitHub & LeetCode velocity, discover gap metrics, and consult with your AI Coach.
                </p>
              </Link>

              {/* Admin Path */}
              <Link
                href="/register-admin"
                className="flex flex-col items-center justify-center text-center bg-[#111c2d] hover:bg-[#162030] border border-cyan-500/30 hover:border-cyan-500/60 rounded-2xl p-6 sm:p-7 transition group shadow-lg"
              >
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="h-7 w-7 text-cyan-400" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  For Placement Cell
                </span>
                <h3 className="text-lg font-bold text-cyan-400 mb-2">
                  I&apos;m an Admin
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
                  Configure custom ranking weights, filter university batches, and generate ranked company shortlists.
                </p>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 mt-auto">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Zap className="h-3 w-3 text-blue-400" />
            </div>
            <span className="font-semibold text-slate-400">SkillSightAI</span>
          </div>
          <p className="text-center sm:text-right">
            © {new Date().getFullYear()} SkillSightAI. Built for next-generation talent analytics.
          </p>
        </footer>
      </div>
    </div>
  );
}
