import { OFFERS, TOTAL_BUSINESSES } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { PlanButton } from "./PlanButton";
import { CheckIcon, cx } from "./ui";

export function PricingCards({ currentPlan }: { currentPlan?: Plan }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {OFFERS.map((offer) => (
        <div
          key={offer.id}
          className={cx(
            "relative flex flex-col rounded-2xl border p-6",
            offer.highlighted
              ? "border-brand-400/50 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(16,185,129,0.02))] glow-brand"
              : "border-white/[0.08] bg-white/[0.025]",
          )}
        >
          {offer.highlighted && (
            <span className="absolute -top-3 left-6 rounded-full bg-brand-400 px-3 py-1 text-[11.5px] font-semibold text-ink-950">
              Le plus choisi
            </span>
          )}

          <p className="font-display text-[18px] font-semibold text-white">{offer.name}</p>
          <p className="mt-1 text-[13px] text-ink-400">{offer.tagline}</p>

          <p className="mt-5 flex items-baseline gap-1">
            <span className="font-display text-[40px] font-bold tracking-tight text-white">{offer.monthlyPrice} €</span>
            <span className="text-[14px] text-ink-400">/ mois</span>
          </p>

          <p className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-ink-950/60 px-3 py-1 text-[12.5px] text-ink-200">
            <span className="font-semibold text-brand-300">
              {offer.businessesUnlocked}/{TOTAL_BUSINESSES}
            </span>
            business débloqué{offer.businessesUnlocked > 1 ? "s" : ""}
          </p>

          <ul className="mt-5 flex-1 space-y-2.5">
            {offer.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-ink-200">
                <CheckIcon className="mt-[3px] shrink-0 text-brand-400" />
                {perk}
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <PlanButton planName={offer.name} highlighted={offer.highlighted} current={currentPlan === offer.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
