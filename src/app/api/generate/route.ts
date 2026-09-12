import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { capabilitiesFor, currentPeriodStart, nextResetLabel } from "@/lib/plans";
import { generatePrompt } from "@/lib/prompt-engine";
import { validateAnswers } from "@/lib/questions";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { databaseFailure, isDatabaseError } from "@/lib/setup";
import { hasActivePlan } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Connecte-toi pour générer un brief." }, { status: 401 });
  }

  const limited = rateLimit(clientKey(req, `generate:${user.id}`), 20, 60 * 60_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  const body = (await req.json().catch(() => null)) as { answers?: unknown } | null;
  const validation = validateAnswers(body?.answers);

  if (!validation.ok) {
    return Response.json(
      { error: "Certaines réponses sont incomplètes.", errors: validation.errors },
      { status: 422 },
    );
  }

  try {
    const store = getStore();
    const caps = capabilitiesFor(user.plan, hasActivePlan(user));

    // Monthly quota, enforced server-side: the client never decides this.
    if (caps.monthlyGenerations !== null) {
      const used = await store.countGenerationsSince(user.id, currentPeriodStart());
      if (used >= caps.monthlyGenerations) {
        return Response.json(
          {
            error:
              `Tu as atteint ta limite de ${caps.monthlyGenerations} briefs ce mois-ci. ` +
              `Elle se remet à zéro le ${nextResetLabel()}.`,
            quota: { used, limit: caps.monthlyGenerations },
            upgrade: true,
          },
          { status: 402 },
        );
      }
    }

    const result = generatePrompt(validation.answers, { depth: caps.briefDepth });
    const generation = await store.createGeneration({
      userId: user.id,
      productName: result.productName,
      summary: result.summary,
      answers: validation.answers,
    });

    return Response.json({ id: generation.id, productName: result.productName }, { status: 201 });
  } catch (err) {
    if (isDatabaseError(err)) return databaseFailure(err);
    throw err;
  }
}
