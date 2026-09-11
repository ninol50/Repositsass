import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateLicenseKey } from "@/lib/whop";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Connecte-toi d'abord." }, { status: 401 });

  const limited = rateLimit(clientKey(req, `license:${user.id}`), 10, 15 * 60_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  const body = (await req.json().catch(() => null)) as { licenseKey?: string } | null;
  const key = (body?.licenseKey ?? "").trim();
  if (!key) return Response.json({ error: "Entre ta clé de licence." }, { status: 400 });

  const check = await validateLicenseKey(key);
  if (!check.ok) return Response.json({ error: check.reason }, { status: 400 });

  await getStore().setPlan(user.id, check.plan, "whop:license", check.expiresAt, check.membershipId);
  return Response.json({ ok: true, plan: check.plan });
}
