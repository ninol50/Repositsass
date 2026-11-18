/**
 * Sessions and sign-in codes.
 *
 * The JWT part uses `jose` so middleware (Edge runtime) can verify a session
 * without touching node:crypto. Sign-in codes are hashed in Node route handlers.
 */

import { createHmac, randomInt } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getStore } from "./db";
import { toPublicUser, type PublicUser, type User } from "./types";

export const SESSION_COOKIE = "sb_session";
const SESSION_DAYS = 30;

export const AUTH_SECRET_MISSING =
  "Ce déploiement n'a pas de AUTH_SECRET configuré, les comptes sont donc désactivés. " +
  "Ajoute la variable d'environnement AUTH_SECRET (32 caractères minimum) dans Vercel, puis redéploie.";

/** True when sessions can actually be signed and verified. */
export function authConfigured(): boolean {
  const raw = process.env.AUTH_SECRET;
  if (raw && raw.length >= 32) return true;
  return process.env.NODE_ENV !== "production";
}

/**
 * Returns null instead of throwing when the secret is missing, so a
 * half-configured deployment renders as "logged out" rather than 500-ing every
 * page. The write path (signup/login) refuses loudly instead — see
 * `requireAuthConfigured`.
 */
function secretKey(): Uint8Array | null {
  const raw = process.env.AUTH_SECRET;
  if (raw && raw.length >= 32) return new TextEncoder().encode(raw);
  if (process.env.NODE_ENV === "production") return null;
  // Dev only: stable per-process key so hot reloads keep you logged in.
  return new TextEncoder().encode("dev-only-insecure-secret-change-me-0123456789");
}

/* --------------------------- email codes ---------------------------- */

/** How long an emailed sign-in code stays valid. */
export const CODE_TTL_MINUTES = 10;

/** Six digits, uniformly drawn (randomInt has no modulo bias). */
export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * The code is never stored in clear: a database leak must not hand out
 * working codes. Keyed with AUTH_SECRET and bound to the email, so a hash
 * copied from one row is useless for another address.
 */
export function hashCode(email: string, code: string): string {
  const key = secretKey() ?? new TextEncoder().encode("unconfigured");
  return createHmac("sha256", Buffer.from(key)).update(`${email.toLowerCase()}:${code}`).digest("hex");
}

export function emailProblem(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Adresse email invalide.";
  if (email.length > 254) return "Adresse email trop longue.";
  return null;
}

/* ----------------------------- sessions ---------------------------- */

export async function createSessionToken(userId: string): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error(AUTH_SECRET_MISSING);
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("scalebiz")
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key);
}

export async function readSessionToken(token: string): Promise<string | null> {
  const key = secretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { issuer: "scalebiz" });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string): Promise<void> {
  const token = await createSessionToken(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Current user, or null. Never throws. */
export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await readSessionToken(token);
  if (!userId) return null;
  return getStore().getUserById(userId);
}

export async function currentPublicUser(): Promise<PublicUser | null> {
  const u = await currentUser();
  return u ? toPublicUser(u) : null;
}
