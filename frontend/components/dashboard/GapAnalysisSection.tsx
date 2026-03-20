"use client";

import { GapAnalysisData } from "@/models/types";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  TrendingUp,
  Target,
  Users,
  Zap,
  ChevronRight,
  BrainCircuit,
  Flag,
  Trophy,
  Award,
  BarChart3
} from "lucide-react";

interface GapAnalysisSectionProps {
  data: GapAnalysisData | null;
}

// ── Utility Functions ─────────────────────────────────────────────────────────

// Grade ladder mapping: current grade → target grade
const GRADE_LADDER: Record<string, string> = {
  F: "D",
  D: "C",
  C: "B",
  B: "A",
  A: "A",
};

// Grade color configuration matching GradeBadge.tsx
const GRADE_COLORS: Record<string, string> = {
  A: "emerald",
  B: "blue",
  C: "amber",
  D: "red",
  F: "rose",
};

function getTargetGrade(currentGrade: string): string {
  return GRADE_LADDER[currentGrade] || "C";
}

function calculatePercentile(studentScore: number, batchAverage: number): number {
  if (batchAverage === 0) return 50.0;

  // Formula from backend knowledge_gap_engine.py
  const percentile = 50 + (studentScore - batchAverage) / batchAverage * 50;
  return Math.max(0, Math.min(100, Math.round(percentile)));
}

function getPercentileBadgeColor(percentile: number): string {
  if (percentile >= 75) return "emerald";
  if (percentile >= 50) return "amber";
  if (percentile >= 25) return "orange";
  return "rose";
}

function getGroupStatusBadge(groupGap: number): { label: string; color: string } {
  if (groupGap >= 1) {
    return { label: "Above Group Avg", color: "emerald" };
  } else if (groupGap <= -1) {
    return { label: "Below Group Avg", color: "rose" };
  } else {
    return { label: "At Group Avg", color: "amber" };
  }
}

function getBatchStatusBadge(batchGap: number): { label: string; color: string } {
  if (batchGap > 5) {
    return { label: "Above Batch Avg", color: "emerald" };
  } else if (batchGap < -5) {
    return { label: "Far Below Batch", color: "rose" };
  } else {
    return { label: "Close to Batch Avg", color: "amber" };
  }
}

function getEnhancedAiSummary(
  studentScore: number,
  group: string,
  groupAverage: number,
  batchAverage: number,
  groupGap: number,
  batchGap: number,
  percentile: number
): string {
  // Part 1: Group comparison (PRIMARY, fair context)
  let groupText = "";
  if (groupGap >= 1) {
    groupText = `You are performing well above your ${group}-grade peers, leading them by ${Math.abs(groupGap).toFixed(1)} points. This shows strong fundamentals in your current skill bracket.`;
  } else if (groupGap <= -1) {
    groupText = `You are currently trailing your ${group}-grade peers by ${Math.abs(groupGap).toFixed(1)} points. Focusing on group-level concepts will help you catch up with your immediate cohort.`;
  } else {
    groupText = `You are right on track with your ${group}-grade peers, matching the group average. This is a stable foundation to build upon.`;
  }

  // Part 2: Batch comparison (SECONDARY, aspirational)
  let batchText = "";
  if (batchGap > 5) {
    batchText = `You're also excelling compared to the entire batch, placing you in the ${percentile}th percentile. Keep challenging yourself with advanced topics to maintain this edge.`;
  } else if (batchGap >= -5) {
    batchText = `Compared to the full batch, you're ${batchGap >= 0 ? "at" : "near"} the average (${percentile}th percentile). With focused effort, you can climb the batch rankings.`;
  } else {
    batchText = `Looking at the broader batch, there's room for growth — you're currently in the ${percentile}th percentile, ${Math.abs(batchGap).toFixed(1)} points below the batch average.`;
  }

  // Part 3: Contextual advice (based on BOTH gaps)
  let advice = "";
  if (groupGap >= 1 && batchGap >= 0) {
    // Excelling in both
    advice = "Since you've mastered your group's benchmarks and are above batch standards, focus on deepening expertise in advanced topics and contributing to peer learning.";
  } else if (groupGap >= 1 && batchGap < 0) {
    // Good in group, but batch gap exists
    advice = "You're strong within your group — now it's time to target batch-level challenges. Study higher-grade topics and solve problems from students in A/B grades.";
  } else if (groupGap < 0 && batchGap < 0) {
    // Below in both
    advice = "Start by consolidating fundamentals to match your group average first. Once stable, progressively target batch-level competencies. Small, consistent wins matter.";
  } else if (groupGap < 0 && batchGap >= 0) {
    // Unusual case: below group but above batch (rare)
    advice = "Your overall score is strong, but there's specific room for improvement within your grade bracket. Review group-specific concepts to round out your profile.";
  } else {
    // At group average, below batch
    advice = "Strengthen group-level skills first to build confidence, then gradually expand into batch-level challenges. Consistent practice is key.";
  }

  return `${groupText} ${batchText} ${advice}`;
}

