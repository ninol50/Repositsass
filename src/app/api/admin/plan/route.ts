import { isAdminEmail } from "@/lib/admin";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { isPlan } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Sets a user's plan by hand, from /admin.
 *
 * Until payment is wired this is how an offer gets granted (to test the
 * paywall, or for a customer paid outside the site). Admin-only, re-checked
 * here: the page hiding the form is not a security boundary.
 */
export async function POST(req: Request) {
  const admin = await currentUser();
  if (!admin || !isAdminEmail(admin.email)) {
    return Response.json({ error: "Introuvable." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as { userId?: unknown; plan?: unknown } | null;
  const userId = typeof body?.userId === "string" ? body.userId : "";
  if (!isPlan(body?.plan)) return Response.json({ error: "Plan inconnu." }, { status: 400 });

  const store = getStore();
  const target = await store.getUserById(userId);
  if (!target) return Response.json({ error: "Compte introuvable." }, { status: 404 });

  await store.setPlan(target.id, body.plan, "admin", null);
  return Response.json({ ok: true, plan: body.plan });
}
