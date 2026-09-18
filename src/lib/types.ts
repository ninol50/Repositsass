export type Plan = "free" | "basic" | "pro" | "max";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  plan: Plan;
  /**
   * The address used on Whop, when it differs from the account address.
   * Whop pre-fills the customer's WHOP account email, which is very often not
   * the one they signed up here with — and email is what ties a payment to an
   * account. Without this column those customers pay and are never credited.
   */
  billingEmail: string | null;
  planSource: string | null;
  planExpiresAt: string | null;
  whopMembershipId: string | null;
  createdAt: string;
};

export type PublicUser = Omit<User, "passwordHash"> & { isPro: boolean };

export type Generation = {
  id: string;
  userId: string;
  productName: string;
  summary: string;
  answers: Record<string, string | string[]>;
  createdAt: string;
};

export type Review = {
  id: string;
  userId: string;
  authorName: string;
  rating: number;
  body: string;
  approved: boolean;
  createdAt: string;
};

export function toPublicUser(u: User): PublicUser {
  const { passwordHash: _ignored, ...rest } = u;
  return { ...rest, isPro: hasActivePlan(u) };
}

export function hasActivePlan(u: Pick<User, "plan" | "planExpiresAt">): boolean {
  if (u.plan === "free") return false;
  if (!u.planExpiresAt) return true;
  return new Date(u.planExpiresAt).getTime() > Date.now();
}
