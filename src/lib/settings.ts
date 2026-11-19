/**
 * Configuration that can live in the environment OR in the database.
 *
 * Environment variables win. When one is missing, the value is read from the
 * private `sb_settings` table — so a key can be set from the database
 * dashboard without touching the hosting provider's settings. That table has
 * Row Level Security on and no policy: Supabase's public API cannot read it.
 *
 * Values are cached for a minute per instance, so a request does not cost a
 * database round-trip, and a change still applies quickly.
 */

import { getStore } from "./db";

export type SettingKey = "ADMIN_EMAILS" | "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET";

const TTL_MS = 60_000;
const cache = new Map<SettingKey, { value: string | null; at: number }>();

export async function getSetting(key: SettingKey): Promise<string | null> {
  const fromEnv = process.env[key];
  if (fromEnv) return fromEnv;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value: string | null = null;
  try {
    value = (await getStore().getSetting(key))?.trim() || null;
  } catch {
    // Database down: behave as "not configured" rather than failing the page.
    value = null;
  }
  cache.set(key, { value, at: Date.now() });
  return value;
}
