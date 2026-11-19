import { getSetting } from "@/lib/settings";
import { syncSubscription, verifyStripeSignature } from "@/lib/stripe";

export const runtime = "nodejs";

type StripeEvent = {
  id: string;
  type: string;
  data: { object: { id?: string; object?: string; subscription?: string | null } };
};

/**
 * Stripe → ScaleBiz. Every event that can change a subscription ends in
 * syncSubscription(), which re-reads the subscription from Stripe: the event
 * body is only used to know WHICH subscription to look at.
 *
 * A failure answers 500 so that Stripe retries.
 */
export async function POST(req: Request) {
  const secret = await getSetting("STRIPE_WEBHOOK_SECRET");
  if (!secret) return Response.json({ error: "Webhook non configuré." }, { status: 503 });

  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret)) {
    return Response.json({ error: "Signature invalide." }, { status: 400 });
  }

  const event = JSON.parse(raw) as StripeEvent;
  const obj = event.data.object;

  let subscriptionId: string | null = null;
  switch (event.type) {
    case "checkout.session.completed":
    case "invoice.paid":
    case "invoice.payment_failed":
      subscriptionId = obj.subscription ?? null;
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      subscriptionId = obj.id ?? null;
      break;
    default:
      return Response.json({ received: true, ignored: event.type });
  }

  if (!subscriptionId) return Response.json({ received: true, ignored: "pas d'abonnement" });

  try {
    const result = await syncSubscription(subscriptionId);
    return Response.json({ received: true, plan: result?.plan ?? null });
  } catch (err) {
    console.error(`[stripe] webhook ${event.id} (${event.type}) : ${err instanceof Error ? err.message : err}`);
    return Response.json({ error: "Traitement impossible, Stripe va réessayer." }, { status: 500 });
  }
}
