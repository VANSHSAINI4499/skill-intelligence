import React from 'react';
import { User, LogOut, LayoutDashboard, Shield, Zap, BrainCircuit } from 'lucide-react';
import Link from 'next/link';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: 'student' | 'admin';
  userName?: string;
  onLogout: () => void;
}

export function DashboardLayout({ children, userRole, userName, onLogout }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-[#0d1526] border-r border-slate-800/60 z-10 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Zap size={16} className="text-white" />
            </div>
            <h1 className="text-base font-bold text-white tracking-tight">SkillIntelligence</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 ml-10">AI Analytics Platform</p>
        </div>

        {/* Nav */}
        <nav className="p-4 space-y-1 flex-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800/60 hover:text-cyan-400 rounded-xl transition-all duration-200 group"
          >
            <LayoutDashboard size={18} className="group-hover:text-cyan-400" />
            <span className="font-medium text-sm">Dashboard</span>
          </Link>

          <Link
            href="/dashboard/ai-coach"
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800/60 hover:text-cyan-400 rounded-xl transition-all duration-200 group"
          >
            <BrainCircuit size={18} className="group-hover:text-cyan-400" />
            <span className="font-medium text-sm">AI Coach</span>
          </Link>

          {userRole === 'admin' && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800/60 hover:text-violet-400 rounded-xl transition-all duration-200 group"
            >
              <Shield size={18} className="group-hover:text-violet-400" />
              <span className="font-medium text-sm">Admin</span>
            </Link>
          )}
        </nav>

        {/* User + Logout */}
        <div className="p-4 border-t border-slate-800/60">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/40 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{userName || 'Student'}</p>
              <p className="text-xs text-slate-500 capitalize">{userRole}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-2.5 w-full text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200 text-sm"
          >
            <LogOut size={16} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-64">
        {/* Header */}
        <header className="h-16 bg-[#0d1526]/80 backdrop-blur border-b border-slate-800/60 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="text-sm text-slate-500">
            Welcome back,{' '}
            <span className="font-semibold text-slate-200">{userName}</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                userRole === 'admin'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              {userRole?.toUpperCase()}
            </span>
            <div className="h-8 w-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}

