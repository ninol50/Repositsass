import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  const store = getStore();
  const [reviews, stats] = await Promise.all([store.listReviews(20), store.reviewStats()]);
  return Response.json({
    stats,
    reviews: reviews.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Connecte-toi pour laisser un avis." }, { status: 401 });
  }

  const limited = rateLimit(clientKey(req, `review:${user.id}`), 5, 60 * 60_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  const body = (await req.json().catch(() => null)) as
    | { rating?: unknown; body?: unknown; authorName?: unknown }
    | null;

  const rating = Math.round(Number(body?.rating));
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  const name = typeof body?.authorName === "string" ? body.authorName.trim() : "";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json({ error: "Choisis une note entre 1 et 5." }, { status: 400 });
  }
  if (text.length < 20) {
    return Response.json({ error: "20 caractères minimum." }, { status: 400 });
  }

  // A review is only credible if the person actually used the product.
  const generated = await getStore().countGenerations(user.id);
  if (generated === 0) {
    return Response.json(
      { error: "Génère au moins un brief avant de laisser un avis." },
      { status: 403 },
    );
  }

  const review = await getStore().createReview({
    userId: user.id,
    authorName: (name || user.email.split("@")[0]).slice(0, 40),
    rating,
    body: text.slice(0, 600),
  });

  return Response.json({ ok: true, id: review.id }, { status: 201 });
}
