import { timingSafeEqual } from "crypto";
import { grantFromMembership } from "@/lib/billing";
import { getStore } from "@/lib/db";
import { listValidMemberships } from "@/lib/whop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Nightly reconciliation: every valid membership on Whop, confronted with the
 * accounts here.
 *
 * The webhook and the recovery button both need something to happen — a
 * delivery that arrives, or a customer who thinks to click. This job needs
 * neither: it catches the customer who paid, was never credited, and never
 * complained. That customer exists, and never writes in; they just churn.
 *
 * Runs as a Vercel cron (see vercel.json), which sends
 * `Authorization: Bearer $CRON_SECRET`.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // No secret configured: refuse rather than expose an endpoint that writes plans.
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const provided = header.replace(/^Bearer\s+/i, "").trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  const lookup = await listValidMemberships();
  if (!lookup.ok) {
    return Response.json({ ok: false, error: lookup.reason }, { status: lookup.configured ? 502 : 503 });
  }

  const store = getStore();
  const accounts = await store.listAccountsForReconcile(2000);

  // One pass over the accounts, indexed by every address they can be reached
  // at. A membership with no email cannot be matched to anybody.
  const byEmail = new Map<string, (typeof accounts)[number]>();
  for (const a of accounts) {
    byEmail.set(a.email.toLowerCase(), a);
    if (a.billingEmail) byEmail.set(a.billingEmail.toLowerCase(), a);
  }

  let repaired = 0;
  let alreadyFine = 0;
  let unmatched = 0;
  let conflicts = 0;
  const unmatchedEmails: string[] = [];

  for (const membership of lookup.memberships) {
    const account = membership.email ? byEmail.get(membership.email) : undefined;

    if (!account) {
      unmatched += 1;
      // Kept so the miss is actionable: these are paying customers with no
      // account here, or an account under a third address.
      if (unmatchedEmails.length < 50 && membership.email) unmatchedEmails.push(membership.email);
      continue;
    }

    const granted = await grantFromMembership(account, membership, "whop:reconcile");
    if (!granted.ok) {
      conflicts += 1;
      continue;
    }
    if (granted.applied) repaired += 1;
    else alreadyFine += 1;
  }

  const summary = {
    ok: true,
    checkedMemberships: lookup.memberships.length,
    accounts: accounts.length,
    repaired,
    alreadyFine,
    unmatched,
    conflicts,
    unmatchedEmails,
    ranAt: new Date().toISOString(),
  };

  // Logged as well as returned: a cron nobody reads is still in the runtime logs.
  console.log("[billing] réconciliation", JSON.stringify({ ...summary, unmatchedEmails: unmatched }));

  return Response.json(summary);
}
