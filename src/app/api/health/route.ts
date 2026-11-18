import { emailConfigured } from "@/lib/email";
import { describeDatabase, getStore, storageDriver } from "@/lib/db";

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
    warnings.push("DATABASE_URL absent : les comptes et les générations disparaissent à chaque redémarrage.");
  }
  if (db?.warning) {
    warnings.push(db.warning);
  }

  const ping = await getStore().ping();
  if (!ping.ok) {
    warnings.push(`Connexion à la base impossible : ${ping.error}`);
  }

  // Reaching the database is not enough: the tables must be creatable too.
  let tablesReady = false;
  if (ping.ok) {
    try {
      await getStore().init();
      tablesReady = true;
    } catch (err) {
      const code = (err as { code?: string }).code;
      const message = err instanceof Error ? err.message : String(err);
      warnings.push(`Création des tables impossible${code ? ` (code ${code})` : ""} : ${message.slice(0, 200)}`);
    }
  }
  if (!emailConfigured()) {
    warnings.push("RESEND_API_KEY absente : aucun code de connexion ne peut être envoyé par email.");
  }
  if (!process.env.ADMIN_EMAILS) {
    warnings.push("ADMIN_EMAILS absent : la page /admin est inaccessible.");
  }

  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    warnings.push("AUTH_SECRET absent ou trop court : les sessions ne sont pas sûres.");
  }
  return Response.json(
    {
      status: warnings.length === 0 ? "ok" : "degraded",
      storage: driver,
      // Host and port only — never the credentials.
      database: db
        ? { host: db.host, port: db.port, pooled: db.pooled, reachable: ping.ok, tablesReady, ...(ping.ok ? { latencyMs: ping.latencyMs } : {}) }
        : null,
      email: emailConfigured(),
      warnings,
    },
    { status: warnings.length === 0 ? 200 : 503 },
  );
}
