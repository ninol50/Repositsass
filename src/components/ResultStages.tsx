"use client";

import { useState, type ReactNode } from "react";
import { cx } from "./ui";

/**
 * Two-step result: the site first, the prompt second.
 *
 * Both halves are rendered on the server and handed over as nodes — this
 * component only decides which one is on screen. Nothing gated is computed here.
 */
export function ResultStages({
  preview,
  prompt,
  continueLabel,
  continueHint,
}: {
  preview: ReactNode;
  prompt: ReactNode;
  continueLabel: string;
  continueHint: string;
}) {
  const [stage, setStage] = useState<"preview" | "prompt">("preview");

  return (
    <div>
      <div className="mt-8 flex items-center gap-2">
        {(["preview", "prompt"] as const).map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(s)}
            className={cx(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12.5px] transition-colors",
              stage === s ? "bg-white/[0.08] text-white" : "text-ink-500 hover:text-white",
            )}
          >
            <span
              className={cx(
                "flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px]",
                stage === s ? "bg-brand-500 text-white" : "border border-white/15 text-ink-500",
              )}
              style={{ height: 18, width: 18 }}
            >
              {i + 1}
            </span>
            {s === "preview" ? "Ton site" : "Ton prompt"}
          </button>
        ))}
      </div>

      {stage === "preview" ? (
        <div className="animate-rise">
          {preview}

          <div className="mt-8 flex flex-col items-end gap-2 border-t border-white/[0.07] pt-7">
            <button
              type="button"
              onClick={() => {
                setStage("prompt");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="h-12 rounded-xl bg-[linear-gradient(120deg,#8f6fff,#6a45f5)] px-7 text-[14.5px] font-medium text-white transition-all hover:brightness-110 active:scale-[0.985]"
            >
              {continueLabel} →
            </button>
            <p className="text-[12.5px] text-ink-500">{continueHint}</p>
          </div>
        </div>
      ) : (
        <div className="animate-rise">
          <button
            type="button"
            onClick={() => {
              setStage("preview");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="mt-6 text-[13px] text-ink-400 transition-colors hover:text-white"
          >
            ← Revoir mon site
          </button>
          {prompt}
        </div>
      )}
    </div>
  );
}
