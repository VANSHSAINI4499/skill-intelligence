"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { authService } from "@/services/authService";
import { Loader2, Shield, Building2, User, Mail, Lock, ChevronRight, Copy, CheckCheck } from "lucide-react";
import AuthLayout from "@/components/ui/auth-layout";

export default function AdminRegisterPage() {
  const router = useRouter();

  const [universityName, setUniversityName] = useState("");
  const [adminName,      setAdminName]      = useState("");
  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  // After registration — show the universityId to the admin before redirecting
  const [createdUniversityId, setCreatedUniversityId] = useState<string | null>(null);
  const [copied,              setCopied]              = useState(false);

  const handleCopy = () => {
    if (!createdUniversityId) return;
    navigator.clipboard.writeText(createdUniversityId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Create university + admin — backend returns the universityId
      const response = await authService.registerAdmin({ universityName, adminName, email, password });

      // 2. Sign in + force-refresh token so admin claims are embedded in JWT
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await user.getIdToken(/* forceRefresh= */ true);

      // 3. Show the universityId BEFORE redirecting — admin must share it with students
      setCreatedUniversityId(response.universityId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="mt-4 text-slate-400 text-sm">Setting up your university…</p>
        </div>
      </AuthLayout>
    );
  }

  // ── Success screen: show universityId with copy button ────────────────────
  if (createdUniversityId) {
    return (
      <AuthLayout>
          <div className="bg-[#0c1627] border border-cyan-500/30 rounded-2xl shadow-xl shadow-black/40 p-8 text-center space-y-6">

            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <CheckCheck className="h-8 w-8 text-cyan-400" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white mb-2">University Created!</h1>
              <p className="text-slate-400 text-sm">
                Share the <span className="text-white font-semibold">University ID</span> below with your
                students — they need it to register.
              </p>
            </div>

            {/* University ID copy box */}
            <div className="bg-[#111c2d] border border-cyan-500/20 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">University ID</p>
              <div className="flex items-center justify-between gap-3">
                <code className="text-cyan-300 font-mono text-sm break-all text-left">
                  {createdUniversityId}
                </code>
                <button
                  onClick={handleCopy}
                  title="Copy to clipboard"
                  className="shrink-0 p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition"
                >
                  {copied
                    ? <CheckCheck className="h-4 w-4 text-cyan-400" />
                    : <Copy className="h-4 w-4 text-cyan-400" />}
                </button>
              </div>
              {copied && <p className="text-xs text-cyan-500 mt-2">Copied to clipboard!</p>}
            </div>

            {/* Note */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-left">
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">Save this ID</p>
              <p className="text-slate-400 text-xs">
                You can also find it anytime in your Admin Dashboard → Overview.
                Students must enter this when registering at{" "}
                <span className="text-white">/register</span>.
              </p>
            </div>

            <button
              onClick={() => router.replace("/admin")}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-[#060d18] font-semibold rounded-lg px-4 py-2.5 text-sm transition flex items-center justify-center gap-2"
            >
              Go to Admin Dashboard
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
    </AuthLayout>
    );
  }

  return (
    <AuthLayout>
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-2">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium tracking-wide">University Admin Portal</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#0c1627] border border-slate-700/50 rounded-2xl shadow-xl shadow-black/40 p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-1">
            Register Your University
          </h1>
          <p className="text-slate-400 text-sm text-center mb-8">
            Create an admin account to manage students and shortlists
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* University Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> University Name
              </label>
              <input
                type="text"
                placeholder="MIT, IIT Bombay…"
                value={universityName}
                onChange={(e) => setUniversityName(e.target.value)}
                required
                className="w-full bg-[#111c2d] border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition"
              />
            </div>

            {/* Admin Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Your Full Name
              </label>
              <input
                type="text"
                placeholder="Dr. Jane Smith"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                className="w-full bg-[#111c2d] border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </label>
              <input
                type="email"
                placeholder="admin@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#111c2d] border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Password
              </label>
              <input
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-[#111c2d] border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition"
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
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#060d18] font-semibold rounded-lg px-4 py-2.5 text-sm transition flex items-center justify-center gap-2 mt-2"
            >
              Create University Account
              <ChevronRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700/50 flex flex-col gap-2 text-center text-sm text-slate-500">
            <span>
              Already have an admin account?{" "}
              <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition">
                Sign in
              </Link>
            </span>
            <span>
              Student?{" "}
              <Link href="/register" className="text-slate-400 hover:text-slate-300 transition">
                Register here
              </Link>
            </span>
          </div>
        </div>
    </AuthLayout>
  );
}
