import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { serverFailure, setupBlocker } from "@/lib/setup";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocker = setupBlocker();
  if (blocker) return Response.json({ error: blocker }, { status: 503 });

  const limited = rateLimit(clientKey(req, "login"), 10, 10 * 60_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";

  if (!email || !password) {
    return Response.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }

  try {
    const store = getStore();
    await store.init();
    const user = await store.getUserByEmail(email);

    if (user && !user.passwordHash) {
      return Response.json(
        {
          error:
            "Ce compte n'a pas encore de mot de passe. Utilise « Créer un compte » avec cet email pour en choisir un.",
        },
        { status: 401 },
      );
    }

    // Same message and comparable timing whether the account exists or not.
    const valid = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !valid) {
      return Response.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
    }

    await setSessionCookie(user.id);
    return Response.json({ ok: true });
  } catch (err) {
    return serverFailure(err, "login");
  }
}
