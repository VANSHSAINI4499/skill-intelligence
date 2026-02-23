"use client";

import { motion } from "framer-motion";
import { ExternalLink, Star, GitBranch, PackageOpen } from "lucide-react";
import { TopRepository } from "@/models/types";

interface TopRepositoriesCardProps {
  repositories?: TopRepository[];
}

// Canonical color map for well-known languages (shared with GithubPulseCard)
const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript:  "#f7df1e",
  TypeScript:  "#3178c6",
  Python:      "#3572a5",
  Java:        "#b07219",
  "C++":       "#f34b7d",
  "C#":        "#178600",
  C:           "#555555",
  Go:          "#00add8",
  Rust:        "#dea584",
  PHP:         "#4f5d95",
  Ruby:        "#701516",
  Kotlin:      "#a97bff",
  Swift:       "#ff6b35",
  Dart:        "#00b4ab",
  HTML:        "#e34c26",
  CSS:         "#563d7c",
  Shell:       "#89e051",
  Vue:         "#41b883",
  Svelte:      "#ff3e00",
};

const FALLBACK_PALETTE = [
  "#06b6d4", "#7c3aed", "#f97316", "#10b981",
  "#ec4899", "#0ea5e9", "#a78bfa", "#34d399",
];

const getLangColor = (lang: string | null | undefined, idx: number): string => {
  if (!lang) return "#64748b";
  return LANGUAGE_COLORS[lang] ?? FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
};

const rowVariants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
};

export function TopRepositoriesCard({ repositories = [] }: TopRepositoriesCardProps) {
  const isEmpty = repositories.length === 0;

  return (
    <div className="flex flex-col gap-3 h-full">
      {isEmpty ? (
        <div
          className="flex flex-col items-center justify-center flex-1 gap-3 min-h-[200px]
                     rounded-xl border border-dashed border-slate-700/60 bg-slate-800/20"
        >
          <PackageOpen size={28} className="text-slate-600" />
          <p className="text-sm text-slate-500 font-medium">No repositories found</p>
          <p className="text-xs text-slate-600">Run Analyze to fetch your top GitHub repos</p>
        </div>
      ) : (
        <motion.ul
          variants={{ show: { transition: { staggerChildren: 0.09 } } }}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-2"
        >
          {repositories.map((repo, i) => {
            const color = getLangColor(repo.language, i);
            return (
              <motion.li
                key={repo.html_url}
                variants={rowVariants}
                whileHover={{
                  scale: 1.018,
                  transition: { duration: 0.15 },
                }}
                className="
                  group relative flex items-center gap-3 rounded-xl
                  bg-white/[0.03] backdrop-blur-xl
                  border border-slate-700/40
                  px-4 py-3
                  hover:border-cyan-500/30
                  hover:bg-white/[0.06]
                  hover:shadow-[0_0_24px_rgba(6,182,212,0.09)]
                  transition-all duration-200 overflow-hidden
                "
              >
                {/* Animated gradient left-border accent on hover */}
                <span
                  className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl opacity-0
                             group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(to bottom, ${color}, transparent)`,
                  }}
                />

                {/* Rank number */}
                <span className="text-xs font-bold text-slate-600 w-5 text-center flex-shrink-0 select-none">
                  {i + 1}
                </span>

                {/* Repo icon + name */}
                <GitBranch size={13} className="text-slate-600 flex-shrink-0" />

                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="
                    flex-1 min-w-0 text-sm font-semibold text-slate-100
                    hover:text-cyan-300 transition-colors truncate
                    flex items-center gap-1.5
                  "
                >
                  <span className="truncate">{repo.name}</span>
                  <ExternalLink
                    size={11}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-500"
                  />
                </a>

                {/* Language pill */}
                {repo.language && (
                  <span
                    className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{
                      color,
                      borderColor: `${color}40`,
                      background:  `${color}18`,
                    }}
                  >
                    {repo.language}
                  </span>
                )}

                {/* Stars badge */}
                <span
                  className="
                    flex items-center gap-1 text-xs font-semibold flex-shrink-0
                    bg-amber-400/10 border border-amber-400/20
                    text-amber-400 rounded-full px-2 py-0.5
                  "
                >
                  <Star size={10} />
                  {repo.stars}
                </span>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}
