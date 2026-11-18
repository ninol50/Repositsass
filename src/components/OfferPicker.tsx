"use client";

import { useState } from "react";
import { BEST_VALUE, OFFERS, type Billing } from "@/lib/plans";
import type { PlanOffer } from "@/lib/plans";
import { BillingToggle, OfferCard } from "./PricingCards";

/**
 * After a generation: the one offer that fits the plan, and the others only
 * on request ("Découvrir les autres offres").
 */
export function OfferPicker({
  recommendedId,
  reason,
  promo,
  initiallyOpen = false,
}: {
  recommendedId: PlanOffer["id"];
  reason: string;
  promo: boolean;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [billing, setBilling] = useState<Billing>("monthly");
  const recommended = OFFERS.find((o) => o.id === recommendedId)!;
  const others = OFFERS.filter((o) => o.id !== recommendedId);

  return (
    <div>
      <div className="mx-auto max-w-md">
        <p className="mb-5 text-center text-[14px] leading-relaxed text-ink-300">{reason}</p>
        <div className="mb-8">
          <BillingToggle value={billing} onChange={setBilling} />
        </div>
        <OfferCard
          offer={recommended}
          billing={billing}
          hideMissing
          promo={promo}
          featured
          badge={recommended.id === BEST_VALUE ? "Recommandé pour ton plan · le plus avantageux" : "Recommandé pour ton plan"}
        />
      </div>

      {!open ? (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl border border-white/12 px-5 py-3 text-[14px] font-medium text-white transition-colors hover:border-white/25 hover:bg-white/[0.04]"
          >
            Découvrir les autres offres
          </button>
        </div>
      ) : (
        <div className="animate-rise mx-auto mt-8 grid max-w-md gap-4">
          {others.map((o) => (
            <OfferCard
              key={o.id}
              offer={o}
              billing={billing}
              promo={promo}
              badge={o.id === BEST_VALUE ? "Le plus avantageux" : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
