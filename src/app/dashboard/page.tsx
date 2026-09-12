import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { capabilitiesFor, currentPeriodStart, nextResetLabel, quotaLabel } from "@/lib/plans";
import { computeMath } from "@/lib/prompt-engine";
import { hasActivePlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mes briefs",
  robots: { index: false, follow: false },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/dashboard");

  const store = getStore();
  const active = hasActivePlan(user);
  const caps = capabilitiesFor(user.plan, active);
  const [generations, usedThisMonth] = await Promise.all([
    store.listGenerations(user.id, 60),
    store.countGenerationsSince(user.id, currentPeriodStart()),
  ]);
  const unlocked = caps.canReadBrief;
  const remaining =
    caps.monthlyGenerations === null ? null : Math.max(0, caps.monthlyGenerations - usedThisMonth);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:py-14">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-[30px] font-semibold tracking-tight text-white sm:text-[36px]">
              Mes briefs
            </h1>
            <p className="mt-2 text-[14px] text-ink-400">
              {user.email} ·{" "}
              {active ? (
                <span className="text-mint-400">plan {user.plan} actif</span>
              ) : (
                <span className="text-ink-500">plan gratuit</span>
              )}
              {user.planExpiresAt && active && (
                <span className="text-ink-500"> · renouvellement le {formatDate(user.planExpiresAt)}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <LogoutButton />
            <ButtonLink href="/brief" variant="brand">
              Nouveau brief
            </ButtonLink>
          </div>
        </header>

        <div className="surface-flat mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
          <div>
            <p className="text-[12px] uppercase tracking-wider text-ink-500">Briefs ce mois-ci</p>
            <p className="mt-1 text-[15px] font-medium text-white">
              {usedThisMonth} / {quotaLabel(caps.monthlyGenerations)}
              {remaining !== null && remaining === 0 && (
                <span className="ml-2 text-[13px] font-normal text-amber-300">
                  limite atteinte, remise à zéro le {nextResetLabel()}
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[12px] uppercase tracking-wider text-ink-500">Profondeur</p>
            <p className="mt-1 text-[15px] font-medium text-white">
              {caps.briefDepth === "pro" ? "16 sections (Pro)" : "12 sections"}
            </p>
          </div>
          <div>
            <p className="text-[12px] uppercase tracking-wider text-ink-500">Catalogue d&apos;idées</p>
            <p className="mt-1 text-[15px] font-medium text-white">
              {caps.ideaCatalog ? "débloqué" : "verrouillé"}
            </p>
          </div>
        </div>

        {!unlocked && (
          <div className="surface mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[15px] font-medium text-white">Tes briefs sont verrouillés</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-400">
                Tu peux en générer {caps.monthlyGenerations} par mois et voir leur longueur exacte,
                mais aucune ligne n&apos;est lisible sans plan actif.
              </p>
            </div>
            <ButtonLink href="/pricing" variant="brand" className="shrink-0">
              Voir les tarifs
            </ButtonLink>
          </div>
        )}

        <section className="mt-10">
          {generations.length === 0 ? (
            <div className="surface-flat flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.09] text-ink-600">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
              </div>
              <p className="text-[16px] font-medium text-white">Aucun brief pour l&apos;instant</p>
              <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-ink-400">
                Le questionnaire prend trois minutes. Tu peux en générer autant que tu veux — une idée,
                un brief.
              </p>
              <ButtonLink href="/brief" variant="brand" className="mt-7">
                Générer mon premier brief
              </ButtonLink>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {generations.map((g) => {
                const math = computeMath(g.answers);
                return (
                  <li key={g.id}>
                    <Link
                      href={`/result/${g.id}`}
                      className="surface-flat group flex h-full flex-col p-5 transition-colors hover:border-white/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="font-display text-[17px] font-semibold text-white">{g.productName}</h2>
                        <span
                          className="mt-1 h-3 w-3 shrink-0 rounded-full ring-1 ring-white/20"
                          style={{
                            background:
                              typeof g.answers.primaryColor === "string" ? g.answers.primaryColor : "#7C5CFF",
                          }}
                        />
                      </div>
                      <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-relaxed text-ink-400">
                        {g.summary}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3.5 text-[12px] text-ink-500">
                        <span>{formatDate(g.createdAt)}</span>
                        <span className="flex items-center gap-1.5">
                          {!unlocked && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          )}
                          {math.customersNeeded} clients visés
                        </span>
                      </div>
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
