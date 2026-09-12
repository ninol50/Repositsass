/**
 * What each plan actually unlocks.
 *
 * Single source of truth: the paywall, the quota check, the depth of the
 * generated brief and the pricing page all read from here, so a plan can never
 * promise on one page what another page refuses.
 */

import type { Plan } from "./types";

export type PlanCapabilities = {
  /** Briefs a month. null = no limit. */
  monthlyGenerations: number | null;
  /** Can any part of the generated document be read? */
  canReadBrief: boolean;
  /** How deep the generated document goes. */
  briefDepth: "standard" | "pro";
  /** Access to the proven-ideas catalogue. */
  ideaCatalog: boolean;
  /** One-click prefill of the questionnaire from a catalogue entry. */
  autofill: boolean;
  /** The step-by-step guide from brief to deployed site. */
  guide: boolean;
};

export const CAPABILITIES: Record<Plan, PlanCapabilities> = {
  free: {
    // Generating stays possible so the visitor sees the flow and the real
    // length of what they would get — but not a single line of its content.
    monthlyGenerations: 5,
    canReadBrief: false,
    briefDepth: "standard",
    ideaCatalog: false,
    autofill: false,
    guide: false,
  },
  basic: {
    monthlyGenerations: 10,
    canReadBrief: true,
    briefDepth: "standard",
    ideaCatalog: false,
    autofill: false,
    guide: false,
  },
  pro: {
    monthlyGenerations: 30,
    canReadBrief: true,
    briefDepth: "pro",
    ideaCatalog: true,
    autofill: true,
    guide: true,
  },
  max: {
    monthlyGenerations: null,
    canReadBrief: true,
    briefDepth: "pro",
    ideaCatalog: true,
    autofill: true,
    guide: true,
  },
};

/** Capabilities for a user, taking an expired subscription into account. */
export function capabilitiesFor(plan: Plan, active: boolean): PlanCapabilities {
  return CAPABILITIES[active ? plan : "free"] ?? CAPABILITIES.free;
}

export function quotaLabel(limit: number | null): string {
  return limit === null ? "illimité" : `${limit} par mois`;
}

/** Start of the current calendar month, in UTC — the quota window. */
export function currentPeriodStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Human-readable date the quota resets. */
export function nextResetLabel(now = new Date()): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
