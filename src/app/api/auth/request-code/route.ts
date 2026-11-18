import { CODE_TTL_MINUTES, emailProblem, generateCode, hashCode } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { sendLoginCode } from "@/lib/email";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { serverFailure, setupBlocker } from "@/lib/setup";

export const runtime = "nodejs";

/**
 * Step 1 of sign-in: emails a 6-digit code.
 *
 * Same answer whether the account exists or not — signing up and logging in
 * are one flow, and the response must not reveal who is registered.
 */
export async function POST(req: Request) {
  const blocker = setupBlocker();
  if (blocker) return Response.json({ error: blocker }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();
  const emailError = emailProblem(email);
  if (emailError) return Response.json({ error: emailError }, { status: 400 });

  // Two limits: per network (someone spraying addresses) and per address
  // (someone flooding one inbox).
  const byIp = rateLimit(clientKey(req, "code-ip"), 10, 10 * 60_000);
  if (!byIp.ok) return tooManyRequests(byIp.retryAfter);
  const byEmail = rateLimit(`code-email:${email}`, 4, 10 * 60_000);
  if (!byEmail.ok) return tooManyRequests(byEmail.retryAfter);

  try {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);
    await getStore().saveLoginCode(email, hashCode(email, code), expiresAt);

    const sent = await sendLoginCode(email, code, CODE_TTL_MINUTES);
    if (!sent.ok) return Response.json({ error: sent.error }, { status: 502 });

    return Response.json({
      ok: true,
      // Development only: lets the flow be tested without an email provider.
      ...(sent.devLogged && process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
    });
  } catch (err) {
    return serverFailure(err, "request-code");
  }
}
