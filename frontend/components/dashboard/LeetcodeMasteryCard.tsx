"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

interface LeetcodeMasteryCardProps {
  easy?: number;
  medium?: number;
  hard?: number;
}

const COLORS = {
  Easy: "#4ade80",
  Medium: "#fbbf24",
  Hard: "#f87171",
};

export function LeetcodeMasteryCard({ easy = 0, medium = 0, hard = 0 }: LeetcodeMasteryCardProps) {
  const total = easy + medium + hard;
  const easyPct  = total ? Math.round((easy / total) * 100) : 0;
  const medPct   = total ? Math.round((medium / total) * 100) : 0;
  const hardPct  = total ? Math.round((hard / total) * 100) : 0;

  const chartData = [
    { name: "Easy",   count: easy,   fill: COLORS.Easy },
    { name: "Medium", count: medium, fill: COLORS.Medium },
    { name: "Hard",   count: hard,   fill: COLORS.Hard },
  ];

  const getInsight = () => {
    if (hard > 15)   return "Elite tier â€” strong performance in Hard problems.";
    if (medium > 50) return "Strong consistency in Medium difficulty problems.";
    if (easy > 30)   return "Solid foundation â€” keep pushing towards Medium/Hard.";
    return "Getting started â€” every solved problem counts.";
  };

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Total + segmented bar */}
      <div>
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider">Total Solved</span>
            <motion.div
              className="text-5xl font-extrabold bg-linear-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {total}
            </motion.div>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Easy {easy}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Medium {medium}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Hard {hard}</span>
          </div>
        </div>

        {/* Segmented bar */}
        <div className="h-3 rounded-full overflow-hidden flex gap-0.5 bg-slate-800">
          {easyPct > 0 && (
            <motion.div
              className="h-full bg-green-400 rounded-l-full"
              initial={{ width: 0 }}
              animate={{ width: `${easyPct}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          )}
          {medPct > 0 && (
            <motion.div
              className="h-full bg-yellow-400"
              initial={{ width: 0 }}
              animate={{ width: `${medPct}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          )}
          {hardPct > 0 && (
            <motion.div
              className="h-full bg-red-400 rounded-r-full"
              initial={{ width: 0 }}
              animate={{ width: `${hardPct}%` }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />
          )}
        </div>
      </div>

      {/* Recharts BarChart */}
      <div className="flex-1 min-h-30">
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={chartData} barSize={40}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "#111827",
                border: "1px solid #1e293b",
                borderRadius: 8,
                color: "#f1f5f9",
                fontSize: 12,
              }}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insight */}
      <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg px-3 py-2">
        <p className="text-xs text-slate-400 italic">
          ðŸ’¡ {getInsight()}
        </p>
      </div>
    </div>
  );
}
