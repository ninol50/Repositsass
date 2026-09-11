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
 */

import { randomUUID } from "crypto";
import type { Generation, Plan, Review, User } from "./types";

export type Driver = "postgres" | "memory";

export interface Store {
  driver: Driver;
  init(): Promise<void>;
  createUser(email: string, passwordHash: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  setPlan(
    userId: string,
    plan: Plan,
    source: string,
    expiresAt: string | null,
    membershipId: string | null,
  ): Promise<void>;
  createGeneration(g: Omit<Generation, "id" | "createdAt">): Promise<Generation>;
  getGeneration(id: string): Promise<Generation | null>;
  listGenerations(userId: string, limit?: number): Promise<Generation[]>;
  countGenerations(userId: string): Promise<number>;
  createReview(r: Omit<Review, "id" | "createdAt" | "approved">): Promise<Review>;
  listReviews(limit?: number): Promise<Review[]>;
  getReviewByUser(userId: string): Promise<Review | null>;
  reviewStats(): Promise<{ count: number; average: number }>;
}

/* ------------------------------------------------------------------ */
/* Memory driver                                                       */
/* ------------------------------------------------------------------ */

type MemoryState = {
  users: Map<string, User>;
  generations: Map<string, Generation>;
  reviews: Map<string, Review>;
};

const globalMemory = globalThis as unknown as { __repositsaas_memory?: MemoryState };

function memoryState(): MemoryState {
  if (!globalMemory.__repositsaas_memory) {
    globalMemory.__repositsaas_memory = {
      users: new Map(),
      generations: new Map(),
      reviews: new Map(),
    };
  }
  return globalMemory.__repositsaas_memory;
}

class MemoryStore implements Store {
  driver: Driver = "memory";

  async init() {
    memoryState();
  }

  async createUser(email: string, passwordHash: string): Promise<User> {
    const s = memoryState();
    const user: User = {
      id: randomUUID(),
      email: email.toLowerCase(),
      passwordHash,
      plan: "free",
      planSource: null,
      planExpiresAt: null,
      whopMembershipId: null,
      createdAt: new Date().toISOString(),
    };
    s.users.set(user.id, user);
    return user;
  }

  async getUserByEmail(email: string) {
    const target = email.toLowerCase();
    for (const u of memoryState().users.values()) if (u.email === target) return u;
    return null;
  }

  async getUserById(id: string) {
    return memoryState().users.get(id) ?? null;
  }

  async setPlan(userId: string, plan: Plan, source: string, expiresAt: string | null, membershipId: string | null) {
    const u = memoryState().users.get(userId);
    if (!u) return;
    u.plan = plan;
    u.planSource = source;
    u.planExpiresAt = expiresAt;
    u.whopMembershipId = membershipId;
  }

  async createGeneration(g: Omit<Generation, "id" | "createdAt">) {
    const gen: Generation = { ...g, id: randomUUID(), createdAt: new Date().toISOString() };
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

  async countGenerations(userId: string) {
    return [...memoryState().generations.values()].filter((g) => g.userId === userId).length;
  }

  async createReview(r: Omit<Review, "id" | "createdAt" | "approved">) {
    const review: Review = { ...r, id: randomUUID(), approved: true, createdAt: new Date().toISOString() };
    memoryState().reviews.set(review.id, review);
    return review;
  }

  async listReviews(limit = 12) {
    return [...memoryState().reviews.values()]
      .filter((r) => r.approved)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async getReviewByUser(userId: string) {
    for (const r of memoryState().reviews.values()) if (r.userId === userId) return r;
    return null;
  }

  async reviewStats() {
    const all = await this.listReviews(1000);
    if (all.length === 0) return { count: 0, average: 0 };
    const avg = all.reduce((sum, r) => sum + r.rating, 0) / all.length;
    return { count: all.length, average: Math.round(avg * 10) / 10 };
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
    passwordHash: String(r.password_hash),
    plan: String(r.plan) as Plan,
    planSource: r.plan_source ? String(r.plan_source) : null,
    planExpiresAt: r.plan_expires_at ? new Date(String(r.plan_expires_at)).toISOString() : null,
    whopMembershipId: r.whop_membership_id ? String(r.whop_membership_id) : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
  };
}

function rowToGeneration(r: SqlRow): Generation {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    productName: String(r.product_name),
    summary: String(r.summary),
    answers: (typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers) as Generation["answers"],
    createdAt: new Date(String(r.created_at)).toISOString(),
  };
}

function rowToReview(r: SqlRow): Review {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    authorName: String(r.author_name),
    rating: Number(r.rating),
    body: String(r.body),
    approved: Boolean(r.approved),
    createdAt: new Date(String(r.created_at)).toISOString(),
  };
}

class PostgresStore implements Store {
  driver: Driver = "postgres";
  private sql: SqlClient;
  private ready: Promise<void> | null = null;

