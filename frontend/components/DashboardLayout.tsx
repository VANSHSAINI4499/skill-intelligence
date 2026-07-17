"use client";

import React, { useState } from 'react';
import { User, LogOut, LayoutDashboard, Shield, Zap, BrainCircuit, Menu, X } from 'lucide-react';
import Link from 'next/link';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: 'student' | 'admin';
  userName?: string;
  onLogout: () => void;
}

export function DashboardLayout({ children, userRole, userName, onLogout }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Zap size={16} className="text-white" />
            </div>
            <h1 className="text-base font-bold text-white tracking-tight">SkillSightAI</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 ml-10">AI Analytics Platform</p>
        </div>
        {/* Mobile close button inside drawer */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800/60 hover:text-cyan-400 rounded-xl transition-all duration-200 group"
        >
          <LayoutDashboard size={18} className="group-hover:text-cyan-400 shrink-0" />
          <span className="font-medium text-sm">Dashboard</span>
        </Link>

        <Link
          href="/dashboard/ai-coach"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800/60 hover:text-cyan-400 rounded-xl transition-all duration-200 group"
        >
          <BrainCircuit size={18} className="group-hover:text-cyan-400 shrink-0" />
          <span className="font-medium text-sm">AI Coach</span>
        </Link>

        {userRole === 'admin' && (
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800/60 hover:text-violet-400 rounded-xl transition-all duration-200 group"
          >
            <Shield size={18} className="group-hover:text-violet-400 shrink-0" />
            <span className="font-medium text-sm">Admin</span>
          </Link>
        )}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-slate-800/60">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/40 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center shrink-0">
            <User size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{userName || 'Student'}</p>
            <p className="text-xs text-slate-500 capitalize">{userRole}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setMobileOpen(false);
            onLogout();
          }}
          className="flex items-center gap-3 px-4 py-2.5 w-full text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200 text-sm"
        >
          <LogOut size={16} className="shrink-0" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col md:block">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer (< md) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0d1526] border-r border-slate-800/60 flex flex-col transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Fixed Sidebar (>= md) */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-[#0d1526] border-r border-slate-800/60 z-10 flex-col">
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <div className="md:ml-64 flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-[#0d1526]/80 backdrop-blur border-b border-slate-800/60 flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger button on mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg bg-slate-800/60 text-slate-300 hover:text-white transition shrink-0"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="text-xs sm:text-sm text-slate-500 truncate">
              Welcome back,{' '}
              <span className="font-semibold text-slate-200 truncate">{userName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span
              className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold tracking-wide ${
                userRole === 'admin'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              {userRole?.toUpperCase()}
            </span>
            <div className="h-8 w-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center shrink-0">
              <User size={14} className="text-white" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 md:p-8 flex-1">{children}</main>
      </div>
    </div>
  );
}
