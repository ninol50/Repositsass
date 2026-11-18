"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "./ui";

/** How long the finger must stay on the print. */
const HOLD_MS = 1400;

/**
 * Press-and-hold fingerprint: the visitor seals their commitment.
 * Works with a finger, a mouse, and the keyboard (hold Space or Enter).
 */
export function Fingerprint({ done, onDone }: { done: boolean; onDone: () => void }) {
  const [progress, setProgress] = useState(done ? 1 : 0);
  const [holding, setHolding] = useState(false);
  const start = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = null;
    start.current = null;
    setHolding(false);
  }, []);

  const tick = useCallback(() => {
    if (start.current === null) return;
    const p = Math.min(1, (performance.now() - start.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      stop();
      try {
        navigator.vibrate?.(60);
      } catch {
        /* not supported */
      }
      onDone();
      return;
    }
    frame.current = requestAnimationFrame(tick);
  }, [onDone, stop]);

  const begin = useCallback(() => {
    if (done || start.current !== null) return;
    setHolding(true);
    start.current = performance.now() - progress * HOLD_MS;
    frame.current = requestAnimationFrame(tick);
  }, [done, progress, tick]);

  const release = useCallback(() => {
    if (done) return;
    stop();
    // Let go too early: the print drains back.
    setProgress(0);
  }, [done, stop]);

  useEffect(() => stop, [stop]);

  const circumference = 2 * Math.PI * 58;

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        aria-label={done ? "Engagement validé" : "Maintiens appuyé pour valider ton engagement"}
        aria-pressed={done}
        onPointerDown={(e) => {
          e.preventDefault();
          begin();
        }}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            begin();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") release();
        }}
        className={cx(
          "relative flex h-36 w-36 touch-none select-none items-center justify-center rounded-full transition-transform",
          holding && "scale-95",
          done ? "bg-brand-500/15" : "bg-white/[0.03]",
        )}
        style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128" aria-hidden>
          <circle cx="64" cy="64" r="58" stroke="rgba(255,255,255,0.08)" strokeWidth="4" fill="none" />
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke={done ? "#34d399" : "url(#fp-progress)"}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
          <defs>
            <linearGradient id="fp-progress" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#34d399" />
              <stop offset="1" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
        </svg>

        <span className="relative h-24 w-24 overflow-hidden">
          <svg
            viewBox="0 0 24 24"
            className={cx("h-24 w-24 transition-colors", done ? "text-brand-300" : holding ? "text-brand-200" : "text-ink-400")}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
            <path d="M2 12a10 10 0 0 1 18-6" />
            <path d="M2 16h.01" />
            <path d="M21.8 16c.2-2 .131-5.354 0-6" />
            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
            <path d="M8.65 22c.21-.66.45-1.32.57-2" />
            <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
          </svg>
          {holding && !done && (
            <span className="animate-scan absolute inset-x-0 top-0 h-0.5 bg-brand-300 shadow-[0_0_12px_2px_rgba(110,231,183,0.8)]" />
          )}
        </span>
      </button>

      <p className={cx("mt-4 text-[13px] font-medium", done ? "text-brand-300" : "text-ink-400")} aria-live="polite">
        {done ? "Engagement scellé ✓" : holding ? "Ne lâche pas…" : "Pose ton doigt et maintiens"}
      </p>
    </div>
  );
}
