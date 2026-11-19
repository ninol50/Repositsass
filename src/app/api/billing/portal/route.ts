import { currentUser } from "@/lib/auth";
import { siteOrigin } from "@/lib/origin";
import { serverFailure } from "@/lib/setup";
import { StripeError, StripeNotConfigured, stripe } from "@/lib/stripe";

export const runtime = "nodejs";

/** Stripe's customer portal: change offer, update the card, cancel. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Connecte-toi." }, { status: 401 });
  if (!user.stripeCustomerId) {
    return Response.json({ error: "Aucun abonnement à gérer sur ce compte." }, { status: 404 });
  }
  try {
    const session = await stripe<{ url: string }>("POST", "/billing_portal/sessions", {
      customer: user.stripeCustomerId,
      return_url: `${siteOrigin(req)}/dashboard`,
      locale: "fr",
    });
    return Response.json({ url: session.url });
  } catch (err) {
    if (err instanceof StripeNotConfigured) return Response.json({ error: err.message }, { status: 503 });
    if (err instanceof StripeError) {
      console.error(`[stripe] portail refusé (${err.status}) : ${err.message}`);
      return Response.json({ error: "La gestion de l'abonnement est indisponible. Réessaie plus tard." }, { status: 502 });
    }
    return serverFailure(err, "portal");
  }
}
