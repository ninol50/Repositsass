"use client";

import { useState } from "react";
import { cx } from "./ui";

export function PromptActions({ markdown, fileName }: { markdown: string; fileName: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      // Clipboard API blocked (http, permissions): fall back to a selection copy.
      const el = document.createElement("textarea");
      el.value = markdown;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  function download() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      <button
        type="button"
        onClick={copy}
        className={cx(
          "inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-medium transition-all active:scale-[0.985]",
          copied
            ? "bg-mint-500/20 text-mint-400 ring-1 ring-mint-500/40"
            : "bg-white text-ink-950 hover:bg-ink-100",
        )}
      >
        {copied ? (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Copié — colle-le dans Claude Code
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copier le brief complet
          </>
        )}
      </button>

      <button
        type="button"
        onClick={download}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/12 px-5 text-[14px] text-white transition-colors hover:bg-white/[0.05]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        Télécharger .md
      </button>
    </div>
  );
}
