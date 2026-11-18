import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BusinessCard } from "@/components/BusinessCard";
import { PricingCards } from "@/components/PricingCards";
import { PromoCountdown } from "@/components/PromoCountdown";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink, LockIcon } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { rankBusinesses } from "@/lib/businesses";
import { getStore } from "@/lib/db";
import { OFFERS, PROMO, TOTAL_BUSINESSES, businessesUnlockedFor, planLabel, promoActive, promoEndsAt } from "@/lib/plans";
import { computeProfile, euros } from "@/lib/profile";
import { effectivePlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ton plan",
  robots: { index: false, follow: false },
};

/** The cheapest offer that unlocks a given rank. */
function offerForRank(rank: number): string {
  return OFFERS.find((o) => o.businessesUnlocked >= rank)?.name ?? OFFERS[OFFERS.length - 1].name;
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/result/${id}`);

  const generation = await getStore().getGeneration(id);
  // Someone else's result is a 404, not a 403: no hint that it exists.
  if (!generation || generation.userId !== user.id) notFound();

  const a = generation.answers;
  const profile = computeProfile(a);
  const plan = effectivePlan(user);
  const unlocked = businessesUnlockedFor(plan);
  const ranked = rankBusinesses(a);
  const allLocked = unlocked === 0;
  const endsAt = promoEndsAt(generation.createdAt);
  // Launch offer: only for someone who has not bought yet, and only while
  // the real deadline has not passed.
  const promo = plan === "free" && promoActive(endsAt);

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
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-brand-300">Génération terminée</p>
          <h1 className="mt-2 font-display text-[32px] font-bold tracking-tight text-white sm:text-[42px]">
            Ton plan ScaleBiz est prêt
          </h1>
          <p className="mt-2 text-[14.5px] text-ink-400">
            {a.age} ans
            {a.experience !== undefined && <> · {a.experience === 0 ? "aucune expérience" : `${a.experience} an${a.experience > 1 ? "s" : ""} d'expérience`}</>}
            {" "}· {a.hoursPerDay} h par jour · objectif {euros(a.monthlyTarget)} par mois
          </p>
        </header>

        {promo && (
          <a
            href="#offres"
            className="animate-alert mt-6 flex flex-col items-center gap-3 rounded-2xl px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left"
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

        {/* Free part: the computed profile. */}
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
          {!profile.isAdult && (
            <p className="mt-2 text-[13px] text-gold-300">
              Tu as moins de 18 ans : les business qui demandent un statut ou des paiements à ton nom sont
              classés plus bas.
            </p>
          )}
        </div>

        {/* Paid part: the businesses. */}
        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[24px] font-semibold tracking-tight text-white sm:text-[28px]">
                Tes {TOTAL_BUSINESSES} business
              </h2>
              <p className="mt-1 text-[14px] text-ink-400">Classés du plus adapté au moins adapté à ton profil.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[12.5px] text-ink-300">
              {allLocked && <LockIcon size={13} className="text-gold-300" />}
              {unlocked}/{TOTAL_BUSINESSES} débloqué{unlocked > 1 ? "s" : ""} · offre {planLabel(plan)}
            </span>
          </div>

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

        {unlocked < TOTAL_BUSINESSES && (
          <section id="offres" className="mt-16 scroll-mt-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold-400/35 bg-gold-400/10 text-gold-300">
                <LockIcon size={20} />
              </span>
              <h2 className="mt-4 font-display text-[26px] font-semibold tracking-tight text-white sm:text-[32px]">
                {allLocked ? "Débloque tes business" : "Débloque les business suivants"}
              </h2>
              <p className="mt-2 text-[15px] text-ink-400">
                Choisis ton offre. Tu peux changer ou arrêter quand tu veux.
              </p>
            </div>
            <div className="mt-10">
              <PricingCards currentPlan={plan} promo={promo} />
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
