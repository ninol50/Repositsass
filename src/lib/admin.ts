/**
 * Back-office access.
 *
 * The owner is identified by email, listed in ADMIN_EMAILS. Deliberately not a
 * role column: there is one operator, and a column would be one more thing that
 * can be wrong in the database.
 *
 * With the variable unset, nobody is an admin — an unconfigured deployment must
 * not expose the user list.
 */

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export function adminConfigured(): boolean {
  return adminEmails().length > 0;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
