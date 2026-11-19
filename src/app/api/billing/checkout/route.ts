import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { siteOrigin } from "@/lib/origin";
import { promoActive, promoEndsAt, type Billing } from "@/lib/plans";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { serverFailure } from "@/lib/setup";
import { StripeError, StripeNotConfigured, launchCouponId, priceIdFor, stripe, type OfferId } from "@/lib/stripe";
import { hasActivePlan } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Opens a Stripe Checkout page for an offer.
 *
 * The launch price (first month) is applied ONLY when the server sees that the
 * countdown of this person's own questionnaire is still running.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Connecte-toi pour choisir ton offre." }, { status: 401 });

  const limited = rateLimit(clientKey(req, `checkout:${user.id}`), 20, 10 * 60_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  const body = (await req.json().catch(() => null)) as {
    offer?: unknown;
    billing?: unknown;
    generationId?: unknown;
    returnPath?: unknown;
  } | null;
  const offer = body?.offer === "starter" || body?.offer === "pro" ? (body.offer as OfferId) : null;
  const billing: Billing = body?.billing === "yearly" ? "yearly" : "monthly";
  if (!offer) return Response.json({ error: "Offre inconnue." }, { status: 400 });
  const returnPath =
    typeof body?.returnPath === "string" && body.returnPath.startsWith("/") && !body.returnPath.startsWith("//")
      ? body.returnPath
      : "/pricing";

  // Already subscribed: changes go through the customer portal, so nobody
  // ends up with two subscriptions.
  if (user.stripeSubscriptionId && hasActivePlan(user)) {
    return Response.json(
      { error: "Tu as déjà un abonnement : change d'offre depuis « Gérer mon abonnement ».", portal: true },
      { status: 409 },
    );
  }

  try {
    const price = await priceIdFor(offer, billing);
    if (!price) {
      return Response.json({ error: "Cette offre n'est pas encore en vente. Réessaie plus tard." }, { status: 503 });
    }

    let launch = false;
    if (billing === "monthly" && typeof body?.generationId === "string") {
      const generation = await getStore().getGeneration(body.generationId);
      launch = Boolean(
        generation && generation.userId === user.id && promoActive(promoEndsAt(generation.createdAt)),
      );
    }

    const origin = siteOrigin(req);
    const session = await stripe<{ url: string }>("POST", "/checkout/sessions", {
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      ...(launch ? { discounts: [{ coupon: launchCouponId(offer) }] } : { allow_promotion_codes: true }),
      client_reference_id: user.id,
      ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
      subscription_data: { metadata: { userId: user.id, offer } },
      metadata: { userId: user.id, offer, billing, launch: launch ? "1" : "0" },
      locale: "fr",
      success_url: `${origin}/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnPath}`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    if (err instanceof StripeNotConfigured) return Response.json({ error: err.message }, { status: 503 });
    if (err instanceof StripeError) {
      console.error(`[stripe] checkout refusé (${err.status}) : ${err.message}`);
      return Response.json({ error: "Le paiement n'a pas pu s'ouvrir. Réessaie dans un instant." }, { status: 502 });
    }
    return serverFailure(err, "checkout");
  }
}
