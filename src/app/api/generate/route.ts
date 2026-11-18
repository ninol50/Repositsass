import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { validateAnswers } from "@/lib/questions";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { databaseFailure, isDatabaseError } from "@/lib/setup";

export const runtime = "nodejs";

/**
 * Saves a completed questionnaire. An account is mandatory: this is the point
 * where the visitor's generation "stops" until they sign up.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Crée ton compte pour lancer la génération." }, { status: 401 });
  }

  const limited = rateLimit(clientKey(req, `generate:${user.id}`), 30, 60 * 60_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  const body = (await req.json().catch(() => null)) as { answers?: unknown } | null;
  const validation = validateAnswers(body?.answers);
  if (!validation.ok) {
    return Response.json(
      { error: "Certaines réponses sont invalides.", errors: validation.errors },
      { status: 422 },
    );
  }

  try {
    const generation = await getStore().createGeneration(user.id, validation.answers);
    return Response.json({ id: generation.id }, { status: 201 });
  } catch (err) {
    if (isDatabaseError(err)) return databaseFailure(err);
    throw err;
  }
}
