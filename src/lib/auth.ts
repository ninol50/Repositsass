/**
 * Sessions and password handling.
 *
 * The JWT part uses `jose` so middleware (Edge runtime) can verify a session
 * without touching node:crypto. Password hashing stays in Node route handlers.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getStore } from "./db";
import { toPublicUser, type PublicUser, type User } from "./types";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "rs_session";
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

/* ---------------------------- passwords ---------------------------- */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const derived = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "8 caracteres minimum.";
  if (password.length > 200) return "Mot de passe trop long.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Ajoute au moins une lettre et un chiffre.";
  }
  return null;
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
    .setIssuer("repositsaas")
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key);
}

export async function readSessionToken(token: string): Promise<string | null> {
  const key = secretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { issuer: "repositsaas" });
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
