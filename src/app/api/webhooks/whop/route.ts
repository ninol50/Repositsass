import { getStore } from "@/lib/db";
import type { Plan } from "@/lib/types";
import {
  GRANTING_EVENTS,
  REVOKING_EVENTS,
  planFromWhopPlanId,
  verifyWebhookSignature,
  type WhopWebhookEvent,
} from "@/lib/whop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Events already applied, so a retry of the same delivery is a no-op. */
const globalSeen = globalThis as unknown as { __repositsaas_webhook_seen?: Set<string> };
function seen(): Set<string> {
  if (!globalSeen.__repositsaas_webhook_seen) globalSeen.__repositsaas_webhook_seen = new Set();
  return globalSeen.__repositsaas_webhook_seen;
}

function headerSignature(req: Request): string | null {
  return (
    req.headers.get("x-whop-signature") ??
    req.headers.get("whop-signature") ??
    req.headers.get("x-signature")
  );
}

export async function POST(req: Request) {
  const raw = await req.text();

  if (!verifyWebhookSignature(raw, headerSignature(req))) {
    // Never grant access on an unverified payload, whatever it claims.
    return Response.json({ error: "Signature invalide." }, { status: 401 });
  }

  let event: WhopWebhookEvent;
  try {
    event = JSON.parse(raw) as WhopWebhookEvent;
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const action = (event.action ?? event.event ?? "").toLowerCase();
  const data = event.data ?? {};
  const membershipId = data.id ?? null;

  const deliveryId = req.headers.get("x-whop-event-id") ?? `${action}:${membershipId ?? raw.length}`;
  if (seen().has(deliveryId)) return Response.json({ ok: true, deduplicated: true });

  const store = getStore();
  await store.init();

  // The account is matched by the metadata we attached to the checkout link,
  // and by email as a fallback.
  const metaUserId = typeof data.metadata?.user_id === "string" ? data.metadata.user_id : null;
  const email = data.user?.email ?? data.email ?? null;

  let user = metaUserId ? await store.getUserById(metaUserId) : null;
  if (!user && email) user = await store.getUserByEmail(email);

  if (!user) {
    // Acknowledge so Whop stops retrying; the customer can still use the
    // licence-key page, which matches on their own account.
    console.warn("[whop] paiement reçu sans compte correspondant", { action, email, metaUserId });
    return Response.json({ ok: true, matched: false });
  }

  if (GRANTING_EVENTS.has(action)) {
    const plan: Plan = planFromWhopPlanId(data.plan_id);
    const expiresAt =
      typeof data.renewal_period_end === "number"
        ? new Date(data.renewal_period_end * 1000).toISOString()
        : null;
    await store.setPlan(user.id, plan, `whop:${action}`, expiresAt, membershipId);
  } else if (REVOKING_EVENTS.has(action)) {
    await store.setPlan(user.id, "free", `whop:${action}`, null, membershipId);
  } else {
    return Response.json({ ok: true, ignored: action });
  }

  seen().add(deliveryId);
  if (seen().size > 2000) seen().clear();

  return Response.json({ ok: true });
}
