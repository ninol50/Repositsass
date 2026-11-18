import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { promoEndsAt } from "@/lib/plans";
import { validateAnswers } from "@/lib/questions";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { serverFailure } from "@/lib/setup";

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

  const body = (await req.json().catch(() => null)) as { answers?: unknown; consent?: unknown } | null;
  if (body?.consent !== true) {
    return Response.json(
      { error: "Accepte que tes réponses soient analysées pour générer ton plan." },
      { status: 422 },
    );
  }
  const validation = validateAnswers(body?.answers);
  if (!validation.ok) {
    return Response.json(
      { error: "Certaines réponses sont invalides.", errors: validation.errors },
      { status: 422 },
    );
  }

  try {
    const generation = await getStore().createGeneration(user.id, validation.answers);
    return Response.json(
      { id: generation.id, promoEndsAt: promoEndsAt(generation.createdAt).toISOString() },
      { status: 201 },
    );
  } catch (err) {
    return serverFailure(err, "generate");
  }
}
