import { emailProblem, hashCode, setSessionCookie } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { serverFailure, setupBlocker } from "@/lib/setup";

export const runtime = "nodejs";

const MESSAGES = {
  invalid: "Code incorrect. Vérifie les 6 chiffres reçus par email.",
  expired: "Ce code a expiré ou a déjà servi. Demande un nouveau code.",
  too_many: "Trop d'essais pour ce code. Demande un nouveau code.",
} as const;

/**
 * Step 2 of sign-in: checks the code, creates the account on first use, and
 * opens the session. There is no separate sign-up.
 */
export async function POST(req: Request) {
  const blocker = setupBlocker();
  if (blocker) return Response.json({ error: blocker }, { status: 503 });

  const limited = rateLimit(clientKey(req, "verify"), 20, 10 * 60_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  const body = (await req.json().catch(() => null)) as { email?: string; code?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();
  const code = (body?.code ?? "").replace(/\s/g, "");

  if (emailProblem(email)) return Response.json({ error: "Adresse email invalide." }, { status: 400 });
  if (!/^\d{6}$/.test(code)) {
    return Response.json({ error: "Le code fait 6 chiffres." }, { status: 400 });
  }

  try {
    const store = getStore();
    const check = await store.consumeLoginCode(email, hashCode(email, code));
    if (check !== "ok") {
      return Response.json({ error: MESSAGES[check], expired: check !== "invalid" }, { status: 401 });
    }

    const user = (await store.getUserByEmail(email)) ?? (await store.createUser(email));
    await setSessionCookie(user.id);
    return Response.json({ ok: true });
  } catch (err) {
    return serverFailure(err, "verify-code");
  }
}
