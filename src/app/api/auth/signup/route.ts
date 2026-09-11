import {
  emailProblem,
  hashPassword,
  passwordProblem,
  setSessionCookie,
} from "@/lib/auth";
import { getStore } from "@/lib/db";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = rateLimit(clientKey(req, "signup"), 8, 10 * 60_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";

  const emailError = emailProblem(email);
  if (emailError) return Response.json({ error: emailError }, { status: 400 });

  const passwordError = passwordProblem(password);
  if (passwordError) return Response.json({ error: passwordError }, { status: 400 });

  const store = getStore();
  await store.init();

  const existing = await store.getUserByEmail(email);
  if (existing) {
    return Response.json(
      { error: "Un compte existe déjà avec cet email. Connecte-toi." },
      { status: 409 },
    );
  }

  const user = await store.createUser(email, await hashPassword(password));
  await setSessionCookie(user.id);

  return Response.json({ ok: true, email: user.email }, { status: 201 });
}