function generateShortTermActions(
  group: string,
  groupGap: number,
  targetGrade: string
): string[] {
  const absGap = Math.abs(groupGap).toFixed(1);

  if (groupGap >= 1) {
    // Already above group average
    return [
      `You're leading Group ${group}. Maintain your edge by reviewing recent challenging problems.`,
      `Help peers in your group by participating in code reviews or study groups.`,
      `Prepare for transition to Grade ${targetGrade} topics to stay ahead of the curve.`,
    ];
  } else if (groupGap >= -2) {
    // Close to group average
    return [
      `You're within ${absGap} points of the Group ${group} average. Close this small gap with daily practice.`,
      `Focus on core concepts commonly tested in Group ${group} assessments.`,
      `Target your weakest topic from recent submissions to make quick gains.`,
    ];
  } else {
    // Significantly below group average
    return [
      `Bridge the ${absGap}-point gap by mastering Group ${group} fundamentals systematically.`,
      `Analyze your last 5 submissions to identify patterns in mistakes.`,
      `Dedicate 30-45 minutes daily to medium-difficulty problems in your weak topics.`,
    ];
  }
}

function generateLongTermActions(
  batchGap: number,
  batchAverage: number,
  targetGrade: string,
  currentGrade: string
): string[] {
  const absGap = Math.abs(batchGap).toFixed(1);

  if (batchGap > 5) {
    // Above batch average
    return [
      `You're in the top tier. Set a goal to reach the top 10% by tackling Grade ${targetGrade === "A" ? "A" : targetGrade} level problems.`,
      `Contribute to open-source projects to build real-world application skills.`,
      `Mentor students from lower grades to reinforce your own knowledge.`,
    ];
  } else if (batchGap >= -5) {
    // Near batch average
    return [
      `Target Grade ${targetGrade} standards by solving ${targetGrade}-level problems 3x per week.`,
      `Aim for a consistent ${batchAverage.toFixed(0)}+ score in upcoming assessments.`,
      `Build a project portfolio showcasing skills aligned with batch standards.`,
    ];
  } else {
    // Below batch average
    return [
      `Close the ${absGap}-point gap to batch average with a structured 6-week learning plan.`,
      `Master Grade ${currentGrade} topics first, then progressively tackle Grade ${targetGrade} material.`,
      `Track weekly progress: aim for +2 points improvement per week through focused practice.`,
    ];
  }
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

  // Calculate enhanced metrics
  const percentile = calculatePercentile(studentScore, batchAverage);
  const currentGrade = group;
  const targetGrade = getTargetGrade(currentGrade);
  const groupStatus = getGroupStatusBadge(groupGap);
  const batchStatus = getBatchStatusBadge(batchGap);

  // Generate dynamic action items
  const shortTermActions = generateShortTermActions(group, groupGap, targetGrade);
  const longTermActions = generateLongTermActions(batchGap, batchAverage, targetGrade, currentGrade);

  // Enhanced AI summary
  const aiSummary = getEnhancedAiSummary(
    studentScore,
    group,
    groupAverage,
    batchAverage,
    groupGap,
    batchGap,
    percentile
  );

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
          group={group}
        />
      </div>

      {/* Row 2: Smart Badges Section (NEW) */}
      <SmartBadgesRow
        currentGrade={currentGrade}
        targetGrade={targetGrade}
        percentile={percentile}
        groupStatus={groupStatus}
        batchStatus={batchStatus}
      />

      {/* Row 3: Visual Tracker & Summary */}
      <div className="bg-[#111827]/80 backdrop-blur-md border border-slate-800/70 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Zap size={80} className="text-white" />
        </div>
        
        <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-10">
          Relative Performance Positioning
        </h4>

        {/* The Progress Bar Container - Enhanced */}
        <div className="relative h-8 flex items-center mb-16 px-4">
          {/* Background track */}
          <div className="absolute inset-0 h-2 top-3 bg-slate-800/50 rounded-full w-full self-center" />
          <div className="absolute inset-0 h-2 top-3 bg-linear-to-r from-rose-500/20 via-amber-500/20 to-emerald-500/20 rounded-full w-full self-center" />

          {/* Markers - Enhanced */}
          <EnhancedPositionMarker
            label="Batch Avg"
            value={batchAverage}
            color="bg-blue-500"
            pos={batchAverage}
            max={100}
          />
          <EnhancedPositionMarker
            label={`Group ${group} Avg`}
            value={groupAverage}
            color="bg-amber-500"
            pos={groupAverage}
            max={100}
          />
          <EnhancedPositionMarker
            label="You"
            value={studentScore}
            color="bg-white"
            isPrimary
            pos={studentScore}
            pulse
            max={100}
          />
        </div>

        {/* AI Summary Text - Enhanced */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
              groupGap >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}>
              {groupStatus.label}
            </span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
              batchStatus.color === "emerald" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
              batchStatus.color === "amber" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
              "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}>
              {batchStatus.label}
            </span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">
            {aiSummary}
          </p>
        </div>
      </div>

      {/* Row 4: Actionable Insights - Dynamic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActionPanel
          title={`Short-term: Beat Group ${group}`}
          badge="Peers"
          colorTheme="amber"
          icon={<Zap size={16} />}
          items={shortTermActions}
        />
        <ActionPanel
          title="Long-term: Reach Batch Average"
          badge="Standards"
          colorTheme="blue"
          icon={<Flag size={16} />}
          items={longTermActions}
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

function GapSplitCard({ groupGap, batchGap, group }: any) {
  const gBehind = groupGap < 0;
  const bBehind = batchGap < 0;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-gradient-to-br from-[#111827] to-[#0f172a] border border-slate-800/70 rounded-2xl p-5 flex flex-col justify-between h-32 relative overflow-hidden group shadow-lg"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
          Gap Analysis
        </span>
        <div className="p-1.5 rounded-lg bg-slate-800/50 text-violet-400">
          <TrendingUp size={18} />
        </div>
      </div>

      {/* PRIMARY: Group Gap - LARGER */}
      <div className="flex flex-col mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase">
            Group {group} Gap
          </span>
          <span className="text-[8px] text-violet-400 uppercase tracking-wider">
            PRIMARY
          </span>
        </div>
        <span className={`text-3xl font-black ${gBehind ? "text-rose-400" : "text-emerald-400"}`}>
          {groupGap >= 0 ? "+" : ""}{groupGap.toFixed(1)}
        </span>
      </div>

      {/* SECONDARY: Batch Gap - smaller */}
      <div className="flex items-baseline justify-between border-t border-slate-800/50 pt-2">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-600 font-bold uppercase">
            Batch Gap
          </span>
          <span className={`text-lg font-bold ${bBehind ? "text-rose-400/70" : "text-emerald-400/70"}`}>
            {batchGap >= 0 ? "+" : ""}{batchGap.toFixed(1)}
          </span>
        </div>
        <span className="text-[8px] text-slate-600 uppercase tracking-wider">
          ASPIRATIONAL
        </span>
      </div>
    </motion.div>
  );
}

