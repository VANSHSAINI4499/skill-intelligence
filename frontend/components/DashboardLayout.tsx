import React from 'react';
import { User, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import Link from 'next/link';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: 'student' | 'admin';
  userName?: string;
  onLogout: () => void;
}

export function DashboardLayout({ children, userRole, userName, onLogout }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-800">SkillIntelligence</h1>
        </div>
        
        <nav className="p-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors">
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>

          {userRole === 'admin' && (
            <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors">
              <Shield size={20} />
              <span className="font-medium">Admin</span>
            </Link>
          )}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-100">
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="text-sm text-slate-500">
            Welcome back, <span className="font-semibold text-slate-800">{userName}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              userRole === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {userRole?.toUpperCase()}
            </span>
            <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
              <User size={16} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
