"use client";

import { useAuthViewModel } from "@/viewmodels/authViewModel";
import Link from "next/link";
import { Loader2, Zap, Mail, Lock, GraduationCap, Shield } from "lucide-react";

export default function LoginPage() {
  const { email, setEmail, password, setPassword, loading, error, handleLogin } = useAuthViewModel();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#060d18]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
        <p className="mt-4 text-slate-400 text-sm">Signing you in…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060d18] flex items-center justify-center px-4">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-150 h-100 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Zap className="h-4 w-4 text-blue-400" />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">Skill Intelligence</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#0c1627] border border-slate-700/50 rounded-2xl shadow-xl shadow-black/40 p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-1">Welcome back</h1>
          <p className="text-slate-400 text-sm text-center mb-8">Sign in to your account</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#111c2d] border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Password
              </label>
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#111c2d] border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </button>
          </form>

          {/* Register options */}
          <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-3">
            <p className="text-xs text-slate-500 text-center uppercase tracking-wider">New here?</p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/register"
                className="flex flex-col items-center gap-2 bg-[#111c2d] hover:bg-[#162030] border border-violet-500/20 hover:border-violet-500/40 rounded-xl px-3 py-4 text-center transition group"
              >
                <GraduationCap className="h-5 w-5 text-violet-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-slate-300">Register as</span>
                <span className="text-xs font-bold text-violet-400">Student</span>
              </Link>
              <Link
                href="/register-admin"
                className="flex flex-col items-center gap-2 bg-[#111c2d] hover:bg-[#162030] border border-cyan-500/20 hover:border-cyan-500/40 rounded-xl px-3 py-4 text-center transition group"
              >
                <Shield className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-slate-300">Register as</span>
                <span className="text-xs font-bold text-cyan-400">University Admin</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
