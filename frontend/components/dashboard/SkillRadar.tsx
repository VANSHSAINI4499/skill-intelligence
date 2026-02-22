"use client";

import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Tooltip,
} from "recharts";
import { Sparkles } from "lucide-react";

interface SkillRadarProps {
  easy?: number;
  medium?: number;
  hard?: number;
  repos?: number;
  cgpa?: number;
}

export function SkillRadar({ easy = 0, medium = 0, hard = 0, repos = 0, cgpa = 0 }: SkillRadarProps) {
  // Normalise to 0-100 scale for radar display
  const data = [
    { skill: "Problem Solving", value: Math.min(Math.round(((easy + medium * 1.5 + hard * 3) / 200) * 100), 100) },
    { skill: "Hard Difficulty",  value: Math.min(Math.round((hard / 30) * 100), 100) },
    { skill: "Consistency",      value: Math.min(Math.round(((easy + medium) / 120) * 100), 100) },
    { skill: "Open Source",      value: Math.min(Math.round((repos / 20) * 100), 100) },
    { skill: "Academics",        value: Math.min(Math.round((cgpa / 10) * 100), 100) },
    { skill: "Medium Mastery",   value: Math.min(Math.round((medium / 80) * 100), 100) },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-violet-400" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Skill Balance Index
        </span>
        <span className="ml-auto text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full px-2 py-0.5">
          Phase 2
        </span>
      </div>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke="#1e293b" />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ fill: "#64748b", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: "#111827",
                border: "1px solid #1e293b",
                borderRadius: 8,
                color: "#f1f5f9",
                fontSize: 12,
              }}
            />
            <Radar
              name="Skill"
              dataKey="value"
              stroke="#7c3aed"
              fill="#7c3aed"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-800/40 border border-violet-500/20 rounded-lg px-3 py-2">
        <p className="text-xs text-slate-500 italic text-center">
          🤖 AI-powered skill recommendations are coming in Phase 2
        </p>
      </div>
    </div>
  );
}
