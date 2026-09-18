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
  const warnings: string[] = [];

  // A malformed DATABASE_URL throws when the client is built. The self-check is
  // exactly the page that must survive that and name it, not answer 500.
  let driver: ReturnType<typeof storageDriver> | null = null;
  try {
    driver = storageDriver();
  } catch (err) {
    return Response.json(
      {
        status: "degraded",
        storage: null,
        database: null,
        billing: billingConfigured(),
        warnings: [
          `DATABASE_URL illisible : ${err instanceof Error ? err.message : "format invalide"}. ` +
            "Attendu : postgresql://utilisateur:motdepasse@hote:port/base — sans guillemets autour.",
        ],
      },
      { status: 503 },
    );
  }

  const db = describeDatabase();

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
  if (!process.env.WHOP_API_KEY) {
    warnings.push(
      "WHOP_API_KEY absente : « J'ai déjà payé » et la réconciliation quotidienne ne peuvent rien vérifier. " +
        "Un webhook perdu = un client qui a payé et reste bloqué.",
    );
  }
  if (!process.env.CRON_SECRET) {
    warnings.push("CRON_SECRET absent : la réconciliation quotidienne refusera de s'exécuter.");
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
      // The three billing paths, so a half-wired deploy shows up here rather
      // than in a customer's complaint.
      billingPaths: {
        webhook: Boolean(process.env.WHOP_WEBHOOK_SECRET),
        recover: Boolean(process.env.WHOP_API_KEY),
        reconcile: Boolean(process.env.WHOP_API_KEY && process.env.CRON_SECRET),
      },
      warnings,
    },
    { status: warnings.length === 0 ? 200 : 503 },
  );
}
