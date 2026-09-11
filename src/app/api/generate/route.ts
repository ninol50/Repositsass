import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { generatePrompt } from "@/lib/prompt-engine";
import { validateAnswers } from "@/lib/questions";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

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

  const result = generatePrompt(validation.answers);
  const generation = await getStore().createGeneration({
    userId: user.id,
    productName: result.productName,
    summary: result.summary,
    answers: validation.answers,
  });

  return Response.json({ id: generation.id, productName: result.productName }, { status: 201 });
}
