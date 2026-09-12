import { describeDatabase, getStore, storageDriver } from "@/lib/db";
import { billingConfigured } from "@/lib/whop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deployment self-check. Deliberately reports what is NOT configured, so a
 * half-configured production deploy is visible instead of silently degraded.
 *
 * The database is actually queried, not just parsed out of the URL: a wrong
 * password looks identical to a correct one until you open a connection.
 */
export async function GET() {
  const driver = storageDriver();
  const db = describeDatabase();
  const warnings: string[] = [];

  if (driver === "memory") {
    warnings.push("DATABASE_URL absent : les comptes et les briefs disparaissent à chaque redémarrage.");
  }
  if (db?.warning) {
    warnings.push(db.warning);
  }

  const ping = await getStore().ping();
  if (!ping.ok) {
    warnings.push(`Connexion à la base impossible : ${ping.error}`);
  }

  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    warnings.push("AUTH_SECRET absent ou trop court : les sessions ne sont pas sûres.");
  }
  if (!billingConfigured()) {
    warnings.push("Aucun plan Whop résolu : le checkout est indisponible.");
  }
  if (!process.env.WHOP_WEBHOOK_SECRET) {
    warnings.push("WHOP_WEBHOOK_SECRET absent : les webhooks de paiement seront rejetés.");
  }

  return Response.json(
    {
      status: warnings.length === 0 ? "ok" : "degraded",
      storage: driver,
      // Host and port only — never the credentials.
      database: db
        ? { host: db.host, port: db.port, pooled: db.pooled, reachable: ping.ok, ...(ping.ok ? { latencyMs: ping.latencyMs } : {}) }
        : null,
      billing: billingConfigured(),
      warnings,
    },
    { status: warnings.length === 0 ? 200 : 503 },
  );
}
