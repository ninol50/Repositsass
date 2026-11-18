import { redirect } from "next/navigation";

/** Sign-up and log-in are one flow now (emailed code): keep old links working. */
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  redirect(safe ? `/login?next=${encodeURIComponent(safe)}` : "/login");
}
