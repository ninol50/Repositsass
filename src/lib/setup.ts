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
