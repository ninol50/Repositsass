/**
 * Catalogue of proven ideas — the Pro unlock.
 *
 * DELIBERATELY EMPTY until real entries are added. Nothing here may be invented:
 * every figure a card shows is a claim made to a paying customer, and a made-up
 * MRR discovered once destroys the credibility of the whole catalogue.
 *
 * To add an entry, append an object to IDEAS below. Only `evidence` and
 * `sourceUrl` carry factual claims — leave them empty rather than guessing.
 *
 * Example of a complete entry:
 *
 *   {
 *     id: "facturation-freelances",
 *     name: "Facturation automatisée pour freelances",
 *     category: "Finance",
 *     summary: "Relance les impayés et génère les factures récurrentes.",
 *     problem: "Les freelances passent deux heures par mois à relancer...",
 *     evidence: "Catégorie mature aux États-Unis, plusieurs acteurs établis.",
 *     sourceUrl: "https://...",
 *     answers: { audience: "freelances", mrrTarget: "5000", arpu: "19", ... },
 *   }
 */

import type { Answers } from "./questions";

export type IdeaEntry = {
  /** URL-safe identifier used by the "copy this site" button. */
  id: string;
  name: string;
  category: string;
  /** One sentence, shown on the card. */
  summary: string;
  /** The problem the product solves — prefilled into the questionnaire. */
  problem: string;
  /**
   * What makes this idea "proven". Factual only: what you observed, and where.
   * Left empty, the card simply shows no claim rather than a vague one.
   */
  evidence: string;
  /** Where the evidence comes from, so a customer can check it. */
  sourceUrl?: string;
  /** Questionnaire answers prefilled when the visitor copies this idea. */
  answers: Partial<Answers>;
};

/**
 * The catalogue. Empty on purpose — see the file header.
 * The Ideas page shows an honest empty state while this is empty.
 */
export const IDEAS: IdeaEntry[] = [];

export function listIdeas(): IdeaEntry[] {
  return IDEAS;
}

export function findIdea(id: string | null | undefined): IdeaEntry | null {
  if (!id) return null;
  return IDEAS.find((i) => i.id === id) ?? null;
}

export function ideaCategories(): string[] {
  return Array.from(new Set(IDEAS.map((i) => i.category))).sort();
}
