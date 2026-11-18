/**
 * The offers, and what each one unlocks.
 *
 * Single source of truth: the result page paywall, the pricing page, the
 * generation screen and the admin all read from here. Changing a price or a
 * perk is a one-line edit.
 */

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
    tagline: "Pour démarrer simplement, à ton rythme.",
    monthlyPrice: 23,
    launchPrice: 17.99,
    yearlyPrice: 180,
    businessPlans: 1,
    questionnaires: 1,
    automations: false,
    perks: [
      "Le plan complet de ton business et son guide",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Tous les business, automatisés à ta place.",
    monthlyPrice: 42,
    launchPrice: 34.99,
    yearlyPrice: 300,
    businessPlans: 5,
    questionnaires: null,
    automations: true,
    perks: [
      "Automatisation incluse",
      "Le plan complet de ton business et son guide",
      "Tous les guides et tous les plans de tous nos business",
    ],
  },
];

export const TOTAL_BUSINESSES = 5;

export type Billing = "monthly" | "yearly";

/** Saving of the yearly price against 12 regular months, in % (rounded). */
export function yearlySaving(offer: PlanOffer): number {
  return Math.round((1 - offer.yearlyPrice / (offer.monthlyPrice * 12)) * 100);
}

/** The best yearly saving across offers, for the billing switch label. */
export function bestYearlySaving(): number {
  return Math.max(...OFFERS.map(yearlySaving));
}

/**
 * What each offer includes, line by line: ✅ when included, 🚫 when not.
 * The same list on every card, so the difference between offers is visible.
 * A string replaces the label for that offer (e.g. a limit).
 */
export const FEATURES: { label: string; starter: boolean | string; pro: boolean | string }[] = [
  { label: "Automatisation incluse", starter: false, pro: true },
  { label: "Le plan complet de ton business et son guide", starter: true, pro: true },
  { label: "Tous les guides et tous les plans de tous nos business", starter: false, pro: true },
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

/** "34,99 €" / "23 €": cents only when there are some. */
export function formatPrice(euros: number): string {
  const cents = !Number.isInteger(euros);
  return `${euros.toLocaleString("fr-FR", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })} €`;
}

/* ---------------------------------------------------------------------- */
/* Recommendation                                                          */
/* ---------------------------------------------------------------------- */

/** From this monthly target on, Pro is proposed even without automation. */
const PRO_FROM_TARGET = 5000;

/**
 * The single offer shown after a generation:
 *  - automation wanted → Pro (only Pro includes it);
 *  - target of 5 000 €/month or more → Pro;
 *  - otherwise → Starter.
 * Deterministic: the same answers always get the same offer.
 */
export function recommendedOffer(a: Answers): { offer: PlanOffer; reason: string } {
  const pick = (id: PlanOffer["id"]) => OFFERS.find((o) => o.id === id)!;

  if (a.automate) {
    return {
      offer: pick("pro"),
      reason: "Tu veux qu'on automatise à ta place : seul Pro le fait, sur tous les business.",
    };
  }

  if (a.monthlyTarget >= PRO_FROM_TARGET) {
    const reason =
      a.hoursPerDay <= 2
        ? `Tu vises ${a.monthlyTarget.toLocaleString("fr-FR")} € par mois avec ${a.hoursPerDay} h par jour : il te faut tous les business et l'automatisation.`
        : `Tu vises ${a.monthlyTarget.toLocaleString("fr-FR")} € par mois : tous les business et tous les guides pour y arriver.`;
    return { offer: pick("pro"), reason };
  }

  const reason =
    (a.experience ?? 0) === 0
      ? "Tu débutes : ton plan complet et son guide pas à pas pour te lancer."
      : "Ton plan complet et son guide pour avancer à ton rythme.";
  return { offer: pick("starter"), reason };
}
