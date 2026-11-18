"use client";

import { useState } from "react";
import { cx } from "./ui";

/**
 * Plan call-to-action.
 *
 * Payment is not wired yet: the button says so plainly instead of pretending.
 * When checkout lands, this is the only component to change.
 */
export function PlanButton({
  planName,
  highlighted,
  current,
}: {
  planName: string;
  highlighted?: boolean;
  current?: boolean;
}) {
  const [clicked, setClicked] = useState(false);

  if (current) {
    return (
      <div className="flex h-11 w-full items-center justify-center rounded-xl border border-brand-400/40 bg-brand-500/10 text-[14px] font-medium text-brand-200">
        Ton offre actuelle
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setClicked(true)}
        className={cx(
          "h-11 w-full rounded-xl text-[14px] font-semibold transition-all active:scale-[0.99]",
          highlighted
            ? "bg-[linear-gradient(120deg,#34d399,#10b981)] text-ink-950 hover:brightness-110"
            : "border border-white/12 text-white hover:border-white/25 hover:bg-white/[0.04]",
        )}
      >
        Choisir {planName}
      </button>
      {clicked && (
        <p className="mt-2.5 text-center text-[12.5px] leading-relaxed text-gold-300" role="status">
          Le paiement en ligne ouvre très bientôt. Ton compte est prêt : tu seras prévenu en premier.
        </p>
      )}
    </div>
  );
}
