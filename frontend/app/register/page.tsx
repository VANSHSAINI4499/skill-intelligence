"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "@/services/authService";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2, GraduationCap, User, Mail, Lock, Hash, BookOpen, ChevronRight } from "lucide-react";

export default function StudentRegisterPage() {
  const router = useRouter();

  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [universityId, setUniversityId] = useState("");
  const [batch,        setBatch]        = useState("");
  const [branch,       setBranch]       = useState("");
  const [cgpa,         setCgpa]         = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.registerStudent({
        name,
        email,
        password,
        universityId,
        batch,
        branch,
        cgpa: parseFloat(cgpa),
      });
      await signInWithEmailAndPassword(auth, email, password);
      await auth.currentUser?.getIdToken(/* forceRefresh= */ true);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#060d18]">
        <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
        <p className="mt-4 text-slate-400 text-sm">Creating your account…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060d18] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-125 h-100 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-2">
            <GraduationCap className="h-4 w-4 text-violet-400" />
            <span className="text-violet-400 text-sm font-medium tracking-wide">Student Registration</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#0c1627] border border-slate-700/50 rounded-2xl shadow-xl shadow-black/40 p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-1">Create Student Account</h1>
          <p className="text-slate-400 text-sm text-center mb-8">
            Join your university's skill intelligence platform
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Full Name
              </label>
              <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full bg-[#111c2d] border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition" />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </label>
              <input type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-[#111c2d] border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition" />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Password
              </label>
              <input type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                className="w-full bg-[#111c2d] border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition" />
            </div>

            {/* University ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" /> University ID
              </label>
              <input type="text" placeholder="Provided by your admin" value={universityId} onChange={(e) => setUniversityId(e.target.value)} required
                className="w-full bg-[#111c2d] border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition" />
            </div>

            {/* Batch + Branch row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Batch</label>
                <input type="text" placeholder="2022-2026" value={batch} onChange={(e) => setBatch(e.target.value)} required pattern="\d{4}-\d{4}"
                  className="w-full bg-[#111c2d] border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" /> Branch
                </label>
                <input type="text" placeholder="CSE" value={branch} onChange={(e) => setBranch(e.target.value)} required
                  className="w-full bg-[#111c2d] border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition" />
              </div>
            </div>

            {/* CGPA */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">CGPA (0–10)</label>
              <input type="number" step="0.01" min="0" max="10" placeholder="8.5" value={cgpa} onChange={(e) => setCgpa(e.target.value)} required
                className="w-full bg-[#111c2d] border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition" />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-violet-500 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition flex items-center justify-center gap-2 mt-2">
              Create Student Account
              <ChevronRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700/50 flex flex-col gap-2 text-center text-sm text-slate-500">
            <span>Already have an account?{" "}
              <Link href="/login" className="text-violet-400 hover:text-violet-300 transition">Sign in</Link>
            </span>
            <span>Registering a university?{" "}
              <Link href="/register-admin" className="text-slate-400 hover:text-slate-300 transition">Admin registration</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
