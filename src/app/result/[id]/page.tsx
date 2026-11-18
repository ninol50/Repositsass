import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BusinessCard } from "@/components/BusinessCard";
import { OfferPicker } from "@/components/OfferPicker";
import { PricingCards } from "@/components/PricingCards";
import { PromoCountdown } from "@/components/PromoCountdown";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink, LockIcon } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { rankForPlan } from "@/lib/businesses";
import { getStore } from "@/lib/db";
import {
  OFFERS,
  PROMO,
  businessPlansFor,
  planLabel,
  promoActive,
  promoEndsAt,
  recommendedOffer,
} from "@/lib/plans";
import { computeProfile, euros } from "@/lib/profile";
import { effectivePlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ton plan",
  robots: { index: false, follow: false },
};

/** The cheapest offer that opens a given rank. */
function offerForRank(rank: number): string {
  return OFFERS.find((o) => o.businessPlans >= rank)?.name ?? OFFERS[OFFERS.length - 1].name;
}

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ offres?: string }>;
}) {
  const { id } = await params;
  const { offres } = await searchParams;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/result/${id}`);

  const generation = await getStore().getGeneration(id);
  // Someone else's result is a 404, not a 403: no hint that it exists.
  if (!generation || generation.userId !== user.id) notFound();

  const a = generation.answers;
  const plan = effectivePlan(user);

  /* ------------------------- not paying: nothing ------------------------- */
  if (plan === "free") {
    const endsAt = promoEndsAt(generation.createdAt);
    const promo = promoActive(endsAt);
    const { offer, reason } = recommendedOffer(a);

    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:py-14">
          {promo && (
            <a
              href="#offres"
              className="animate-alert mb-8 flex flex-col items-center gap-3 rounded-2xl px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left"
            >
              <span>
                <span className="block font-display text-[18px] font-bold text-white sm:text-[20px]">
                  ⚠️ On a trouvé ton plan ‼️ Débloque-le avant de le perdre
                </span>
                <span className="text-[13.5px] text-ink-200">
                  -{PROMO.percentOff} % sur {PROMO.scope}, offre valable encore
                </span>
              </span>
              <PromoCountdown endsAt={endsAt.toISOString()} className="font-mono text-[34px] font-bold tabular-nums text-white" />
            </a>
          )}

          {/* The plan exists, but nothing of it is readable before paying. */}
          <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-ink-900/70">
            <div className="space-y-3 p-6 blur-[4px] sm:p-8" aria-hidden>
              <span className="redacted w-1/2" style={{ height: 26 }} />
              <span className="redacted block w-full" />
              <span className="redacted block w-11/12" />
              <span className="redacted block w-4/5" />
              <div className="grid grid-cols-3 gap-3 pt-3">
                <span className="redacted block w-full" style={{ height: 64 }} />
                <span className="redacted block w-full" style={{ height: 64 }} />
                <span className="redacted block w-full" style={{ height: 64 }} />
              </div>
              <span className="redacted block w-full" />
              <span className="redacted block w-3/4" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950/50 px-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold-400/40 bg-ink-950/90 text-gold-300 shadow-[0_0_40px_-4px_rgba(251,191,36,0.6)]">
                <LockIcon size={24} />
              </span>
              <h1 className="mt-4 font-display text-[26px] font-bold tracking-tight text-white sm:text-[32px]">
                Ton plan est prêt, et verrouillé
              </h1>
              <p className="mt-2 max-w-md text-[14.5px] text-ink-300">
                Ton business, sa fiche, ton plan d&apos;action et tes guides se débloquent avec ton offre.
              </p>
            </div>
          </section>

          <section id="offres" className="mt-12 scroll-mt-20">
            <OfferPicker recommendedId={offer.id} reason={reason} promo={promo} initiallyOpen={offres === "toutes"} />
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  /* ----------------------------- paying: the plan ----------------------------- */
  const profile = computeProfile(a);
  const unlocked = businessPlansFor(plan);
  const ranked = rankForPlan(a, plan);

  const stats = [
    { label: "Heures de travail / mois", value: `${profile.hoursPerMonth} h`, note: `${a.hoursPerDay} h × 5 jours / semaine` },
    { label: "Objectif mensuel", value: euros(a.monthlyTarget), note: "ce que tu vises" },
    { label: "Taux horaire à atteindre", value: `${euros(profile.requiredHourlyRate)} / h`, note: "objectif ÷ heures" },
  ];

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
        <header className="animate-rise">
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-brand-300">Offre {planLabel(plan)}</p>
          <h1 className="mt-2 font-display text-[32px] font-bold tracking-tight text-white sm:text-[42px]">Ton plan ScaleBiz</h1>
          <p className="mt-2 text-[14.5px] text-ink-400">
            {a.age} ans
            {a.experience !== undefined && (
              <> · {a.experience === 0 ? "aucune expérience" : `${a.experience} an${a.experience > 1 ? "s" : ""} d'expérience`}</>
            )}{" "}
            · {a.hoursPerDay} h par jour · objectif {euros(a.monthlyTarget)} par mois
            {a.automate !== undefined && <> · {a.automate ? "tout automatisé" : "fait par toi, avec guides"}</>}
          </p>
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="surface-flat p-5">
              <p className="text-[12.5px] text-ink-500">{s.label}</p>
              <p className="mt-1 font-display text-[26px] font-semibold text-white">{s.value}</p>
              <p className="mt-0.5 text-[12px] text-ink-500">{s.note}</p>
            </div>
          ))}
        </section>

        <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
          <p className="font-display text-[16px] font-semibold text-white">{profile.ambitionLabel}</p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-300">{profile.ambitionText}</p>
        </div>

        <section className="mt-12">
          <h2 className="font-display text-[24px] font-semibold tracking-tight text-white sm:text-[28px]">
            {unlocked > 1 ? "Tes business" : "Ton business"}
          </h2>
          <p className="mt-1 text-[14px] text-ink-400">Classés du plus adapté au moins adapté à ton profil.</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ranked.map((r) =>
              r.rank <= unlocked ? (
                <BusinessCard key={r.rank} locked={false} rank={r.rank} fit={r.fit} business={r.business} />
              ) : (
                <BusinessCard key={r.rank} locked rank={r.rank} fit={r.fit} unlockWith={offerForRank(r.rank)} />
              ),
            )}
          </div>
        </section>

        {plan !== "elite" && (
          <section id="offres" className="mt-16 scroll-mt-20">
            <h2 className="text-center font-display text-[24px] font-semibold tracking-tight text-white sm:text-[28px]">
              Aller plus loin
            </h2>
            <div className="mt-8">
              <PricingCards currentPlan={plan} />
            </div>
          </section>
        )}

        <div className="mt-14 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/dashboard" variant="outline">
            Mon espace
          </ButtonLink>
          <ButtonLink href="/#questionnaire" variant="ghost">
            Refaire le questionnaire
          </ButtonLink>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
