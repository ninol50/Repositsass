import { storageDriver } from "@/lib/db";
import { billingConfigured } from "@/lib/whop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deployment self-check. Deliberately reports what is NOT configured, so a
 * half-configured production deploy is visible instead of silently degraded.
 */
export async function GET() {
  const driver = storageDriver();
  const warnings: string[] = [];

  if (driver === "memory") {
    warnings.push("DATABASE_URL absent : les comptes et les briefs disparaissent à chaque redémarrage.");
  }
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    warnings.push("AUTH_SECRET absent ou trop court : les sessions ne sont pas sûres.");
  }
  if (!billingConfigured()) {
    warnings.push("Aucun WHOP_PLAN_*_ID configuré : le checkout est indisponible.");
  }
  if (!process.env.WHOP_WEBHOOK_SECRET) {
    warnings.push("WHOP_WEBHOOK_SECRET absent : les webhooks de paiement seront rejetés.");
  }

  return Response.json({
    status: warnings.length === 0 ? "ok" : "degraded",
    storage: driver,
    billing: billingConfigured(),
    warnings,
  });
}
