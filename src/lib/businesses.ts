/**
 * The five businesses ScaleBiz proposes.
 *
 * ⚠ CONTENT TO WRITE: the five entries below are empty slots. Fill in the
 * real names, descriptions and steps here — nothing else in the app needs to
 * change. The numeric fields drive the matching score, so set them honestly.
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
  /** Launch plan, in order. */
  steps: string[];
};

export const BUSINESSES: Business[] = [1, 2, 3, 4, 5].map((n) => ({
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
}));

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