  constructor(sql: SqlClient) {
    this.sql = sql;
  }

  async init() {
    if (!this.ready) this.ready = this.migrate();
    return this.ready;
  }

  private async migrate() {
    const sql = this.sql;
    await sql`CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      plan text NOT NULL DEFAULT 'free',
      plan_source text,
      plan_expires_at timestamptz,
      whop_membership_id text,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS generations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_name text NOT NULL,
      summary text NOT NULL DEFAULT '',
      answers jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS reviews (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      author_name text NOT NULL,
      rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
      body text NOT NULL,
      approved boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS generations_user_idx ON generations(user_id, created_at DESC)`;
  }

  async createUser(email: string, passwordHash: string) {
    await this.init();
    const rows = await this.sql`
      INSERT INTO users (email, password_hash) VALUES (${email.toLowerCase()}, ${passwordHash})
      RETURNING *`;
    return rowToUser(rows[0]);
  }

  async getUserByEmail(email: string) {
    await this.init();
    const rows = await this.sql`SELECT * FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`;
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async getUserById(id: string) {
    await this.init();
    const rows = await this.sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async setPlan(userId: string, plan: Plan, source: string, expiresAt: string | null, membershipId: string | null) {
    await this.init();
    await this.sql`
      UPDATE users
      SET plan = ${plan}, plan_source = ${source}, plan_expires_at = ${expiresAt}, whop_membership_id = ${membershipId}
      WHERE id = ${userId}`;
  }

  async createGeneration(g: Omit<Generation, "id" | "createdAt">) {
    await this.init();
    const rows = await this.sql`
      INSERT INTO generations (user_id, product_name, summary, answers)
      VALUES (${g.userId}, ${g.productName}, ${g.summary}, ${JSON.stringify(g.answers)}::jsonb)
      RETURNING *`;
    return rowToGeneration(rows[0]);
  }

  async getGeneration(id: string) {
    await this.init();
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const rows = await this.sql`SELECT * FROM generations WHERE id = ${id} LIMIT 1`;
    return rows[0] ? rowToGeneration(rows[0]) : null;
  }

  async listGenerations(userId: string, limit = 50) {
    await this.init();
    const rows = await this.sql`
      SELECT * FROM generations WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map(rowToGeneration);
  }

  async countGenerations(userId: string) {
    await this.init();
    const rows = await this.sql`SELECT count(*)::int AS n FROM generations WHERE user_id = ${userId}`;
    return Number(rows[0]?.n ?? 0);
  }

  async createReview(r: Omit<Review, "id" | "createdAt" | "approved">) {
    await this.init();
    const rows = await this.sql`
      INSERT INTO reviews (user_id, author_name, rating, body)
      VALUES (${r.userId}, ${r.authorName}, ${r.rating}, ${r.body})
      ON CONFLICT (user_id) DO UPDATE
        SET author_name = EXCLUDED.author_name, rating = EXCLUDED.rating, body = EXCLUDED.body, created_at = now()
      RETURNING *`;
    return rowToReview(rows[0]);
  }

  async listReviews(limit = 12) {
    await this.init();
    const rows = await this.sql`
      SELECT * FROM reviews WHERE approved = true ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map(rowToReview);
  }

  async getReviewByUser(userId: string) {
    await this.init();
    const rows = await this.sql`SELECT * FROM reviews WHERE user_id = ${userId} LIMIT 1`;
    return rows[0] ? rowToReview(rows[0]) : null;
  }

  async reviewStats() {
    await this.init();
    const rows = await this.sql`
      SELECT count(*)::int AS n, COALESCE(avg(rating), 0)::float AS avg FROM reviews WHERE approved = true`;
    const count = Number(rows[0]?.n ?? 0);
    const average = Math.round(Number(rows[0]?.avg ?? 0) * 10) / 10;
    return { count, average };
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
const globalSql = globalThis as unknown as { __repositsaas_sql?: SqlClient };

function createSqlClient(url: string): SqlClient {
  if (globalSql.__repositsaas_sql) return globalSql.__repositsaas_sql;

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

  globalSql.__repositsaas_sql = client;
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
