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

/**
 * Overridable so the recovery paths can be exercised against a mock or a
 * sandbox. Unset — the normal case — it is the live API.
 */
const WHOP_API = process.env.WHOP_API_URL?.replace(/\/+$/, "") || "https://api.whop.com/api/v2";

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
        "Guide complet : Claude Code, connecteurs MCP, mise en ligne",
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

/**
 * Pulls the plan id out of a checkout URL — `.../checkout/plan_XXXX` — so the
 * embedded checkout is driven by the real links of the project instead of an
 * id retyped by hand somewhere else.
 *
 * Returns null for anything that is not a Whop checkout URL, which is exactly
 * what the button uses to decide between the modal and a plain redirect.
 */
export function whopPlanIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!/(^|\.)whop\.com$/i.test(parsed.hostname)) return null;
    const fromPath = parsed.pathname.match(/\/checkout\/(plan_[A-Za-z0-9]+)/);
    if (fromPath) return fromPath[1];
    const fromQuery = parsed.searchParams.get("planId") ?? parsed.searchParams.get("plan_id");
    return fromQuery && /^plan_[A-Za-z0-9]+$/.test(fromQuery) ? fromQuery : null;
  } catch {
    return null;
  }
}

/* ----------------------- memberships (API) -------------------------- */

export type WhopMembership = {
  id: string;
  planId: string | null;
  email: string | null;
  status: string | null;
  valid: boolean;
  expiresAt: string | null;
};

export type MembershipLookup =
  | { ok: true; memberships: WhopMembership[] }
  | { ok: false; reason: string; configured: boolean };

function toIso(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    // Whop timestamps are in seconds.
    return new Date(value * 1000).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(/^\d+$/.test(value) ? Number(value) * 1000 : value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/**
 * Normalises one membership.
 *
 * Written defensively on purpose: the exact field names of the Whop API are
 * not pinned by anything in this repo, so every field is read from a few
 * plausible places and a missing one degrades instead of throwing.
 */
function toMembership(raw: Record<string, unknown>): WhopMembership | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  if (!id) return null;

  const user = (raw.user ?? {}) as Record<string, unknown>;
  const email =
    (typeof raw.email === "string" && raw.email) ||
    (typeof user.email === "string" && user.email) ||
    null;

  const status = typeof raw.status === "string" ? raw.status : null;
  const valid =
    raw.valid === true || status === "active" || status === "completed" || status === "trialing";

  return {
    id,
    planId: typeof raw.plan_id === "string" ? raw.plan_id : typeof raw.plan === "string" ? raw.plan : null,
    email: email ? email.toLowerCase() : null,
    status,
    valid,
    expiresAt: toIso(raw.renewal_period_end ?? raw.expires_at ?? null),
  };
}

/**
 * Valid memberships known to Whop, optionally narrowed to one email.
 *
 * This is the read that both recovery paths depend on. The access it grants
 * comes from THIS answer — never from what the customer says they paid.
 */
export async function listValidMemberships(email?: string): Promise<MembershipLookup> {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      reason: "La récupération automatique n'est pas configurée sur ce déploiement (WHOP_API_KEY absente).",
    };
  }

  const url = new URL(`${WHOP_API}/memberships`);
  url.searchParams.set("valid", "true");
  url.searchParams.set("per", "50");
  if (email) url.searchParams.set("email", email.trim().toLowerCase());

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, configured: true, reason: "Whop a refusé la clé d'API (401/403)." };
    }
    if (!res.ok) {
      return { ok: false, configured: true, reason: `Whop a répondu ${res.status}. Réessaie dans un instant.` };
    }

    const body = (await res.json()) as unknown;
    const rows = Array.isArray(body)
      ? body
      : Array.isArray((body as { data?: unknown }).data)
        ? ((body as { data: unknown[] }).data)
        : [];

    if (!Array.isArray(body) && !Array.isArray((body as { data?: unknown }).data)) {
      console.warn("[whop] réponse /memberships inattendue, aucune adhésion lue", Object.keys(body ?? {}));
    }

    const memberships = rows
      .map((r) => toMembership(r as Record<string, unknown>))
      .filter((m): m is WhopMembership => m !== null && m.valid);

    return { ok: true, memberships };
  } catch {
    return { ok: false, configured: true, reason: "Impossible de joindre Whop." };
  }
}

/** The valid membership matching any of the account's addresses, if there is one. */
export async function findMembershipForEmails(emails: (string | null)[]): Promise<MembershipLookup & { match?: WhopMembership }> {
  const wanted = emails
    .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
    .map((e) => e.trim().toLowerCase());
  if (wanted.length === 0) return { ok: true, memberships: [] };

  // Ask Whop per address first: a filtered query is cheaper and does not
  // depend on the account being on the first page of the full list.
  for (const email of wanted) {
    const res = await listValidMemberships(email);
    if (!res.ok) return res;
    const match = res.memberships.find((m) => !m.email || m.email === email);
    if (match) return { ok: true, memberships: res.memberships, match };
  }

  // The `email` filter may simply be ignored by the API; fall back to scanning.
  const all = await listValidMemberships();
  if (!all.ok) return all;
  const match = all.memberships.find((m) => m.email && wanted.includes(m.email));
  return { ok: true, memberships: all.memberships, match };
}

/**
 * The idempotency key of a grant: the membership plus the period it covers.
 * A renewal changes the date and is credited again; re-running a recovery is
 * a no-op.
 */
export function periodKeyFor(membershipId: string, expiresAt: string | null): string {
  return `${membershipId}:${expiresAt ?? "lifetime"}`;
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
