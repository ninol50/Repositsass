import { BEST_VALUE, OFFERS, formatPrice, type PlanOffer } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { PlanButton } from "./PlanButton";
import { CheckIcon, cx } from "./ui";

export function OfferCard({
  offer,
  promo = false,
  current = false,
  featured = false,
  badge,
  launchNote = false,
}: {
  offer: PlanOffer;
  /** True only while a just-generated plan's launch offer is still running. */
  promo?: boolean;
  current?: boolean;
  featured?: boolean;
  badge?: string;
  /** Public pages: say how to get the launch price. */
  launchNote?: boolean;
}) {
  return (
    <div
      className={cx(
        "relative flex flex-col rounded-2xl border p-6",
        featured
          ? "border-brand-400/50 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(16,185,129,0.02))] glow-brand"
          : "border-white/[0.08] bg-white/[0.025]",
      )}
    >
      {badge && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand-400 px-3 py-1 text-[11.5px] font-semibold text-ink-950">
          {badge}
        </span>
      )}

      <p className="font-display text-[18px] font-semibold text-white">{offer.name}</p>
      <p className="mt-1 text-[13px] text-ink-400">{offer.tagline}</p>

      {promo ? (
        <div className="mt-5">
          <p className="flex items-baseline gap-2">
            <span className="whitespace-nowrap font-display text-[40px] font-bold tracking-tight text-white">
              {formatPrice(offer.launchPrice)}
            </span>
            <span className="text-[16px] text-ink-500 line-through">{formatPrice(offer.monthlyPrice)}</span>
          </p>
          <p className="mt-1 text-[12.5px] font-medium text-gold-300">
            le premier mois, puis {formatPrice(offer.monthlyPrice)} / mois
          </p>
        </div>
      ) : (
        <p className="mt-5 flex items-baseline gap-1">
          <span className="whitespace-nowrap font-display text-[40px] font-bold tracking-tight text-white">{offer.monthlyPrice} €</span>
          <span className="text-[14px] text-ink-400">/ mois</span>
        </p>
      )}
      {!promo && launchNote && (
        <p className="mt-1 text-[12.5px] text-gold-300">
          {formatPrice(offer.launchPrice)} le premier mois, juste après ton questionnaire
        </p>
      )}

      <ul className="mt-5 flex-1 space-y-2.5">
        {offer.perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-ink-200">
            <CheckIcon className="mt-[3px] shrink-0 text-brand-400" />
            {perk}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <PlanButton planName={offer.name} highlighted={featured} current={current} />
      </div>
    </div>
  );
}

/** All the offers side by side (pricing page, home page). */
export function PricingCards({
  currentPlan,
  promo = false,
  launchNote = false,
}: {
  currentPlan?: Plan;
  promo?: boolean;
  launchNote?: boolean;
}) {
  return (
    <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
      {OFFERS.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          promo={promo}
          current={currentPlan === offer.id || (currentPlan === "elite" && offer.id === "pro")}
          launchNote={launchNote}
          featured={offer.id === BEST_VALUE}
          badge={offer.id === BEST_VALUE ? "Le plus avantageux" : undefined}
        />
      ))}
    </div>
  );
}
