"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Sliders,
  Building2,
  ListOrdered,
  BarChart3,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useAdminAuth } from "@/viewmodels/adminViewModel";

const NAV_ITEMS = [
  { label: "Overview",      href: "/admin/overview",      icon: LayoutDashboard, accent: "cyan"   },
  { label: "Students",      href: "/admin/students",      icon: Users,           accent: "violet" },
  { label: "Algorithm",     href: "/admin/algorithm",     icon: Sliders,         accent: "amber"  },
  { label: "Requirements",  href: "/admin/requirements",  icon: Building2,       accent: "emerald"},
  { label: "Shortlists",    href: "/admin/shortlists",    icon: ListOrdered,     accent: "sky"    },
  { label: "Reports",       href: "/admin/reports",       icon: BarChart3,       accent: "rose"   },
];

const ACCENT_CLASSES: Record<string, { text: string; bg: string; glow: string; dot: string }> = {
  cyan:    { text: "text-cyan-400",    bg: "bg-cyan-500/10",    glow: "shadow-cyan-500/20",    dot: "bg-cyan-400"    },
  violet:  { text: "text-violet-400",  bg: "bg-violet-500/10",  glow: "shadow-violet-500/20",  dot: "bg-violet-400"  },
  amber:   { text: "text-amber-400",   bg: "bg-amber-500/10",   glow: "shadow-amber-500/20",   dot: "bg-amber-400"   },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10", glow: "shadow-emerald-500/20", dot: "bg-emerald-400" },
  sky:     { text: "text-sky-400",     bg: "bg-sky-500/10",     glow: "shadow-sky-500/20",     dot: "bg-sky-400"     },
  rose:    { text: "text-rose-400",    bg: "bg-rose-500/10",    glow: "shadow-rose-500/20",    dot: "bg-rose-400"    },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { adminName, authReady, logout } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(false);

  const activeItem = NAV_ITEMS.find((n) => pathname.startsWith(n.href));

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#060d18] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060d18] text-slate-100 flex">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="fixed left-0 top-0 h-full z-30 flex flex-col overflow-hidden
                   bg-[#080f1c]/95 backdrop-blur-xl border-r border-white/5"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5 min-h-18">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600
                          flex items-center justify-center shadow-lg shadow-cyan-500/25 shrink-0">
            <Zap size={18} className="text-white" />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <p className="text-sm font-bold text-white tracking-tight whitespace-nowrap">SkillSightAI</p>
                <p className="text-xs text-slate-500 whitespace-nowrap">Admin Console</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ label, href, icon: Icon, accent }) => {
            const ac = ACCENT_CLASSES[accent];
            const isActive = pathname.startsWith(href);
            return (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ x: collapsed ? 0 : 3 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer
                    ${isActive
                      ? `${ac.bg} ${ac.text} shadow-sm ${ac.glow}`
                      : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                    }`}
                >
                  <div className="relative shrink-0">
                    <Icon size={18} />
                    {isActive && (
                      <span className={`absolute -right-0.5 -top-0.5 w-1.5 h-1.5 rounded-full ${ac.dot}`} />
                    )}
                  </div>
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="text-sm font-medium whitespace-nowrap"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-2 py-3 border-t border-white/5 space-y-1">
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3"
              >
                <div className="w-7 h-7 rounded-full bg-linear-to-br from-violet-500 to-indigo-600
                                flex items-center justify-center shrink-0">
                  <Shield size={12} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{adminName}</p>
                  <p className="text-[10px] text-slate-500">Admin</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl
                       text-slate-500 hover:text-rose-400 hover:bg-rose-500/10
                       transition-all duration-200 text-sm"
          >
            <LogOut size={16} className="shrink-0" />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="font-medium whitespace-nowrap">Sign Out</motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((p) => !p)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full
                     bg-[#0d1a30] border border-white/10 flex items-center justify-center
                     text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40
                     transition-all duration-200 shadow-lg z-10"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </motion.aside>

      {/* ── Main content ────────────────────────────────── */}
      <motion.main
        animate={{ marginLeft: collapsed ? 72 : 240 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="flex-1 flex flex-col min-h-screen"
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 bg-[#080f1c]/80 backdrop-blur-xl
                           border-b border-white/5 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Admin</span>
            {activeItem && (
              <>
                <span className="text-slate-700">/</span>
                <span className={`font-semibold ${ACCENT_CLASSES[activeItem.accent].text}`}>
                  {activeItem.label}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest
                             bg-violet-500/15 text-violet-400 border border-violet-500/20 uppercase">
              Admin
            </span>
            <Link href="/dashboard"
              className="text-xs text-slate-500 hover:text-cyan-400 transition-colors px-2 py-1">
              ← Student View
            </Link>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-6 overflow-auto">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
}