function EnhancedPositionMarker({ label, value, color, pos, max, isPrimary, pulse }: any) {
  const [showTooltip, setShowTooltip] = useState(false);
  const percentage = Math.min(Math.max((pos / max) * 100, 5), 95);
  const left = `${percentage}%`;

  return (
    <div
      className="absolute transition-all duration-1000 ease-out z-20 cursor-pointer"
      style={{ left }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="relative flex flex-col items-center">
        {/* Enhanced Label - larger for primary */}
        <div className={`absolute -top-12 whitespace-nowrap font-bold uppercase tracking-widest ${
          isPrimary
            ? "text-white text-[11px]"
            : "text-slate-500 text-[10px]"
        }`}>
          {label}
        </div>

        {/* Tooltip on hover */}
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl z-50"
          >
            <p className="text-xs text-white font-semibold">{label}</p>
            <p className="text-sm text-cyan-400 font-mono font-bold">{value.toFixed(2)}</p>
          </motion.div>
        )}

        {/* Enhanced marker dot - larger for primary */}
        <div className={`rounded-full border-2 border-[#0B1120] ${color} shadow-lg ${
          isPrimary ? "w-5 h-5 ring-2 ring-white/30" : "w-4 h-4"
        }`}>
          {pulse && <div className={`absolute inset-0 rounded-full ${color} animate-ping opacity-75`} />}
        </div>

        {/* Value below - enhanced */}
        <div className={`absolute top-8 font-mono ${
          isPrimary
            ? "text-cyan-400 font-bold text-xs"
            : "text-slate-600 text-[11px]"
        }`}>
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

// ── Smart Badge Components ────────────────────────────────────────────────────

function SmartBadge({ label, icon, colorTheme }: {
  label: string;
  icon: React.ReactNode;
  colorTheme: "emerald" | "amber" | "rose" | "blue" | "orange" | "red";
}) {
  const themeClasses: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`
        px-3 py-2 rounded-lg border flex items-center gap-2
        text-xs font-bold uppercase tracking-tight
        ${themeClasses[colorTheme]}
      `}
    >
      {icon}
      <span>{label}</span>
    </motion.div>
  );
}

