import type { Answers } from "./questions";

/** Paid tiers, cheapest first. "free" = account created, nothing bought yet. */
export type Plan = "free" | "starter" | "pro" | "elite";

export const PLANS: readonly Plan[] = ["free", "starter", "pro", "elite"];

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

export type User = {
  id: string;
  email: string;
  /** null for the few accounts created when sign-in was by emailed code. */
  passwordHash: string | null;
  plan: Plan;
  /** Who set the plan: "admin", later the payment provider. */
  planSource: string | null;
  /** null = no end date. */
  planExpiresAt: string | null;
  createdAt: string;
};

export type PublicUser = Omit<User, "passwordHash"> & { isPaying: boolean };

/** One completed questionnaire. The result page is recomputed from the answers. */
export type Generation = {
  id: string;
  userId: string;
  answers: Answers;
  createdAt: string;
};

export function toPublicUser(u: User): PublicUser {
  const { passwordHash: _ignored, ...rest } = u;
  return { ...rest, isPaying: hasActivePlan(u) };
}

export function hasActivePlan(u: Pick<User, "plan" | "planExpiresAt">): boolean {
  if (u.plan === "free") return false;
  if (!u.planExpiresAt) return true;
  return new Date(u.planExpiresAt).getTime() > Date.now();
}

/** The plan that actually applies today: an expired subscription falls back to free. */
export function effectivePlan(u: Pick<User, "plan" | "planExpiresAt">): Plan {
  return hasActivePlan(u) ? u.plan : "free";
}
