import type { Business } from "@/lib/businesses";
import { euros } from "@/lib/profile";
import { LockIcon, cx } from "./ui";

/**
 * A locked card receives no business at all — only its rank and fit — so its
 * name and content cannot be read from the page source or the RSC payload.
 */
export type BusinessCardProps =
  | { locked: true; rank: number; fit: number; unlockWith: string }
  | { locked: false; rank: number; fit: number; business: Business };

function FitBadge({ fit }: { fit: number }) {
  return (
    <span
      className={cx(
        "rounded-full border px-2.5 py-0.5 text-[12px] font-medium",
        fit >= 80
          ? "border-brand-400/40 text-brand-200"
          : fit >= 55
            ? "border-gold-400/40 text-gold-300"
            : "border-white/15 text-ink-300",
      )}
    >
      {fit}% compatible
    </span>
  );
}

export function BusinessCard(props: BusinessCardProps) {
  const { rank, fit } = props;

  if (props.locked) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[12px] text-ink-500">#{rank}</span>
          <FitBadge fit={fit} />
        </div>

        <div className="mt-4 space-y-2.5 select-none" aria-hidden>
          <span className="redacted w-2/3" style={{ height: 18 }} />
          <span className="redacted block w-full" />
          <span className="redacted block w-5/6" />
          <div className="flex gap-2 pt-2">
            <span className="redacted w-20" style={{ height: 22 }} />
            <span className="redacted w-24" style={{ height: 22 }} />
          </div>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-950/45 backdrop-blur-[2px]">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-400/35 bg-ink-950/80 text-gold-300 shadow-[0_0_24px_-4px_rgba(251,191,36,0.45)]">
            <LockIcon size={18} />
          </span>
          <p className="text-[12.5px] font-medium text-ink-200">Débloqué avec {props.unlockWith}</p>
        </div>
      </div>
    );
  }

  const b = props.business;
  return (
    <div className="rounded-2xl border border-brand-400/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(16,185,129,0.01))] p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[12px] text-brand-300">#{rank}</span>
        <FitBadge fit={fit} />
      </div>
      <h3 className="mt-3 font-display text-[19px] font-semibold tracking-tight text-white">{b.name}</h3>
      <p className="mt-1 text-[13.5px] text-brand-200">{b.tagline}</p>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-300">{b.description}</p>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Revenu réaliste", value: `${euros(b.revenueRange[0])} – ${euros(b.revenueRange[1])}` },
          { label: "Temps mini", value: `${b.minHoursPerDay} h / jour` },
          { label: "Budget de départ", value: b.startBudget === 0 ? "0 €" : euros(b.startBudget) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.07] bg-ink-950/60 px-2 py-2.5">
            <dt className="text-[11px] text-ink-500">{s.label}</dt>
            <dd className="mt-0.5 text-[12.5px] font-semibold text-white">{s.value}</dd>
          </div>
        ))}
      </dl>

      <ol className="mt-4 space-y-1.5">
        {b.steps.map((step, i) => (
          <li key={step} className="flex gap-2.5 text-[13px] text-ink-200">
            <span className="font-mono text-brand-400">{i + 1}.</span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
