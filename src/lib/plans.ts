/**
 * The offers, and what each one unlocks.
 *
 * Single source of truth: the result page paywall, the pricing page and the
 * admin all read from here. Changing a price or a perk is a one-line edit.
 *
 * Prices are placeholders until payment is wired.
 */

import type { Plan } from "./types";

export type PlanOffer = {
  id: Exclude<Plan, "free">;
  name: string;
  /** Euros per month. */
  monthlyPrice: number;
  tagline: string;
  /** How many of the user's 5 businesses are unlocked, best matches first. */
  businessesUnlocked: number;
  /** Shown on the card. Keep it in sync with the capabilities below. */
  perks: string[];
  highlighted?: boolean;
};

export const OFFERS: PlanOffer[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 19,
    tagline: "Pour lancer ton premier business.",
    businessesUnlocked: 1,
    perks: [
      "Ton business n°1, le plus adapté à ton profil",
      "Le plan de lancement étape par étape",
      "Ton objectif chiffré, mois par mois",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 39,
    tagline: "Pour comparer et choisir le bon.",
    businessesUnlocked: 3,
    perks: [
      "Tes 3 meilleurs business débloqués",
      "Tout ce qui est dans Starter",
      "Comparatif temps / revenu / budget de départ",
    ],
    highlighted: true,
  },
  {
    id: "elite",
    name: "Elite",
    monthlyPrice: 79,
    tagline: "Pour tout voir et aller vite.",
    businessesUnlocked: 5,
    perks: [
      "Les 5 business débloqués",
      "Tout ce qui est dans Pro",
      "Accès en avant-première aux nouveautés",
    ],
  },
];

export const TOTAL_BUSINESSES = 5;

/**
 * Launch offer shown right after a generation.
 *
 * The countdown is REAL: it ends `minutes` after the plan was generated, as
 * computed by the server from the generation's creation date. Refreshing
 * does not restart it, and once it is over the discount is gone. A timer
 * that lies (restarts, or never really ends) is a misleading commercial
 * practice under French/EU consumer law — keep it honest.
 *
 * When payment is wired, the checkout MUST apply `percentOff` only while
 * `promoActive(...)` is true.
 */
export const PROMO = {
  percentOff: 30,
  minutes: 5,
  /** What the discount applies to, shown next to the price. */
  scope: "le premier mois",
};

export function promoEndsAt(generationCreatedAt: string | Date): Date {
  return new Date(new Date(generationCreatedAt).getTime() + PROMO.minutes * 60_000);
}

export function promoActive(endsAt: Date, now = Date.now()): boolean {
  return endsAt.getTime() > now;
}

export function promoPrice(monthlyPrice: number): number {
  return Math.round(monthlyPrice * (100 - PROMO.percentOff)) / 100;
}

export function offerFor(plan: Plan): PlanOffer | null {
  return OFFERS.find((o) => o.id === plan) ?? null;
}

export function businessesUnlockedFor(plan: Plan): number {
  return offerFor(plan)?.businessesUnlocked ?? 0;
}

export function planLabel(plan: Plan): string {
  return offerFor(plan)?.name ?? "Gratuit";
}
