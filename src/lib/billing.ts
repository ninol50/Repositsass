/**
 * Granting paid access.
 *
 * Three paths lead here — the webhook, the "J'ai déjà payé" button, and the
 * nightly reconciliation — and all three go through this one function so the
 * rules hold everywhere:
 *
 *  - the plan comes from what Whop returned, never from the request body;
 *  - every grant is written in the credit journal before it is applied;
 *  - a membership already credited for its current period is not credited
 *    again, so re-opening the recovery page is a no-op.
 */

import { getStore } from "./db";
import { hasActivePlan, type Plan, type User } from "./types";
import { periodKeyFor, planFromWhopPlanId, type WhopMembership } from "./whop";

export type GrantResult =
  | {
      ok: true;
      plan: Plan;
      /** False when the journal already carried this membership for this period. */
      firstTime: boolean;
      /** True when the account's plan row was actually written. */
      applied: boolean;
    }
  | { ok: false; reason: "claimed-by-another-account" };

export async function grantFromMembership(
  user: Pick<User, "id" | "plan" | "planExpiresAt">,
  membership: WhopMembership,
  source: string,
): Promise<GrantResult> {
  const store = getStore();
  const plan = planFromWhopPlanId(membership.planId);
  const periodKey = periodKeyFor(membership.id, membership.expiresAt);

  const journal = await store.recordPlanGrant({
    userId: user.id,
    membershipId: membership.id,
    plan,
    source,
    periodKey,
    expiresAt: membership.expiresAt,
  });

  // The journal is keyed by the membership period, not by the account: if it
  // already belongs to somebody else, this is a second account trying to claim
  // one payment. Nothing is written.
  if (journal.ownerId !== user.id) {
    console.warn(
      `[billing] adhésion ${membership.id} déjà créditée au compte ${journal.ownerId}, ` +
        `refus pour ${user.id} (source ${source}).`,
    );
    return { ok: false, reason: "claimed-by-another-account" };
  }

  // Applied when the grant is new, and also when the account drifted from what
  // Whop says — a plan change or an expiry already passed has to be repaired
  // even though the journal line exists.
  const drifted = user.plan !== plan || !hasActivePlan(user);
  const applied = journal.created || drifted;

  if (applied) {
    await store.setPlan(user.id, plan, source, membership.expiresAt, membership.id);
  }

  return { ok: true, plan, firstTime: journal.created, applied };
}

/** Records the address a customer paid with, when it is not their account address. */
export async function rememberBillingEmail(user: Pick<User, "id" | "email">, email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  if (!clean || clean === user.email.toLowerCase()) return;
  await getStore().setBillingEmail(user.id, clean);
}

/** Loose email check — enough to reject junk before calling Whop with it. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) && value.trim().length <= 254;
}
