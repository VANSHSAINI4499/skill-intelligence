"use client";

import { GapAnalysisData } from "@/models/types";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Target, 
  Users, 
  Zap, 
  ChevronRight,
  BrainCircuit,
  Flag
} from "lucide-react";

interface GapAnalysisSectionProps {
  data: GapAnalysisData | null;
}

/**
 * GapAnalysisSection — High-fidelity performance insights component.
 * Provides group-wise and batch-wise comparisons with a premium dark theme.
 */
export function GapAnalysisSection({ data }: GapAnalysisSectionProps) {
  if (!data) return null;

  const {
    studentScore,
    group,
    groupAverage,
    batchAverage,
    groupGap,
    batchGap,
    groupStudentCount,
    batchStudentCount
  } = data;

  const groupStatus = groupGap >= 0 ? "Above" : Math.abs(groupGap) < 1 ? "Near" : "Below";
  const batchStatus = batchGap >= -5 ? "Close to" : "Trailing";

  // AI-like summary generator
  const getAiSummary = () => {
    const groupText = groupGap >= 0 
      ? `You are currently outperforming your ${group}-grade peers by ${groupGap.toFixed(1)} points.`
      : Math.abs(groupGap) < 2
      ? `You are tracking closely with your ${group}-grade peers, missing the group average by just ${Math.abs(groupGap).toFixed(1)} points.`
      : `You are currently below the average for your ${group}-grade group by ${Math.abs(groupGap).toFixed(1)} points.`;

    const batchText = batchGap >= 0
      ? `Remarkably, you are also above the entire batch average, placing you in the top tier of students.`
      : `Compared to the overall batch standards, you are trailing by ${Math.abs(batchGap).toFixed(1)} points.`;

    const advice = groupGap < 0 
      ? "Focus on mastering Group-level topics first to consolidate your standing."
      : "Since you've mastered your Group's benchmarks, shift your focus to high-difficulty Batch-level challenges.";

    return `${groupText} ${batchText} ${advice}`;
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <BrainCircuit className="text-violet-400" size={18} />
        </div>
        <div>
          <h3 className="font-bold text-white text-base">Performance Intelligence</h3>
          <p className="text-xs text-slate-500 mt-0.5">Dual-layer comparison vs Group {group} and the full Batch</p>
        </div>
      </div>

      {/* Row 1: Metrics Quad */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Your Score" 
          value={studentScore} 
          icon={<TrendingUp size={16} />} 
          color="text-cyan-400"
          glow="shadow-cyan-500/10"
        />
        <MetricCard 
          title={`Group ${group} Avg`} 
          value={groupAverage} 
          icon={<Users size={16} />} 
          color="text-amber-400"
          subtitle={`${groupStudentCount} peers`}
        />
        <MetricCard 
          title="Batch Avg" 
          value={batchAverage} 
          icon={<Target size={16} />} 
          color="text-blue-400"
          subtitle={`${batchStudentCount} peers`}
        />
        <GapSplitCard 
          groupGap={groupGap} 
          batchGap={batchGap} 
        />
      </div>

      {/* Row 2: Visual Tracker & Summary */}
      <div className="bg-[#111827]/80 backdrop-blur-md border border-slate-800/70 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Zap size={80} className="text-white" />
        </div>
        
        <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-10">
          Relative Performance Positioning
        </h4>

        {/* The Progress Bar Container */}
        <div className="relative h-6 flex items-center mb-14 px-4">
           {/* Background track */}
          <div className="absolute inset-0 h-2 top-2 bg-slate-800/50 rounded-full w-full self-center" />
          <div className="absolute inset-0 h-2 top-2 bg-linear-to-r from-rose-500/20 via-amber-500/20 to-emerald-500/20 rounded-full w-full self-center" />
          
          {/* Markers */}
          <PositionMarker 
            label="Batch Avg" 
            value={batchAverage} 
            color="bg-blue-500" 
            pos={batchAverage} 
            max={100}
          />
          <PositionMarker 
            label={`Group ${group} Avg`} 
            value={groupAverage} 
            color="bg-amber-500" 
            pos={groupAverage} 
            max={100}
          />
          <PositionMarker 
            label="You" 
            value={studentScore} 
            color="bg-white" 
            isPrimary 
            pos={studentScore} 
            pulse
            max={100}
          />
        </div>

        {/* AI Summary Text */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
              groupGap >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}>
              {groupStatus} Group Average
            </span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
              batchGap >= -5 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}>
              {batchStatus} Batch Standard
            </span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">
            {getAiSummary()}
          </p>
        </div>
      </div>

      {/* Row 3: Actionable Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActionPanel 
          title={`Short-term: Beat Group ${group}`} 
          badge="Peers"
          colorTheme="amber"
          icon={<Zap size={16} />}
          items={[
            "Analyze missed questions in the last Peer Review session",
            `Master core concepts to bridge the remaining ${Math.abs(groupGap).toFixed(1)} points`,
            "Practice medium-difficulty exercises frequently used in Group D"
          ]}
        />
        <ActionPanel 
          title="Long-term: Reach Batch Average" 
          badge="Standards"
          colorTheme="blue"
          icon={<Flag size={16} />}
          items={[
            "Dedicate 1 hour daily to Advanced Data Structures (Batch standard)",
            "Aim for a consistent 45+ score in mock assessments",
            "Solve top-ranked problems from previous semester batches"
          ]}
        />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ title, value, icon, color, subtitle, glow = "" }: any) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className={`bg-[#111827] border border-slate-800/70 rounded-2xl p-4 flex flex-col justify-between h-28 relative overflow-hidden group ${glow}`}
    >
      <div className="flex justify-between items-start">
        <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">{title}</span>
        <div className={`p-1.5 rounded-lg bg-slate-800/50 ${color}`}>{icon}</div>
      </div>
      <div className="mt-1">
        <div className={`text-2xl font-black text-white ${color}`}>{value.toFixed(2)}</div>
        {subtitle && <div className="text-[10px] text-slate-600 font-medium">{subtitle}</div>}
      </div>
    </motion.div>
  );
}

function GapSplitCard({ groupGap, batchGap }: any) {
  const gBehind = groupGap < 0;
  const bBehind = batchGap < 0;

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-[#111827] border border-slate-800/70 rounded-2xl p-4 flex flex-col justify-between h-28 relative overflow-hidden group"
    >
      <div className="flex justify-between items-start">
        <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Gap Analysis</span>
        <div className="p-1.5 rounded-lg bg-slate-800/50 text-slate-400"><TrendingUp size={16} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1 -ml-1">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Group Gap</span>
          <span className={`text-base font-black ${gBehind ? "text-rose-400" : "text-emerald-400"}`}>
            {groupGap >= 0 ? "+" : ""}{groupGap.toFixed(1)}
          </span>
        </div>
        <div className="flex flex-col border-l border-slate-800 pl-3">
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Batch Gap</span>
          <span className={`text-base font-black ${bBehind ? "text-rose-400" : "text-emerald-400"}`}>
            {batchGap >= 0 ? "+" : ""}{batchGap.toFixed(1)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function PositionMarker({ label, value, color, pos, max, isPrimary, pulse }: any) {
  const percentage = Math.min(Math.max((pos / max) * 100, 5), 95);
  const left = `${percentage}%`;
  
  return (
    <div 
      className="absolute transition-all duration-1000 ease-out z-20"
      style={{ left }}
    >
      <div className="relative flex flex-col items-center">
        {/* Label above */}
        <div className={`absolute -top-10 whitespace-nowrap text-[9px] font-bold uppercase tracking-widest ${isPrimary ? "text-white" : "text-slate-500"}`}>
          {label}
        </div>
        
        {/* The dot */}
        <div className={`w-3.5 h-3.5 rounded-full border-2 border-[#0B1120] ${color} shadow-lg`}>
          {pulse && <div className={`absolute inset-0 rounded-full ${color} animate-ping opacity-75`} />}
        </div>
        
        {/* Value below */}
        <div className={`absolute top-6 font-mono text-[10px] ${isPrimary ? "text-cyan-400 font-bold" : "text-slate-600"}`}>
          {value.toFixed(1)}
        </div>
      </div>
    </div>
  );
}

function ActionPanel({ title, badge, colorTheme, icon, items }: any) {
  const themes: any = {
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20"
  };

  const iconColors: any = {
    amber: "text-amber-400",
    blue: "text-blue-400"
  };

  return (
    <div className="bg-[#111827] border border-slate-800/70 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${themes[colorTheme].split(' ')[0]} ${iconColors[colorTheme]}`}>
            {icon}
          </div>
          <h5 className="text-white font-bold text-sm tracking-tight">{title}</h5>
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase border ${themes[colorTheme]}`}>
          {badge}
        </span>
      </div>
      <ul className="space-y-3">
        {items.map((item: string, i: number) => (
          <li key={i} className="flex items-start gap-2.5 group">
            <div className="mt-1 shrink-0">
              <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
