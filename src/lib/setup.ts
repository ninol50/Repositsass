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
  // A malformed DATABASE_URL throws while the client is built: report it
  // instead of letting the route crash with an empty 500.
  let driver: ReturnType<typeof storageDriver>;
  try {
    driver = storageDriver();
  } catch {
    return DATABASE_URL_MALFORMED;
  }

  if (!authConfigured()) {
    return (
      "Ce déploiement n'a pas de AUTH_SECRET configuré, les comptes sont donc désactivés. " +
      "Ajoute la variable d'environnement AUTH_SECRET (32 caractères minimum), puis redéploie."
    );
  }

  if (process.env.NODE_ENV === "production" && driver === "memory") {
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

const DATABASE_URL_MALFORMED =
  "DATABASE_URL est mal écrite. Forme attendue : postgresql://utilisateur:motdepasse@hote:port/base, " +
  "sans guillemets ni espaces. Si ton mot de passe contient @, #, /, ? ou %, il faut l'encoder " +
  "(ou en choisir un sans ces caractères). Corrige la variable dans Vercel, puis redéploie.";

/**
 * Turns ANY error thrown in a route into a JSON answer the form can display.
 *
 * Without this, an unexpected error becomes an HTML 500 and the visitor only
 * sees "something went wrong" — impossible to act on. The raw driver message
 * stays in the server logs: it can contain hostnames.
 */
export function serverFailure(err: unknown, route: string): Response {
  if (isDatabaseError(err)) return databaseFailure(err);

  const code = (err as { code?: string }).code;
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${route}] erreur inattendue (code=${code ?? "aucun"}) : ${message}`);

  // Supabase's pooler (Supavisor) answers XX000 "Tenant or user not found"
  // when the connection string does not match the project: wrong user name
  // (it must be postgres.<project-ref>), wrong region host, or a mix of the
  // direct and pooler strings.
  if (/tenant or user not found/i.test(message)) {
    return Response.json(
      {
        error:
          "Supabase ne reconnaît pas DATABASE_URL (« Tenant or user not found »). Dans Supabase, clique sur " +
          "« Connect », copie telle quelle la chaîne « Transaction pooler » (utilisateur postgres.xxxx, port 6543), " +
          "remplace seulement [YOUR-PASSWORD], colle-la dans Vercel, puis redéploie.",
      },
      { status: 503 },
    );
  }

  if (err instanceof TypeError && /invalid url/i.test(message)) {
    return Response.json({ error: DATABASE_URL_MALFORMED }, { status: 503 });
  }
  if (code === "42501") {
    return Response.json(
      {
        error:
          "La base refuse de créer les tables ScaleBiz (droits insuffisants). " +
          "Utilise l'utilisateur principal de la base dans DATABASE_URL.",
      },
      { status: 503 },
    );
  }

  return Response.json(
    {
      error: `Erreur serveur inattendue${code ? ` (code ${code})` : ""}. Le détail est sur /api/health et dans les logs Vercel.`,
    },
    { status: 500 },
  );
}
