import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Alert, Badge } from "@/components/ui";
import { adminConfigured, isAdminEmail } from "@/lib/admin";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inscrits",
  robots: { index: false, follow: false },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PLAN_STYLE: Record<string, string> = {
  free: "border-white/10 text-ink-400",
  basic: "border-brand-500/40 text-brand-200",
  pro: "border-mint-500/40 text-mint-400",
  max: "border-amber-500/40 text-amber-200",
};

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin");

  // 404 rather than 403: a non-admin should not learn that this page exists.
  if (!isAdminEmail(user.email)) notFound();

  const store = getStore();
  const [users, stats] = await Promise.all([store.listUsers(500), store.adminStats()]);

  const tiles = [
    { label: "Comptes", value: stats.users },
    { label: "Payants", value: stats.paying },
    { label: "Inscrits (7 j)", value: stats.signupsLast7Days },
    { label: "Briefs générés", value: stats.generations },
    { label: "Avis", value: stats.reviews },
  ];

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:py-14">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[30px] font-semibold tracking-tight text-white sm:text-[36px]">
            Inscrits
          </h1>
          <Badge>Back-office</Badge>
        </div>
        <p className="mt-2 text-[14px] text-ink-400">
          Visible uniquement par les emails listés dans{" "}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[12.5px]">ADMIN_EMAILS</code>.
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-5">
          {tiles.map((t) => (
            <div key={t.label} className="bg-ink-950/85 px-4 py-5">
              <dt className="font-display text-[26px] font-semibold text-white">{t.value}</dt>
              <dd className="mt-1 text-[12.5px] leading-snug text-ink-500">{t.label}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-10">
          {users.length === 0 ? (
            <div className="surface-flat px-6 py-16 text-center">
              <p className="text-[15px] font-medium text-white">Aucun inscrit pour l&apos;instant</p>
              <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-ink-400">
                Les comptes créés sur le site apparaîtront ici, du plus récent au plus ancien.
              </p>
            </div>
          ) : (
            <div className="surface-flat overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-left text-[12px] uppercase tracking-wider text-ink-500">
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Plan</th>
                    <th className="px-5 py-3 font-medium">Briefs</th>
                    <th className="px-5 py-3 font-medium">Inscrit le</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/[0.05] last:border-0">
                      <td className="px-5 py-3.5 text-ink-100">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[12px] ${
                            PLAN_STYLE[u.plan] ?? PLAN_STYLE.free
                          }`}
                        >
                          {u.plan}
                        </span>
                        {u.planSource && (
                          <span className="ml-2 text-[11.5px] text-ink-600">{u.planSource}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-ink-300">{u.generationCount}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-ink-400">
                        {formatDate(u.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {!adminConfigured() && (
          <div className="mt-8">
            <Alert tone="warning">
              <code>ADMIN_EMAILS</code> n&apos;est pas configuré : personne ne peut accéder à cette page.
            </Alert>
          </div>
        )}

        <p className="mt-8 text-[12.5px] leading-relaxed text-ink-600">
          Les mots de passe ne sont jamais lisibles, ici comme ailleurs : seule leur empreinte scrypt
          est stockée, et elle ne sort pas de la base.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
