/**
 * Deployment self-check shared by the API routes.
 *
 * A production deploy missing AUTH_SECRET or DATABASE_URL will "work" in the
 * worst possible way: accounts get created, then silently vanish on the next
 * cold start. Failing loudly with an actionable message is better than that.
 */

import { authConfigured } from "./auth";
import { storageDriver } from "./db";

export function setupBlocker(): string | null {
  if (!authConfigured()) {
    return (
      "Ce déploiement n'a pas de AUTH_SECRET configuré, les comptes sont donc désactivés. " +
      "Ajoute la variable d'environnement AUTH_SECRET (32 caractères minimum), puis redéploie."
    );
  }

  if (process.env.NODE_ENV === "production" && storageDriver() === "memory") {
    return (
      "Ce déploiement n'a pas de base de données configurée : un compte créé maintenant " +
      "disparaîtrait au prochain redémarrage. Renseigne DATABASE_URL, puis redéploie."
    );
  }

  return null;
}

/** What a visitor is told when the database refuses the connection. */
const DB_DOWN_PUBLIC =
  "Le service est momentanément indisponible : la base de données ne répond pas. " +
  "Réessaie dans quelques minutes.";

/**
 * Turns a thrown database error into a 503 with a message that helps, instead
 * of the generic "something went wrong" a caught exception produces.
 *
 * The visitor never sees the credentials or the driver error; the operator
 * gets the detail in the server logs and in /api/health.
 */
export function databaseFailure(err: unknown): Response {
  const code = (err as { code?: string }).code;
  const message = err instanceof Error ? err.message : String(err);

  console.error(`[db] requête impossible (code=${code ?? "inconnu"}) : ${message}`);

  return Response.json(
    { error: DB_DOWN_PUBLIC, hint: "Diagnostic complet sur /api/health." },
    { status: 503 },
  );
}

/** True for errors that mean "the database is unreachable or refused us". */
export function isDatabaseError(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  if (typeof code === "string") {
    // 28P01 wrong password, 3D000 unknown database, 08xxx connection errors.
    if (/^(28|08|3D|53|57)/.test(code)) return true;
    if (["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"].includes(code)) return true;
  }
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  return (
    message.includes("password authentication") ||
    message.includes("connect") ||
    message.includes("timeout") ||
    message.includes("terminated")
  );
}
