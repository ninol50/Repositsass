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

/**
 * The live Whop plan IDs.
 *
 * Not secrets: they are visible in the public checkout URL. Keeping them in
 * code means the checkout works on a fresh deploy without three environment
 * variables to get right, and an env var still overrides when a plan changes.
 */
const DEFAULT_PLAN_IDS = {
  basic: "plan_1KQ97EvumwyVZ",
  pro: "plan_twwbvjaeBdFrI",
  max: "plan_ctlLmSkxygHV3",
} as const;

function planId(key: keyof typeof DEFAULT_PLAN_IDS): string | null {
  const fromEnv = {
    basic: process.env.WHOP_PLAN_BASIC_ID,
    pro: process.env.WHOP_PLAN_PRO_ID,
    max: process.env.WHOP_PLAN_MAX_ID,
  }[key];
  return fromEnv?.trim() || DEFAULT_PLAN_IDS[key] || null;
}

function checkoutUrlFor(key: keyof typeof DEFAULT_PLAN_IDS): string | null {
  const direct = {
    basic: process.env.WHOP_PLAN_BASIC_URL,
    pro: process.env.WHOP_PLAN_PRO_URL,
    max: process.env.WHOP_PLAN_MAX_URL,
  }[key];
  if (direct?.trim()) return direct.trim();

  const id = planId(key);
  return id ? `https://whop.com/checkout/${id}` : null;
}

export function planCatalog(): PlanConfig[] {
  return [
    {
      key: "basic",
      name: "Basic",
      price: "19",
      period: "par mois",
      tagline: "Pour valider une idée ce mois-ci.",
      features: [
        "10 briefs par mois, lisibles en entier",
        "12 sections : design system, architecture, chiffres, plan",
        "Export Markdown et copie en un clic",
        "Calcul MRR, churn, LTV, CAC",
      ],
      checkoutUrl: checkoutUrlFor("basic"),
      whopPlanId: planId("basic"),
    },
    {
      key: "pro",
      name: "Pro",
      price: "39",
      period: "par mois",
      tagline: "Pour ceux qui lancent plusieurs produits.",
      highlight: true,
      features: [
        "30 briefs par mois — 3× le plan Basic",
        "Brief approfondi : 16 sections au lieu de 12",
        "Analyse concurrentielle et axe de différenciation",
        "Plan d'acquisition sur 90 jours, chiffré",
        "Instrumentation et seuils d'alerte",
        "Catalogue d'idées validées + pré-remplissage en un clic",
      ],
      checkoutUrl: checkoutUrlFor("pro"),
      whopPlanId: planId("pro"),
    },
    {
      key: "max",
      name: "Max",
      price: "149",
      period: "une fois",
      tagline: "Un seul paiement, accès permanent.",
      features: [
        "Tout le plan Pro, sans limite de briefs",
        "Accès à vie, sans abonnement",
        "Nouvelles sections incluses au fil des versions",
      ],
      checkoutUrl: checkoutUrlFor("max"),
      whopPlanId: planId("max"),
    },
  ];
}

/**
 * Maps a paid Whop plan to ours.
 *
 * An unrecognised plan falls back to the LOWEST paid tier, never the highest:
 * a mistyped plan ID should under-grant and be noticed, not hand out the top
 * plan for free. The warning names the ID so it can be fixed.
 */
export function planFromWhopPlanId(planId: string | null | undefined): Plan {
  const catalog = planCatalog();
  const match = planId ? catalog.find((p) => p.whopPlanId === planId) : undefined;
  if (match) return match.key;

  console.warn(
    `[whop] plan_id inconnu (${planId ?? "absent"}) : accès accordé au plan le plus bas. ` +
      "Vérifie WHOP_PLAN_BASIC_ID / _PRO_ID / _MAX_ID.",
  );
  return catalog[0]?.key ?? "basic";
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
  if (!apiKey) return { ok: false, reason: "La vérification de licence n'est pas configurée sur ce déploiement." };
  if (!/^[A-Za-z0-9._-]{6,128}$/.test(key)) return { ok: false, reason: "Format de clé invalide." };

  try {
    const res = await fetch(`${WHOP_API}/memberships/${encodeURIComponent(key)}/validate_license`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (res.status === 404) return { ok: false, reason: "Clé introuvable." };
    if (!res.ok) return { ok: false, reason: `Whop a répondu ${res.status}. Réessaie dans un instant.` };

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
