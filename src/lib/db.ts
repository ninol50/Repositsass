/**
 * Storage layer.
 *
 * Two drivers behind one interface:
 *  - postgres  : any standard Postgres — Supabase, Neon, Vercel Postgres, Railway,
 *                or a local cluster. Enabled as soon as DATABASE_URL is set.
 *  - memory    : local development and previews, resets on every cold start
 *
 * The memory driver is deliberately not a fallback we hide: /api/health reports
 * which one is live, so a production deploy without a database is visible.
 *
 * Tables are prefixed `sb_` so ScaleBiz can share a database with another app
 * without colliding with its tables.
 */

import { randomUUID, timingSafeEqual } from "crypto";
import type { Answers } from "./questions";
import { hasActivePlan, type Generation, type Plan, type User } from "./types";

export type Driver = "postgres" | "memory";

export interface Store {
  driver: Driver;
  init(): Promise<void>;
  createUser(email: string): Promise<User>;
  /** Stores a fresh sign-in code for this email, replacing any previous one. */
  saveLoginCode(email: string, codeHash: string, expiresAt: Date): Promise<void>;
  /**
   * Checks a code and burns it on success. Each wrong guess counts: after
   * MAX_CODE_ATTEMPTS the code is dead and a new one must be requested.
   */
  consumeLoginCode(email: string, codeHash: string): Promise<CodeCheck>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  setPlan(userId: string, plan: Plan, source: string, expiresAt: string | null): Promise<void>;
  createGeneration(userId: string, answers: Answers): Promise<Generation>;
  getGeneration(id: string): Promise<Generation | null>;
  listGenerations(userId: string, limit?: number): Promise<Generation[]>;
  /** Real round-trip to the store, so a health check proves more than config parsing. */
  ping(): Promise<PingResult>;
  /** Back-office: the signed-up accounts, newest first. */
  listUsers(limit?: number): Promise<AdminUser[]>;
  adminStats(): Promise<AdminStats>;
}

export type CodeCheck = "ok" | "invalid" | "expired" | "too_many";

export const MAX_CODE_ATTEMPTS = 5;

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** A row of the admin table. */
export type AdminUser = {
  id: string;
  email: string;
  plan: Plan;
  planSource: string | null;
  planExpiresAt: string | null;
  createdAt: string;
  generationCount: number;
};

export type AdminStats = {
  users: number;
  paying: number;
  generations: number;
  signupsLast7Days: number;
};

export type PingResult = { ok: true; latencyMs: number } | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* Memory driver                                                       */
/* ------------------------------------------------------------------ */

type MemoryCode = { codeHash: string; expiresAt: number; attempts: number };

type MemoryState = {
  users: Map<string, User>;
  generations: Map<string, Generation>;
  codes: Map<string, MemoryCode>;
};

const globalMemory = globalThis as unknown as { __scalebiz_memory?: MemoryState };

function memoryState(): MemoryState {
  if (!globalMemory.__scalebiz_memory) {
    globalMemory.__scalebiz_memory = { users: new Map(), generations: new Map(), codes: new Map() };
  }
  return globalMemory.__scalebiz_memory;
}

class MemoryStore implements Store {
  driver: Driver = "memory";

  async init() {
    memoryState();
  }

  async createUser(email: string): Promise<User> {
    const user: User = {
      id: randomUUID(),
      email: email.toLowerCase(),
      plan: "free",
      planSource: null,
      planExpiresAt: null,
      createdAt: new Date().toISOString(),
    };
    memoryState().users.set(user.id, user);
    return user;
  }

  async getUserByEmail(email: string) {
    const target = email.toLowerCase();
    for (const u of memoryState().users.values()) if (u.email === target) return u;
    return null;
  }

  async saveLoginCode(email: string, codeHash: string, expiresAt: Date) {
    memoryState().codes.set(email.toLowerCase(), { codeHash, expiresAt: expiresAt.getTime(), attempts: 0 });
  }

