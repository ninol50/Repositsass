/**
 * Stripe, without the SDK: a few form-encoded HTTPS calls and the webhook
 * signature check.
 *
 * Configuration (environment variable, or the private sb_settings table):
 *   STRIPE_SECRET_KEY      sk_test_… / sk_live_…
 *   STRIPE_WEBHOOK_SECRET  whsec_…
 *
 * Prices are found by lookup key, never by hard-coded id, so test and live
 * modes work with the same code:
 *   scalebiz_starter_monthly · scalebiz_starter_yearly
 *   scalebiz_pro_monthly     · scalebiz_pro_yearly
 * The launch price of the first month is a coupon applied for one month:
 *   scalebiz_launch_starter  · scalebiz_launch_pro
 *
 * The plan is ONLY granted from a subscription read back from Stripe — never
 * from what the browser says, never from the return URL alone.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { getStore } from "./db";
import type { Billing, PlanOffer } from "./plans";
import { getSetting } from "./settings";
import type { Plan } from "./types";

/** Pinned so every response — and every webhook — has the same shape. */
export const STRIPE_API_VERSION = "2024-06-20";

/** Overridable only to point tests at a local fake; leave unset in production. */
const API = process.env.STRIPE_API_URL || "https://api.stripe.com/v1";

export type OfferId = PlanOffer["id"];

export function lookupKey(offer: OfferId, billing: Billing): string {
  return `scalebiz_${offer}_${billing}`;
}

export function launchCouponId(offer: OfferId): string {
  return `scalebiz_launch_${offer}`;
}

export function offerFromLookupKey(key: string | null | undefined): OfferId | null {
  const m = /^scalebiz_(starter|pro)_(monthly|yearly)$/.exec(key ?? "");
  return m ? (m[1] as OfferId) : null;
}

export async function stripeConfigured(): Promise<{ secret: boolean; webhook: boolean }> {
  const [secret, webhook] = await Promise.all([getSetting("STRIPE_SECRET_KEY"), getSetting("STRIPE_WEBHOOK_SECRET")]);
  return { secret: Boolean(secret), webhook: Boolean(webhook) };
}

export class StripeNotConfigured extends Error {
  constructor() {
    super("Le paiement n'est pas encore configuré sur ce site (clé Stripe absente).");
  }
}

/* ------------------------------------------------------------------ */
/* HTTP                                                                */
/* ------------------------------------------------------------------ */

type Params = Record<string, unknown>;

/** Stripe's form encoding: nested objects as a[b][c]=…, arrays as a[0]=…. */
export function encodeForm(params: Params, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === "object") out.push(...encodeForm(item as Params, `${key}[${i}]`));
        else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof v === "object") {
      out.push(...encodeForm(v as Params, key));
    } else {
      out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return out;
}

export class StripeError extends Error {
  status: number;
  code: string | null;
  constructor(status: number, message: string, code: string | null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function stripe<T = Record<string, unknown>>(
  method: "GET" | "POST",
  path: string,
  params: Params = {},
): Promise<T> {
  const key = await getSetting("STRIPE_SECRET_KEY");
  if (!key) throw new StripeNotConfigured();

  const body = encodeForm(params).join("&");
  const url = method === "GET" && body ? `${API}${path}?${body}` : `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": STRIPE_API_VERSION,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? body : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
  if (!res.ok) {
    throw new StripeError(res.status, data.error?.message ?? `Stripe a répondu ${res.status}`, data.error?.code ?? null);
  }
  return data as T;
}

/* ------------------------------------------------------------------ */
/* Prices                                                              */
/* ------------------------------------------------------------------ */

const priceCache = new Map<string, { id: string; at: number }>();

/** The active price behind a lookup key, cached for 10 minutes. */
export async function priceIdFor(offer: OfferId, billing: Billing): Promise<string | null> {
  const key = lookupKey(offer, billing);
  const hit = priceCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.id;
  const list = await stripe<{ data: { id: string }[] }>("GET", "/prices", { lookup_keys: [key], active: true, limit: 1 });
  const id = list.data[0]?.id ?? null;
  if (id) priceCache.set(key, { id, at: Date.now() });
  return id;
}

/* ------------------------------------------------------------------ */
/* Webhook signature                                                   */
/* ------------------------------------------------------------------ */

/**
 * Checks the Stripe-Signature header: HMAC-SHA256 of "timestamp.body" with
 * the endpoint secret, compared in constant time, and a timestamp no older
 * than `toleranceSec` (replay protection).
 */
export function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSec = 300,
  now = Math.floor(Date.now() / 1000),
): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim().split("=") as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isFinite(t) || signatures.length === 0) return false;
  if (Math.abs(now - t) > toleranceSec) return false;

  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex"));
  return signatures.some((sig) => {
    const given = Buffer.from(sig);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/* ------------------------------------------------------------------ */
/* Subscription → plan                                                 */
/* ------------------------------------------------------------------ */

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  metadata?: Record<string, string>;
  current_period_end?: number;
  items: { data: { current_period_end?: number; price: { lookup_key: string | null } }[] };
};

/** Statuses during which the customer keeps access. */
const ACTIVE = new Set(["active", "trialing", "past_due"]);

/** Margin after the period end, so a renewal webhook arriving late never cuts access. */
const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Reads a subscription back from Stripe and applies it to the account.
 * Idempotent and order-proof: it always uses Stripe's current state, so a
 * late or duplicated webhook cannot grant or remove anything wrongly.
 */
export async function syncSubscription(subscriptionId: string): Promise<{ userId: string; plan: Plan } | null> {
  const sub = await stripe<StripeSubscription>("GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`);
  const store = getStore();

  const user =
    (sub.metadata?.userId ? await store.getUserById(sub.metadata.userId) : null) ??
    (await store.getUserByStripeCustomer(sub.customer));
  if (!user) {
    console.error(`[stripe] abonnement ${sub.id} sans compte ScaleBiz correspondant`);
    return null;
  }

  const item = sub.items.data[0];
  const offer = offerFromLookupKey(item?.price.lookup_key);

  if (ACTIVE.has(sub.status) && offer) {
    const periodEnd = sub.current_period_end ?? item?.current_period_end;
    const expiresAt = periodEnd ? new Date(periodEnd * 1000 + GRACE_MS).toISOString() : null;
    await store.setStripeIds(user.id, sub.customer, sub.id);
    await store.setPlan(user.id, offer, "stripe", expiresAt);
    return { userId: user.id, plan: offer };
  }

  // Ended or never paid. Only the subscription that drives the plan may take
  // it away — an old cancelled one must not downgrade a newer purchase.
  await store.setStripeIds(user.id, sub.customer, null);
  if (!user.stripeSubscriptionId || user.stripeSubscriptionId === sub.id) {
    if (user.planSource === "stripe" || user.planSource === null) {
      await store.setPlan(user.id, "free", "stripe", null);
    }
  }
  return { userId: user.id, plan: "free" };
}
