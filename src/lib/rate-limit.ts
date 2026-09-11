/**
 * Fixed-window rate limiter, in memory.
 *
 * Honest about its limit: on serverless each instance keeps its own counter, so
 * this slows abuse down but does not stop a distributed attacker. Swap in a
 * shared store (Upstash, Vercel KV) before this matters.
 */

type Entry = { count: number; resetAt: number };

const globalBuckets = globalThis as unknown as { __repositsaas_rl?: Map<string, Entry> };

function buckets(): Map<string, Entry> {
  if (!globalBuckets.__repositsaas_rl) globalBuckets.__repositsaas_rl = new Map();
  return globalBuckets.__repositsaas_rl;
}

export type RateResult = { ok: true } | { ok: false; retryAfter: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const map = buckets();
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || entry.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    if (map.size > 5000) {
      for (const [k, v] of map) if (v.resetAt <= now) map.delete(k);
    }
    return { ok: true };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true };
}

/** Best-effort client identity behind a proxy. */
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}

export function tooManyRequests(retryAfter: number): Response {
  return Response.json(
    { error: `Trop de tentatives. Réessaie dans ${retryAfter} secondes.` },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
