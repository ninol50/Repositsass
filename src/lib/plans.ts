/**
 * The offers, and what each one unlocks.
 *
 * Single source of truth: the result page paywall, the pricing page, the
 * generation screen and the admin all read from here. Changing a price or a
 * perk is a one-line edit.
 */

import { computeProfile } from "./profile";
import type { Answers } from "./questions";
import type { Plan } from "./types";

export type PlanOffer = {
  id: "starter" | "pro";
  name: string;
  tagline: string;
  /** Regular price, euros per month. */
  monthlyPrice: number;
  /**
   * Launch price of the FIRST month — only while the countdown that follows
   * a questionnaire is running (see PROMO). Afterwards: monthlyPrice.
   */
  launchPrice: number;
  /** Price of a year paid at once. */
  yearlyPrice: number;
  /** Businesses whose full plan is opened. */
  businessPlans: number;
  /** Questionnaires (generations) included. null = unlimited. */
  questionnaires: number | null;
  /** Done-for-you automations. */
  automations: boolean;
  perks: string[];
};

export const OFFERS: PlanOffer[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Pour démarrer avec le business le plus simple.",
    monthlyPrice: 26,
    launchPrice: 22,
    yearlyPrice: 260,
    businessPlans: 1,
    questionnaires: 1,
    automations: false,
    perks: [
      "Le Clipping : le business le plus simple pour démarrer",
      "Son plan complet et son guide pas à pas",
      "1 questionnaire",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Tous les business, automatisés à ta place.",
    monthlyPrice: 45,
    launchPrice: 39.99,
    yearlyPrice: 450,
    businessPlans: 5,
    questionnaires: null,
    automations: true,
    perks: [
      "Tous les business débloqués",
      "Questionnaires illimités",
      "Les automatisations, faites à ta place",
      "Des guides plus complets, avec plus de pages",
    ],
  },
];

export const TOTAL_BUSINESSES = 5;

export type Billing = "monthly" | "yearly";

/** Months saved by paying yearly, shown as "2 mois offerts". */
export function monthsOffered(offer: PlanOffer): number {
  return Math.round((offer.monthlyPrice * 12 - offer.yearlyPrice) / offer.monthlyPrice);
}

/**
 * What each offer includes, line by line: ✅ when included, 🚫 when not.
 * The same list on every card, so the difference between offers is visible.
 * A string replaces the label for that offer (e.g. a limit).
 */
export const FEATURES: { label: string; starter: boolean | string; pro: boolean | string }[] = [
  { label: "Le Clipping, son plan complet et son guide", starter: true, pro: true },
  { label: "Tous les business débloqués", starter: false, pro: true },
  { label: "Questionnaires illimités", starter: "1 seul questionnaire", pro: true },
  { label: "Les automatisations, faites à ta place", starter: false, pro: true },
  { label: "Des guides plus complets, avec plus de pages", starter: false, pro: true },
];

/** One line of an offer's checklist. A limit counts as included, with its own wording. */
export function featureFor(offer: PlanOffer, f: (typeof FEATURES)[number]): { included: boolean; label: string } {
  const value = f[offer.id];
  if (typeof value === "string") return { included: true, label: value };
  return { included: value, label: f.label };
}

/** The offer we put forward: best value, shown by default. */
export const BEST_VALUE: PlanOffer["id"] = "pro";

/**
 * Accounts set to "elite" before the offers were merged keep everything:
 * they read as Pro.
 */
export function offerFor(plan: Plan): PlanOffer | null {
  const id = plan === "elite" ? "pro" : plan;
  return OFFERS.find((o) => o.id === id) ?? null;
}

/** Businesses whose full plan this account can open. 0 = nothing (not paying). */
export function businessPlansFor(plan: Plan): number {
  return offerFor(plan)?.businessPlans ?? 0;
}

/** Questionnaires this account may run. null = unlimited; free accounts are not limited here. */
export function questionnaireLimitFor(plan: Plan): number | null {
  return offerFor(plan)?.questionnaires ?? null;
}

export function planLabel(plan: Plan): string {
  return offerFor(plan)?.name ?? "Aucune offre";
}

/* ---------------------------------------------------------------------- */
/* Launch price after a questionnaire                                      */
/* ---------------------------------------------------------------------- */

/**
 * After a questionnaire, the first month is at `launchPrice` for a few
 * minutes.
 *
 * The countdown is REAL: it ends `minutes` after the plan was generated, as
 * computed by the server from the generation's creation date. Refreshing
 * does not restart it, and once it is over the first month is at the regular
 * price. That is also why the pricing page shows the regular prices: if the
 * launch price were available everywhere, the countdown would be a lie — a
 * misleading commercial practice under French/EU consumer law.
 *
 * When payment is wired, the checkout MUST charge `launchPrice` for the first
 * month only while `promoActive(...)` is true.
 */
export const PROMO = {
  minutes: 5,
};

export function promoEndsAt(generationCreatedAt: string | Date): Date {
  return new Date(new Date(generationCreatedAt).getTime() + PROMO.minutes * 60_000);
}

export function promoActive(endsAt: Date, now = Date.now()): boolean {
  return endsAt.getTime() > now;
}

/** "39,99 €" / "26 €": cents only when there are some. */
export function formatPrice(euros: number): string {
  const cents = !Number.isInteger(euros);
  return `${euros.toLocaleString("fr-FR", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })} €`;
}

/* ---------------------------------------------------------------------- */
/* Recommendation                                                          */
/* ---------------------------------------------------------------------- */

/** Below this target, with no automation wanted, Starter is enough. */
const STARTER_MAX_TARGET = 1500;

/**
 * The single offer shown after a generation.
 *
 * Pro is the default — the best value for most profiles. Starter is proposed
 * only when the answers clearly call for it: no automation wanted AND a
 * small, easily reachable target. Deterministic on purpose: the same answers
 * always get the same offer.
 */
export function recommendedOffer(a: Answers): { offer: PlanOffer; reason: string } {
  const profile = computeProfile(a);
  const pick = (id: PlanOffer["id"]) => OFFERS.find((o) => o.id === id)!;

  if (!a.automate && profile.ambition === "accessible" && a.monthlyTarget <= STARTER_MAX_TARGET) {
    return {
      offer: pick("starter"),
      reason: "Ton objectif est atteignable seul : le Clipping, son plan et son guide pour démarrer simplement.",
    };
  }

  // Pro: the reason follows what matters most in the answers.
  let reason = "Le meilleur rapport pour toi : tous les business, automatisés à ta place.";
  if (a.automate) {
    reason = "Tu veux qu'on automatise à ta place : seul Pro le fait, sur tous les business.";
  } else if (profile.ambition === "tres-ambitieux") {
    reason = "Ton objectif est élevé : tous les business et les automatisations pour y arriver plus vite.";
  } else if ((a.experience ?? 0) === 0) {
    reason = "Tu débutes : des guides plus complets et l'automatisation à ta place pour ne pas te perdre.";
  } else if (a.hoursPerDay <= 2) {
    reason = `Avec ${a.hoursPerDay} h par jour, il faut que ça tourne sans toi : Pro automatise à ta place.`;
  }
  return { offer: pick("pro"), reason };
}
