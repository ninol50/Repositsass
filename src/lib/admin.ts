/**
 * Back-office access.
 *
 * The owner is identified by email, listed in ADMIN_EMAILS (environment
 * variable, or the private settings table — see settings.ts). Deliberately not
 * a role column: there is one operator.
 *
 * With nothing configured, nobody is an admin — an unconfigured deployment
 * must not expose the user list.
 */

import { getSetting } from "./settings";

export async function adminEmails(): Promise<string[]> {
  return ((await getSetting("ADMIN_EMAILS")) ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export async function adminConfigured(): Promise<boolean> {
  return (await adminEmails()).length > 0;
}

export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  return (await adminEmails()).includes(email.trim().toLowerCase());
}
