"use client";

import { useEffect, useState } from "react";

/** Counts from 0 to `to` in about a second, then shows "≈ 1 768 €". */
export function CountUp({ to, className, durationMs = 1100 }: { to: number; className?: string; durationMs?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(to * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [to, durationMs]);

  return (
    <span className={className} aria-label={`environ ${to.toLocaleString("fr-FR")} euros`}>
      ≈ {value.toLocaleString("fr-FR")} €
    </span>
  );
}
