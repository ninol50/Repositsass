/**
 * The offers, and what each one unlocks.
 *
 * Single source of truth: the result page paywall, the pricing page and the
 * admin all read from here. Changing a price or a perk is a one-line edit.
 *
 * Prices are placeholders until payment is wired.
 */

import { computeProfile } from "./profile";
import type { Answers } from "./questions";
import type { Plan } from "./types";

export type PlanOffer = {
  id: Exclude<Plan, "free">;
  name: string;
  /** Euros per month. */
  monthlyPrice: number;
  tagline: string;
  /**
   * How many businesses this offer generates a full plan for (one
   * questionnaire = one business). The best matches come first.
   */
  businessPlans: number;
  /** Guides included each month. */
  guidesPerMonth: number;
  /** "guide": one automation, set up by the user with its guide. "done": done for them. */
  automation: "guide" | "done";
  /** Shown on the card. Keep it in sync with the numbers above. */
  perks: string[];
};

export const OFFERS: PlanOffer[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 19,
    tagline: "Pour lancer ton business, pas à pas.",
    businessPlans: 1,
    guidesPerMonth: 3,
    automation: "guide",
    perks: [
      "Le plan complet de ton business + sa fiche détaillée",
      "1 automatisation adaptée à ton business, avec son guide",
      "3 guides par mois",
      "Les outils parfaits pour la mise en place",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 39,
    tagline: "On automatise à ta place.",
    businessPlans: 3,
    guidesPerMonth: 10,
    automation: "done",
    perks: [
      "Tout le plan Starter",
      "L'automatisation mise en place à ta place",
      "10 guides par mois sur ton business",
      "2 business en plus : 3 plans de business au total",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    monthlyPrice: 79,
    tagline: "Tout, sans rien faire.",
    businessPlans: 5,
    guidesPerMonth: 20,
    automation: "done",
    perks: [
      "L'intégralité des business proposés",
      "Tout automatisé à ta place",
      "Tous les meilleurs outils à utiliser",
      "20 guides complets par business",
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

/** "55,30 €" / "19 €": cents only when there are some. */
export function formatPrice(euros: number): string {
  const cents = !Number.isInteger(euros);
  return `${euros.toLocaleString("fr-FR", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })} €`;
}

export function offerFor(plan: Plan): PlanOffer | null {
  return OFFERS.find((o) => o.id === plan) ?? null;
}

/** Businesses whose full plan this account can open. 0 = nothing (not paying). */
export function businessPlansFor(plan: Plan): number {
  return offerFor(plan)?.businessPlans ?? 0;
}

export function planLabel(plan: Plan): string {
  return offerFor(plan)?.name ?? "Aucune offre";
}

/**
 * The single offer shown after a generation: the one that fits the answers.
 * Two signals: do they want everything automated, and how far is the target
 * from what their hours alone can produce.
 */
export function recommendedOffer(a: Answers): { offer: PlanOffer; reason: string } {
  const veryAmbitious = computeProfile(a).ambition === "tres-ambitieux";
  const pick = (id: PlanOffer["id"]) => OFFERS.find((o) => o.id === id)!;

  if (a.automate && veryAmbitious) {
    return { offer: pick("elite"), reason: "Tu veux tout automatiser et ton objectif est élevé : il te faut tout, fait à ta place." };
  }
  if (a.automate) {
    return { offer: pick("pro"), reason: "Tu veux qu'on automatise à ta place : c'est l'offre qui le fait pour toi." };
  }
  if (veryAmbitious) {
    return { offer: pick("pro"), reason: "Ton objectif est élevé : 3 business et 10 guides par mois pour y arriver plus vite." };
  }
  return { offer: pick("starter"), reason: "Ton plan, ta fiche et tes guides pour lancer ton business pas à pas." };
}
