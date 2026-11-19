import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { planLabel } from "@/lib/plans";
import { computeProfile, euros } from "@/lib/profile";
import { effectivePlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon espace",
  robots: { index: false, follow: false },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/dashboard");

  const plan = effectivePlan(user);
  const generations = await getStore().listGenerations(user.id, 50);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:py-14">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-[30px] font-semibold tracking-tight text-white sm:text-[36px]">Mon espace</h1>
            <p className="mt-2 text-[14px] text-ink-400">
              {user.email} · <span className={plan === "free" ? "text-ink-300" : "text-brand-300"}>{planLabel(plan)}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <ButtonLink href="/#questionnaire" variant="brand">
              Nouveau questionnaire
            </ButtonLink>
            <LogoutButton />
          </div>
        </header>

        {user.stripeCustomerId && (
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[14px] text-ink-200">
              {plan === "free"
                ? "Ton abonnement est terminé. Tu peux le reprendre à tout moment."
                : user.planExpiresAt
                  ? `Offre ${planLabel(plan)} active, prochaine échéance vers le ${new Date(user.planExpiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`
                  : `Offre ${planLabel(plan)} active.`}
            </p>
            <ManageSubscriptionButton />
          </div>
        )}

        {plan === "free" && (
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-gold-400/25 bg-gold-400/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[14px] text-ink-200">
              Tes plans sont verrouillés. Choisis une offre pour les débloquer.
            </p>
            <ButtonLink href="/pricing" variant="outline" size="sm">
              Voir les offres
            </ButtonLink>
          </div>
        )}

        <section className="mt-10">
          <h2 className="font-display text-[19px] font-semibold text-white">Mes plans générés</h2>

          {generations.length === 0 ? (
            <div className="surface-flat mt-4 px-6 py-14 text-center">
              <p className="text-[15px] font-medium text-white">Aucun plan pour l&apos;instant</p>
              <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-ink-400">
                Réponds aux 4 questions pour générer ton premier plan.
              </p>
              <div className="mt-5">
                <ButtonLink href="/#questionnaire" variant="brand" size="sm">
                  Commencer
                </ButtonLink>
              </div>
            </div>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {generations.map((g) => {
                const p = computeProfile(g.answers);
                return (
                  <li key={g.id}>
                    <Link
                      href={`/result/${g.id}`}
                      className="surface-flat flex flex-col gap-2 px-5 py-4 transition-colors hover:border-brand-400/30 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-[15px] font-medium text-white">
                          Objectif {euros(g.answers.monthlyTarget)} / mois · {g.answers.hoursPerDay} h par jour
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-ink-500">
                          {formatDate(g.createdAt)}
                          {plan === "free" ? " · 🔒 verrouillé" : ` · ${p.ambitionLabel} · ${euros(p.requiredHourlyRate)} / h à atteindre`}
                        </p>
                      </div>
                      <span className="text-[13px] text-brand-300">Voir →</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
