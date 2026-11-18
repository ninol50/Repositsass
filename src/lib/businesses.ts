/**
 * The five businesses ScaleBiz proposes.
 *
 * Written so far: n°1 Clipping. Slots n°2–n°5 are still placeholders: fill
 * them in here — nothing else in the app needs to change. The numeric fields
 * drive the matching score, so set them honestly.
 *
 * Locked businesses never leave the server: the result page only serialises
 * `rank` and `fit` for them, not a single word of this content.
 */

import type { Answers } from "./questions";
import { computeProfile } from "./profile";

export type Business = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Minimum hours a day for it to work at all. */
  minHoursPerDay: number;
  /** Realistic net monthly income once running, in euros. */
  revenueRange: [number, number];
  /** Money needed to start, in euros. */
  startBudget: number;
  /** 18 when it needs a legal status, contracts or payouts in your own name. */
  minAge: number;
  /** Years of business experience it realistically needs. 0 = beginner-friendly. */
  minExperience: number;
  /** Launch plan without automation, in order. */
  steps: string[];
  /**
   * The done-for-you version. `available: false` shows "bientôt disponible"
   * until it exists — never promise an automation that is not built.
   */
  automation: { available: boolean; summary: string };
};

/** Business n°1 — the smallest start: least money, least time. */
const CLIPPING: Business = {
  id: "clipping",
  name: "Clipping",
  tagline: "Découpe les vidéos des créateurs en clips courts, et fais-toi payer.",
  description:
    "Les créateurs (YouTubeurs, podcasteurs, streamers, sites et marques qui font des vidéos) n'ont pas le temps " +
    "de transformer leurs longues vidéos en clips TikTok. Tu le fais pour eux : tu découpes les meilleurs moments, " +
    "tu les publies, et ils te paient au clip ou au mois.",
  minHoursPerDay: 1,
  revenueRange: [300, 1500],
  startBudget: 0,
  minAge: 16,
  minExperience: 0,
  steps: [
    "Crée un compte TikTok dédié au clipping, sur une niche claire (podcasts, business, gaming…).",
    "Publie 5 à 10 clips d'exemple pour montrer ton niveau (montage gratuit sur CapCut).",
    "Fais la liste des créateurs et des sites qui publient des vidéos longues sans clips courts.",
    "Envoie-leur un message : propose 3 clips gratuits pour tester.",
    "Livre les clips en 48 h, puis propose un forfait au mois.",
    "Garde les clients qui paient le mieux et monte tes prix.",
  ],
  automation: {
    available: false,
    summary: "Recherche des créateurs, messages et découpe des clips faits à ta place.",
  },
};

/** Slots still to write: n°2 to n°5. */
const PLACEHOLDERS: Business[] = [2, 3, 4, 5].map((n) => ({
  id: `business-${n}`,
  name: `Business n°${n}`,
  tagline: "À définir",
  description: "Description à rédiger dans src/lib/businesses.ts.",
  minHoursPerDay: 1,
  revenueRange: [500, 5000],
  startBudget: 0,
  minAge: 18,
  minExperience: 0,
  steps: ["Étape 1 à rédiger", "Étape 2 à rédiger", "Étape 3 à rédiger"],
  automation: { available: false, summary: "À définir" },
}));

export const BUSINESSES: Business[] = [CLIPPING, ...PLACEHOLDERS];

export type RankedBusiness = {
  business: Business;
  rank: number;
  /** 0–100: how well it fits the answers. */
  fit: number;
};

/**
 * Scores each business against the answers, best first.
 *
 * Four criteria: is there enough time, can it reach the target, is the
 * person old enough, and do they have the experience it needs. Deterministic — same answers, same order.
 */
export function rankBusinesses(a: Answers, list: Business[] = BUSINESSES): RankedBusiness[] {
  const profile = computeProfile(a);

  const scored = list.map((business, index) => {
    let fit = 100;

    // Not enough time: heavy penalty, proportional to the gap.
    if (a.hoursPerDay < business.minHoursPerDay) {
      fit -= Math.min(50, ((business.minHoursPerDay - a.hoursPerDay) / business.minHoursPerDay) * 60);
    }

    // Target above what this business realistically makes.
    const [low, high] = business.revenueRange;
    if (a.monthlyTarget > high) {
      fit -= Math.min(35, ((a.monthlyTarget - high) / a.monthlyTarget) * 50);
    } else if (a.monthlyTarget < low) {
      // Overkill for a small target is a mild mismatch, not a blocker.
      fit -= 8;
    }

    if (!profile.isAdult && business.minAge >= 18) fit -= 30;

    // Not experienced enough: moderate penalty, it can be learned.
    const experience = a.experience ?? 0;
    if (experience < business.minExperience) {
      fit -= Math.min(25, (business.minExperience - experience) * 8);
    }

    return { business, index, fit: Math.max(5, Math.round(fit)) };
  });

  scored.sort((x, y) => y.fit - x.fit || x.index - y.index);
  return scored.map((s, i) => ({ business: s.business, rank: i + 1, fit: s.fit }));
}