function SmartBadgesRow({
  currentGrade,
  targetGrade,
  percentile,
  groupStatus,
  batchStatus,
}: {
  currentGrade: string;
  targetGrade: string;
  percentile: number;
  groupStatus: { label: string; color: string };
  batchStatus: { label: string; color: string };
}) {
  const percentileColor = getPercentileBadgeColor(percentile);
  const currentGradeColor = (GRADE_COLORS[currentGrade] || "blue") as any;
  const targetGradeColor = (GRADE_COLORS[targetGrade] || "emerald") as any;

  // Special case: if already at A-grade
  const targetLabel = currentGrade === "A" ? "Maintaining Excellence" : `Targeting ${targetGrade}`;

  return (
    <div className="bg-[#111827]/60 backdrop-blur-md border border-slate-800/50 rounded-2xl p-5">
      <h4 className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-4">
        Smart Performance Tags
      </h4>
      <div className="flex flex-wrap gap-3">
        <SmartBadge
          label={`Grade ${currentGrade}`}
          icon={<Trophy size={14} />}
          colorTheme={currentGradeColor}
        />
        <SmartBadge
          label={targetLabel}
          icon={<Target size={14} />}
          colorTheme={targetGradeColor}
        />
        <SmartBadge
          label={`${percentile}th Percentile`}
          icon={<BarChart3 size={14} />}
          colorTheme={percentileColor}
        />
        <SmartBadge
          label={groupStatus.label}
          icon={<Users size={14} />}
          colorTheme={groupStatus.color as any}
        />
        <SmartBadge
          label={batchStatus.label}
          icon={<Award size={14} />}
          colorTheme={batchStatus.color as any}
        />
      </div>
    </div>
  );
}
