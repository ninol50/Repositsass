"use client";

import { useState } from "react";
import { cx } from "./ui";

export function CopyBlock({
  code,
  label,
  language = "bash",
}: {
  code: string;
  label?: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.09] bg-ink-950">
      {label && (
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2">
          <span className="font-mono text-[11.5px] text-ink-500">{label}</span>
          <span className="font-mono text-[11px] text-ink-600">{language}</span>
        </div>
      )}
      <pre className="overflow-x-auto px-4 py-3.5">
        <code className="font-mono text-[12.5px] leading-relaxed text-ink-200">{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label="Copier"
        className={cx(
          "absolute right-2.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] transition-all",
          label ? "top-11" : "top-2.5",
          copied
            ? "border-mint-500/40 bg-mint-500/15 text-mint-400"
            : "border-white/[0.1] bg-ink-900 text-ink-400 opacity-0 hover:text-white group-hover:opacity-100 focus-visible:opacity-100",
        )}
      >
        {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}
