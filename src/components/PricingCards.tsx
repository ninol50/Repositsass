"use client";

import { useState } from "react";
import {
  BEST_VALUE,
  FEATURES,
  OFFERS,
  featureFor,
  formatPrice,
  monthsOffered,
  type Billing,
  type PlanOffer,
} from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { PlanButton } from "./PlanButton";
import { cx } from "./ui";

/** ✅ included (bold) / 🚫 not included (dimmed), the same lines on every offer. */
export function FeatureList({
  offer,
  className,
  hideMissing = false,
}: {
  offer: PlanOffer;
  className?: string;
  /** The offer recommended to this person: show only what it includes. */
  hideMissing?: boolean;
}) {
  return (
    <ul className={cx("space-y-2.5", className)}>
      {FEATURES.map((f) => {
        const { included, label } = featureFor(offer, f);
        if (hideMissing && !included) return null;
        return (
          <li
            key={f.label}
            className={cx(
              "flex items-start gap-2.5 text-[13.5px] leading-snug",
              included ? "font-semibold text-white" : "text-ink-500",
            )}
          >
            <span className="shrink-0" aria-hidden>
              {included ? "✅" : "🚫"}
            </span>
            <span>
              <span className="sr-only">{included ? "Inclus : " : "Non inclus : "}</span>
              <span className={included ? undefined : "line-through decoration-ink-600"}>{label}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Monthly by default; yearly on request. */
export function BillingToggle({ value, onChange }: { value: Billing; onChange: (b: Billing) => void }) {
  const options: { id: Billing; label: string }[] = [
    { id: "monthly", label: "Mensuel" },
    { id: "yearly", label: "Annuel · 2 mois offerts" },
  ];
  return (
    <div role="radiogroup" aria-label="Facturation" className="mx-auto flex w-fit rounded-full border border-white/10 bg-ink-950/70 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            "rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
            value === o.id ? "bg-white text-ink-950" : "text-ink-300 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Price({ offer, billing, promo, launchNote }: { offer: PlanOffer; billing: Billing; promo: boolean; launchNote: boolean }) {
  if (billing === "yearly") {
    return (
      <div className="mt-5">
        <p className="flex items-baseline gap-1">
          <span className="whitespace-nowrap font-display text-[40px] font-bold tracking-tight text-white">
            {formatPrice(offer.yearlyPrice)}
          </span>
          <span className="text-[14px] text-ink-400">/ an</span>
        </p>
        <p className="mt-1 text-[12.5px] font-medium text-brand-300">
          soit {formatPrice(Math.round((offer.yearlyPrice / 12) * 100) / 100)} / mois · {monthsOffered(offer)} mois offerts
        </p>
      </div>
    );
  }

  if (promo) {
    return (
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
    );
  }

  return (
    <div className="mt-5">
      <p className="flex items-baseline gap-1">
        <span className="whitespace-nowrap font-display text-[40px] font-bold tracking-tight text-white">
          {formatPrice(offer.monthlyPrice)}
        </span>
        <span className="text-[14px] text-ink-400">/ mois</span>
      </p>
      {launchNote && (
        <p className="mt-1 text-[12.5px] text-gold-300">
          {formatPrice(offer.launchPrice)} le premier mois, juste après ton questionnaire
        </p>
      )}
    </div>
  );
}

export function OfferCard({
  offer,
  billing = "monthly",
  promo = false,
  current = false,
  featured = false,
  badge,
  launchNote = false,
  hideMissing = false,
}: {
  offer: PlanOffer;
  hideMissing?: boolean;
  billing?: Billing;
  /** True only while a just-generated plan's launch price is still running. */
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

      <Price offer={offer} billing={billing} promo={promo} launchNote={launchNote} />

      <FeatureList offer={offer} className="mt-5 flex-1" hideMissing={hideMissing} />

      <div className="mt-6">
        <PlanButton
          planName={billing === "yearly" ? `${offer.name} annuel` : offer.name}
          highlighted={featured}
          current={current}
        />
      </div>
    </div>
  );
}

/** All the offers side by side (pricing page, home page, result page once paying). */
export function PricingCards({
  currentPlan,
  promo = false,
  launchNote = false,
}: {
  currentPlan?: Plan;
  promo?: boolean;
  launchNote?: boolean;
}) {
  const [billing, setBilling] = useState<Billing>("monthly");
  return (
    <div>
      <BillingToggle value={billing} onChange={setBilling} />
      <div className="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-2">
        {OFFERS.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            billing={billing}
            promo={promo}
            current={currentPlan === offer.id || (currentPlan === "elite" && offer.id === "pro")}
            featured={offer.id === BEST_VALUE}
            badge={offer.id === BEST_VALUE ? "Le plus avantageux" : undefined}
            launchNote={launchNote}
          />
        ))}
      </div>
    </div>
  );
}
