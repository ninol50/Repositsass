/**
 * Whop billing.
 *
 * Two independent paths grant access, both server-side:
 *  1. webhook  (/api/webhooks/whop)     — the source of truth
 *  2. licence  (/api/billing/verify)    — manual recovery when a webhook was missed
 *
 * The client redirect back from Whop never grants anything.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { Plan } from "./types";

const WHOP_API = "https://api.whop.com/api/v2";

export type PlanConfig = {
  key: Exclude<Plan, "free">;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
  checkoutUrl: string | null;
  whopPlanId: string | null;
};

function checkoutUrlFor(planId: string | undefined, directUrl: string | undefined): string | null {
  if (directUrl) return directUrl;
  if (planId) return `https://whop.com/checkout/${planId}`;
  return null;
}

export function planCatalog(): PlanConfig[] {
  return [
    {
      key: "starter",
      name: "Starter",
      price: "19",
      period: "par mois",
      tagline: "Pour valider une idee ce mois-ci.",
      features: [
        "Briefs illimites debloques",
        "Export Markdown et copie en un clic",
        "Palette et design system generes",
        "Calcul MRR, churn, LTV, CAC",
      ],
      checkoutUrl: checkoutUrlFor(process.env.WHOP_PLAN_STARTER_ID, process.env.WHOP_PLAN_STARTER_URL),
      whopPlanId: process.env.WHOP_PLAN_STARTER_ID ?? null,
    },
    {
      key: "pro",
      name: "Pro",
      price: "39",
      period: "par mois",
      tagline: "Pour ceux qui lancent plusieurs produits.",
      highlight: true,
      features: [
        "Tout le plan Starter",
        "Historique complet et versions",
        "Plan d'execution detaille par semaine",
        "Section risques et angles morts etendue",
        "Support par email sous 24h",
      ],
      checkoutUrl: checkoutUrlFor(process.env.WHOP_PLAN_PRO_ID, process.env.WHOP_PLAN_PRO_URL),
      whopPlanId: process.env.WHOP_PLAN_PRO_ID ?? null,
    },
    {
      key: "lifetime",
      name: "Lifetime",
      price: "149",
      period: "une fois",
      tagline: "Un seul paiement, acces permanent.",
      features: [
        "Tout le plan Pro",
        "Acces a vie, sans abonnement",
        "Nouvelles sections incluses",
      ],
      checkoutUrl: checkoutUrlFor(process.env.WHOP_PLAN_LIFETIME_ID, process.env.WHOP_PLAN_LIFETIME_URL),
      whopPlanId: process.env.WHOP_PLAN_LIFETIME_ID ?? null,
    },
  ];
}

export function planFromWhopPlanId(planId: string | null | undefined): Plan {
  if (!planId) return "pro";
  const match = planCatalog().find((p) => p.whopPlanId && p.whopPlanId === planId);
  return match?.key ?? "pro";
}

export function billingConfigured(): boolean {
  return planCatalog().some((p) => p.checkoutUrl !== null);
}

/* --------------------------- webhook ------------------------------- */

/**
 * Whop signs the raw request body with HMAC-SHA256. Some dashboards emit the
 * digest bare, others prefixed with `sha256=`, so both are accepted.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signature) return false;

  const provided = signature.trim().replace(/^sha256=/i, "");
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

export type WhopWebhookEvent = {
  action?: string;
  event?: string;
  data?: {
    id?: string;
    status?: string;
    valid?: boolean;
    plan_id?: string;
    user?: { email?: string };
    email?: string;
    metadata?: Record<string, unknown>;
    renewal_period_end?: number | string | null;
  };
};

/** Events that should grant access; anything else revokes or is ignored. */
export const GRANTING_EVENTS = new Set([
  "membership.went_valid",
  "membership_went_valid",
  "payment.succeeded",
  "payment_succeeded",
]);

export const REVOKING_EVENTS = new Set([
  "membership.went_invalid",
  "membership_went_invalid",
  "membership.cancelled",
  "membership_cancelled",
]);

/* --------------------------- licences ------------------------------ */

export type LicenseCheck =
  | { ok: true; plan: Plan; membershipId: string; expiresAt: string | null }
  | { ok: false; reason: string };

export async function validateLicenseKey(key: string): Promise<LicenseCheck> {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) return { ok: false, reason: "La verification de licence n'est pas configuree sur ce deploiement." };
  if (!/^[A-Za-z0-9._-]{6,128}$/.test(key)) return { ok: false, reason: "Format de cle invalide." };

  try {
    const res = await fetch(`${WHOP_API}/memberships/${encodeURIComponent(key)}/validate_license`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (res.status === 404) return { ok: false, reason: "Cle introuvable." };
    if (!res.ok) return { ok: false, reason: `Whop a repondu ${res.status}. Reessaie dans un instant.` };

    const body = (await res.json()) as {
      id?: string;
      status?: string;
      valid?: boolean;
      plan_id?: string;
      renewal_period_end?: number | null;
    };

    const active = body.valid === true || body.status === "active" || body.status === "completed";
    if (!active) return { ok: false, reason: "Cette licence n'est pas active." };

    return {
      ok: true,
      plan: planFromWhopPlanId(body.plan_id),
      membershipId: body.id ?? key,
      expiresAt: body.renewal_period_end ? new Date(body.renewal_period_end * 1000).toISOString() : null,
    };
  } catch {
    return { ok: false, reason: "Impossible de joindre Whop." };
  }
}
