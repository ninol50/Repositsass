import { currentUser } from "@/lib/auth";
import { grantFromMembership, looksLikeEmail, rememberBillingEmail } from "@/lib/billing";
import { getStore } from "@/lib/db";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isDatabaseError } from "@/lib/setup";
import { hasActivePlan } from "@/lib/types";
import { findMembershipForEmails } from "@/lib/whop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "J'ai déjà payé" — the customer-driven recovery path.
 *
 * The webhook is a single point of failure: when it does not arrive, the
 * customer has paid and stays locked out with nobody aware of it. This route
 * asks Whop directly.
 *
 * Three rules hold here and in the nightly job:
 *  - Whop's answer grants the access, never a claim made in the request;
 *  - it acts on the session account only — an account id in the body would
 *    let anyone unlock somebody else's account;
 *  - the grant goes through the credit journal, so coming back to this page
 *    does not credit twice.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Connecte-toi d'abord." }, { status: 401 });

  const limited = rateLimit(clientKey(req, `recover:${user.id}`), 10, 15 * 60_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  const body = (await req.json().catch(() => null)) as { billingEmail?: string } | null;
  const provided = (body?.billingEmail ?? "").trim().toLowerCase();

  if (provided && !looksLikeEmail(provided)) {
    return Response.json({ ok: false, needsEmail: true, error: "Cette adresse n'est pas valide." });
  }

  try {
    const store = getStore();

    if (provided) {
      // An address already attached to another account would let one customer
      // hoover up someone else's payment.
      const owner = await store.findUserByAnyEmail(provided);
      if (owner && owner.id !== user.id) {
        return Response.json({
          ok: false,
          needsEmail: true,
          error: "Cette adresse est déjà rattachée à un autre compte. Écris-nous si c'est une erreur.",
        });
      }
      await rememberBillingEmail(user, provided);
    }

    const fresh = (await store.getUserById(user.id)) ?? user;
    const lookup = await findMembershipForEmails([fresh.email, fresh.billingEmail, provided]);

    if (!lookup.ok) {
      return Response.json({ ok: false, error: lookup.reason }, { status: lookup.configured ? 502 : 503 });
    }

    if (!lookup.match) {
      const alreadyTriedOtherEmail = Boolean(fresh.billingEmail) || Boolean(provided);
      return Response.json({
        ok: false,
        needsEmail: true,
        error: alreadyTriedOtherEmail
          ? "Aucun abonnement actif trouvé pour cette adresse. Vérifie l'adresse utilisée sur Whop, ou écris-nous."
          : "Aucun abonnement actif trouvé pour l'adresse de ton compte. Si tu as payé avec une autre adresse, indique-la.",
      });
    }

    const granted = await grantFromMembership(fresh, lookup.match, "whop:recover");
    if (!granted.ok) {
      return Response.json({
        ok: false,
        error: "Ce paiement est déjà rattaché à un autre compte. Écris-nous, on règle ça à la main.",
      });
    }

    return Response.json({
      ok: true,
      plan: granted.plan,
      alreadyActive: !granted.applied && hasActivePlan(fresh),
    });
  } catch (err) {
    if (isDatabaseError(err)) {
      return Response.json(
        { ok: false, error: "La base de données ne répond pas. Réessaie dans un instant." },
        { status: 503 },
      );
    }
    throw err;
  }
}