  async consumeLoginCode(email: string, codeHash: string): Promise<CodeCheck> {
    const codes = memoryState().codes;
    const key = email.toLowerCase();
    const row = codes.get(key);
    if (!row || row.expiresAt <= Date.now()) return "expired";
    if (row.attempts >= MAX_CODE_ATTEMPTS) return "too_many";
    if (!sameHash(row.codeHash, codeHash)) {
      row.attempts += 1;
      return row.attempts >= MAX_CODE_ATTEMPTS ? "too_many" : "invalid";
    }
    codes.delete(key);
    return "ok";
  }

  async getUserById(id: string) {
    return memoryState().users.get(id) ?? null;
  }

  async setPlan(userId: string, plan: Plan, source: string, expiresAt: string | null) {
    const u = memoryState().users.get(userId);
    if (!u) return;
    u.plan = plan;
    u.planSource = source;
    u.planExpiresAt = expiresAt;
  }

  async createGeneration(userId: string, answers: Answers) {
    const gen: Generation = { id: randomUUID(), userId, answers, createdAt: new Date().toISOString() };
    memoryState().generations.set(gen.id, gen);
    return gen;
  }

  async getGeneration(id: string) {
    return memoryState().generations.get(id) ?? null;
  }

  async listGenerations(userId: string, limit = 50) {
    return [...memoryState().generations.values()]
      .filter((g) => g.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async ping(): Promise<PingResult> {
    return { ok: true, latencyMs: 0 };
  }

  async listUsers(limit = 200): Promise<AdminUser[]> {
    const gens = [...memoryState().generations.values()];
    return [...memoryState().users.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((u) => ({
        id: u.id,
        email: u.email,
        plan: u.plan,
        planSource: u.planSource,
        planExpiresAt: u.planExpiresAt,
        createdAt: u.createdAt,
        generationCount: gens.filter((g) => g.userId === u.id).length,
      }));
  }

  async adminStats(): Promise<AdminStats> {
    const users = [...memoryState().users.values()];
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      users: users.length,
      paying: users.filter((u) => hasActivePlan(u)).length,
      generations: memoryState().generations.size,
      signupsLast7Days: users.filter((u) => new Date(u.createdAt).getTime() > weekAgo).length,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Postgres driver                                                     */
/* ------------------------------------------------------------------ */

type SqlRow = Record<string, unknown>;
type SqlClient = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<SqlRow[]>;

function rowToUser(r: SqlRow): User {
  return {
    id: String(r.id),
    email: String(r.email),
    plan: String(r.plan) as Plan,
    planSource: r.plan_source ? String(r.plan_source) : null,
    planExpiresAt: r.plan_expires_at ? new Date(String(r.plan_expires_at)).toISOString() : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
  };
}

function rowToGeneration(r: SqlRow): Generation {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    answers: (typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers) as Answers,
    createdAt: new Date(String(r.created_at)).toISOString(),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class PostgresStore implements Store {
  driver: Driver = "postgres";
  private sql: SqlClient;
  private ready: Promise<void> | null = null;

  constructor(sql: SqlClient) {
    this.sql = sql;
  }

  async init() {
    // A failed migration must be retried on the next call, not cached forever.
    if (!this.ready) this.ready = this.migrate().catch((err) => {
      this.ready = null;
      throw err;
    });
    return this.ready;
  }

  private async migrate() {
    const sql = this.sql;
    await sql`CREATE TABLE IF NOT EXISTS sb_users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      password_hash text,
      plan text NOT NULL DEFAULT 'free',
      plan_source text,
      plan_expires_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS sb_generations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES sb_users(id) ON DELETE CASCADE,
      answers jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS sb_generations_user_idx ON sb_generations(user_id, created_at DESC)`;

    // Sign-in is by emailed code now. Tables created while passwords existed
    // keep the column, but it must accept accounts that have none.
    await sql`ALTER TABLE sb_users ALTER COLUMN password_hash DROP NOT NULL`;
    await sql`CREATE TABLE IF NOT EXISTS sb_login_codes (
      email text PRIMARY KEY,
      code_hash text NOT NULL,
      expires_at timestamptz NOT NULL,
      attempts int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
  }

  async createUser(email: string) {
    await this.init();
    // ON CONFLICT: two verifications racing for a brand-new email must end
    // with one account, not a unique-violation error.
    const rows = await this.sql`
      INSERT INTO sb_users (email) VALUES (${email.toLowerCase()})
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING *`;
    return rowToUser(rows[0]);
  }

  async saveLoginCode(email: string, codeHash: string, expiresAt: Date) {
    await this.init();
    await this.sql`
      INSERT INTO sb_login_codes (email, code_hash, expires_at, attempts, created_at)
      VALUES (${email.toLowerCase()}, ${codeHash}, ${expiresAt.toISOString()}, 0, now())
      ON CONFLICT (email) DO UPDATE
        SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, created_at = now()`;
  }

  async consumeLoginCode(email: string, codeHash: string): Promise<CodeCheck> {
    await this.init();
    const key = email.toLowerCase();
    const rows = await this.sql`
      SELECT code_hash, expires_at, attempts FROM sb_login_codes WHERE email = ${key} LIMIT 1`;
    const row = rows[0];
    if (!row || new Date(String(row.expires_at)).getTime() <= Date.now()) return "expired";
    if (Number(row.attempts) >= MAX_CODE_ATTEMPTS) return "too_many";

    if (!sameHash(String(row.code_hash), codeHash)) {
      const updated = await this.sql`
        UPDATE sb_login_codes SET attempts = attempts + 1 WHERE email = ${key} RETURNING attempts`;
      return Number(updated[0]?.attempts ?? MAX_CODE_ATTEMPTS) >= MAX_CODE_ATTEMPTS ? "too_many" : "invalid";
    }

    // Delete-and-check: if two requests race with the right code, only the
    // one that actually deletes the row signs in.
    const deleted = await this.sql`
      DELETE FROM sb_login_codes WHERE email = ${key} AND code_hash = ${codeHash} RETURNING email`;
    return deleted.length > 0 ? "ok" : "expired";
  }

  async getUserByEmail(email: string) {
    await this.init();
    const rows = await this.sql`SELECT * FROM sb_users WHERE email = ${email.toLowerCase()} LIMIT 1`;
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async getUserById(id: string) {
    await this.init();
    if (!UUID.test(id)) return null;
    const rows = await this.sql`SELECT * FROM sb_users WHERE id = ${id} LIMIT 1`;
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async setPlan(userId: string, plan: Plan, source: string, expiresAt: string | null) {
    await this.init();
    await this.sql`
      UPDATE sb_users SET plan = ${plan}, plan_source = ${source}, plan_expires_at = ${expiresAt}
      WHERE id = ${userId}`;
  }

  async createGeneration(userId: string, answers: Answers) {
    await this.init();
    const rows = await this.sql`
      INSERT INTO sb_generations (user_id, answers)
      VALUES (${userId}, ${JSON.stringify(answers)}::jsonb)
      RETURNING *`;
    return rowToGeneration(rows[0]);
  }

  async getGeneration(id: string) {
    await this.init();
    if (!UUID.test(id)) return null;
    const rows = await this.sql`SELECT * FROM sb_generations WHERE id = ${id} LIMIT 1`;
    return rows[0] ? rowToGeneration(rows[0]) : null;
  }

  async listGenerations(userId: string, limit = 50) {
    await this.init();
    const rows = await this.sql`
      SELECT * FROM sb_generations WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map(rowToGeneration);
  }

  async listUsers(limit = 200): Promise<AdminUser[]> {
    await this.init();
    const rows = await this.sql`
      SELECT u.id, u.email, u.plan, u.plan_source, u.plan_expires_at, u.created_at,
             count(g.id)::int AS generation_count
      FROM sb_users u
      LEFT JOIN sb_generations g ON g.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ${limit}`;
    return rows.map((r) => ({
      id: String(r.id),
      email: String(r.email),
      plan: String(r.plan) as Plan,
      planSource: r.plan_source ? String(r.plan_source) : null,
      planExpiresAt: r.plan_expires_at ? new Date(String(r.plan_expires_at)).toISOString() : null,
      createdAt: new Date(String(r.created_at)).toISOString(),
      generationCount: Number(r.generation_count ?? 0),
    }));
  }

  async adminStats(): Promise<AdminStats> {
    await this.init();
    const rows = await this.sql`
      SELECT
        (SELECT count(*)::int FROM sb_users) AS users,
        (SELECT count(*)::int FROM sb_users
          WHERE plan <> 'free'
            AND (plan_expires_at IS NULL OR plan_expires_at > now())) AS paying,
        (SELECT count(*)::int FROM sb_generations) AS generations,
        (SELECT count(*)::int FROM sb_users WHERE created_at > now() - interval '7 days') AS signups_last_7_days`;
    const r = rows[0] ?? {};
    return {
      users: Number(r.users ?? 0),
      paying: Number(r.paying ?? 0),
      generations: Number(r.generations ?? 0),
      signupsLast7Days: Number(r.signups_last_7_days ?? 0),
    };
  }

  /**
   * Deliberately does NOT run init(): this separates "can we reach the database
   * and authenticate" from "are the migrations applied".
   */
  async ping(): Promise<PingResult> {
    const started = Date.now();
    try {
      await this.sql`SELECT 1 AS ok`;
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string }).code;
      if (code === "28P01") {
        return { ok: false, error: "Mot de passe incorrect dans DATABASE_URL (le placeholder [YOUR-PASSWORD] a-t-il bien été remplacé ?)." };
      }
      if (/tenant(\/| or )user.*not found/i.test(message)) {
        return {
          ok: false,
          error:
            "Supabase ne trouve pas ce projet sur ce serveur (tenant/user not found). Le projet est en pause, " +
            "ou la région de l'adresse ne correspond pas à celle du projet. Recopie la chaîne « Transaction pooler » " +
            "depuis le bouton Connect de Supabase, sans rien modifier sauf [YOUR-PASSWORD].",
        };
      }
      if (code === "ENOTFOUND" || code === "ECONNREFUSED" || code === "ETIMEDOUT") {
        return { ok: false, error: `Base injoignable (${code}). Vérifie l'hôte et le port de DATABASE_URL.` };
      }
      return { ok: false, error: message.slice(0, 200) };
    }
  }
}

/* ------------------------------------------------------------------ */

export function databaseUrl(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "";
}

/**
 * Describes the connection without leaking credentials — used by /api/health.
 *
 * Supabase in particular has a trap: the direct connection (port 5432) is
 * IPv6-only, which Vercel's runtime cannot reach. The transaction pooler
 * (port 6543) is the one that works, and it needs prepared statements off.
 */
export function describeDatabase(): { host: string; port: string; pooled: boolean; warning: string | null } | null {
  const url = databaseUrl();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const port = parsed.port || "5432";
    const pooled = port === "6543" || parsed.hostname.includes("pooler");
    let warning: string | null = null;

    if (parsed.hostname.includes("supabase") && !pooled) {
      warning =
        "Connexion Supabase directe (port 5432) : elle est en IPv6 uniquement et Vercel ne peut pas l'atteindre. " +
        "Utilise la chaîne « Transaction pooler » (port 6543).";
    }

    return { host: parsed.hostname, port, pooled, warning };
  } catch {
    return { host: "url invalide", port: "?", pooled: false, warning: "DATABASE_URL n'est pas une URL valide." };
  }
}

/** One pooled client per runtime instance, reused across lambda invocations. */
const globalSql = globalThis as unknown as { __scalebiz_sql?: SqlClient };

function createSqlClient(url: string): SqlClient {
  if (globalSql.__scalebiz_sql) return globalSql.__scalebiz_sql;

  // Imported lazily so the memory driver needs no database package at runtime.
  const postgres = require("postgres") as typeof import("postgres");
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();

  const client = postgres(url, {
    // Serverless: many short-lived instances, so one connection each.
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    // Required by pgBouncer in transaction mode (Supabase's pooler). Harmless elsewhere.
    prepare: false,
    ssl: isLocalHost(host) ? false : "require",
  }) as unknown as SqlClient;

  globalSql.__scalebiz_sql = client;
  return client;
}

let store: Store | null = null;

export function getStore(): Store {
  if (store) return store;
  const url = databaseUrl();
  store = url ? new PostgresStore(createSqlClient(url)) : new MemoryStore();
  return store;
}

export function storageDriver(): Driver {
  return getStore().driver;
}
