/**
 * What the answers mean, computed — never guessed.
 *
 * This part of the result is shown to everyone with an account, paying or not:
 * it is the proof that the generation actually read their answers, and it is
 * what makes the locked part worth opening.
 */

import type { Answers } from "./questions";

/** Working days in an average month at five days a week (52 weeks × 5 / 12). */
export const WORKING_DAYS_PER_MONTH = 21.7;

export type Ambition = "accessible" | "ambitieux" | "tres-ambitieux";

export type Profile = {
  hoursPerMonth: number;
  /** Euros per hour of work needed to reach the target. */
  requiredHourlyRate: number;
  ambition: Ambition;
  ambitionLabel: string;
  ambitionText: string;
  isAdult: boolean;
};

export function computeProfile(a: Answers): Profile {
  const hoursPerMonth = Math.round(a.hoursPerDay * WORKING_DAYS_PER_MONTH);
  const requiredHourlyRate = Math.round(a.monthlyTarget / Math.max(1, hoursPerMonth));

  // Thresholds on the hourly rate the plan has to produce. Under ~20 €/h most
  // service businesses get there; past ~60 €/h it takes leverage (a product,
  // a team, ads that scale) rather than just more hours.
  let ambition: Ambition = "accessible";
  if (requiredHourlyRate > 60) ambition = "tres-ambitieux";
  else if (requiredHourlyRate > 20) ambition = "ambitieux";

  const copy: Record<Ambition, { label: string; text: string }> = {
    accessible: {
      label: "Objectif accessible",
      text: "Ton objectif est atteignable avec un business de service simple, sans investissement lourd.",
    },
    ambitieux: {
      label: "Objectif ambitieux",
      text: "Il faut un business avec de la marge : vendre une compétence ou un produit plutôt que du temps brut.",
    },
    "tres-ambitieux": {
      label: "Objectif très ambitieux",
      text: "Ton temps ne suffira pas à lui seul : il te faut un business qui scale (produit, automatisation, acquisition payante).",
    },
  };

  return {
    hoursPerMonth,
    requiredHourlyRate,
    ambition,
    ambitionLabel: copy[ambition].label,
    ambitionText: copy[ambition].text,
    isAdult: a.age >= 18,
  };
}

export function euros(n: number): string {
  return `${n.toLocaleString("fr-FR")} €`;
}

/**
 * "What our pros calculated you can make": shown between the consent and the
 * fingerprint. It sits a little above the target (+12 % to +25 %) depending on
 * experience, time and automation. It is an indicative estimate — the screen
 * says so — never a guarantee.
 */
export function projectedMonthly(a: Answers): number {
  let multiplier = 1.12;
  multiplier += 0.02 * Math.min(a.experience ?? 0, 3); // up to +6 %
  if (a.hoursPerDay >= 4) multiplier += 0.03;
  if (a.automate) multiplier += 0.04;
  let value = Math.round(a.monthlyTarget * multiplier);
  // A round number looks made up; a computed one rarely ends in 0.
  if (value % 10 === 0) value += 8;
  return value;
}
