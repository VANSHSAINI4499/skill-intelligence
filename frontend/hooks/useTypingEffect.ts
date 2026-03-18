"use client";
/**
 * useTypingEffect.ts
 * ──────────────────
 * Simulates a character-by-character typewriter effect for AI responses.
 *
 * Usage:
 *   const displayed = useTypingEffect(fullText, { speed: 12, enabled: true });
 *
 * Parameters
 * ----------
 * text     — the full string to type out
 * speed    — characters revealed per tick (default 6, higher = faster)
 * enabled  — set false to skip animation and return text immediately
 *
 * Returns the progressively revealed substring, which grows each tick
 * until it equals the full text, then stays stable.
 */

import { useState, useEffect, useRef } from "react";

interface Options {
  speed?:   number;   // chars per tick  (default 6)
  tickMs?:  number;   // ms between ticks (default 20)
  enabled?: boolean;  // false → instant, no animation
}

export function useTypingEffect(
  text: string,
  { speed = 6, tickMs = 20, enabled = true }: Options = {},
): string {
  const [displayed, setDisplayed] = useState<string>(() =>
    enabled ? "" : text
  );
  const indexRef = useRef<number>(0);

  useEffect(() => {
    // Text changed (new message) → reset
    indexRef.current = 0;
    setDisplayed(enabled ? "" : text);

    if (!enabled || !text) return;

    const interval = setInterval(() => {
      indexRef.current = Math.min(indexRef.current + speed, text.length);
      setDisplayed(text.slice(0, indexRef.current));

      if (indexRef.current >= text.length) {
        clearInterval(interval);
      }
    }, tickMs);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, enabled]);

  return displayed;
}
