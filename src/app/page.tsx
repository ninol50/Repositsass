import { ClockIcon } from "@/components/ClockIcon";
import { Onboarding } from "@/components/Onboarding";
import { PricingCards } from "@/components/PricingCards";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink, SectionHeading } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { questionnaireLimitFor } from "@/lib/plans";
import { effectivePlan } from "@/lib/types";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: "01",
    title: "Tu réponds à quelques questions",
    text: "Ton âge, ton expérience, ton temps, ton objectif, et si tu veux qu'on automatise tout. 30 secondes.",
  },
  {
    n: "02",
    title: "ScaleBiz calcule ton plan",
    text: "Heures disponibles, taux horaire à atteindre, niveau d'ambition : tout est chiffré à partir de tes réponses.",
  },
  {
    n: "03",
    title: "Tu débloques ton plan",
    text: "Ton business, sa fiche, ton plan d'action, tes guides et tes automatisations, selon ton offre.",
  },
];

export default async function HomePage() {
  // Never let a database hiccup take the landing page down: the questionnaire
  // works without knowing who the visitor is.
  const user = await currentUser().catch(() => null);

  // A Starter account has used its one questionnaire: say so up front rather
  // than letting them answer everything for nothing.
  let limitReached = false;
  if (user) {
    const limit = questionnaireLimitFor(effectivePlan(user));
    if (limit !== null) {
      const done = await getStore()
        .listGenerations(user.id, limit + 1)
        .then((g) => g.length)
        .catch(() => 0);
      limitReached = done >= limit;
    }
  }

  return (
    <>
      <SiteHeader />

      <main>
        <section className="relative">
          <div className="grid-lines pointer-events-none absolute inset-0 -z-10" />
          <div className="mx-auto w-full max-w-3xl px-5 pt-12 pb-16 text-center sm:pt-16 lg:pt-20 lg:pb-24">
            <div className="animate-rise">
              <div className="flex justify-center">
                <ClockIcon size={72} />
              </div>
              <h1 className="mt-5 font-display text-[38px] font-bold leading-[1.05] tracking-tight text-white sm:text-[54px]">
                Trouve et crée ton business en{" "}
                <span className="text-gradient">30 secondes chrono</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-ink-300 sm:text-[17px]">
                Réponds à ce questionnaire hyper simple : il va nous permettre d&apos;analyser tes réponses et
                de construire pas à pas ton business.
              </p>
            </div>

            <div
              id="questionnaire"
              className="animate-rise mx-auto mt-10 max-w-xl scroll-mt-24 text-left"
              style={{ animationDelay: "80ms" }}
            >
              {limitReached ? (
                <div className="surface p-6 text-center sm:p-8">
                  <p className="font-display text-[22px] font-semibold text-white">Ton questionnaire est déjà fait</p>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-ink-300">
                    Ton offre Starter comprend 1 questionnaire. Passe à Pro pour en faire autant que tu veux et
                    débloquer tous les business.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <ButtonLink href="/dashboard" variant="brand">
                      Voir mon plan
                    </ButtonLink>
                    <ButtonLink href="/pricing" variant="outline">
                      Passer à Pro
                    </ButtonLink>
                  </div>
                </div>
              ) : (
                <Onboarding signedIn={Boolean(user)} />
              )}
            </div>
          </div>
        </section>

        <section id="comment-ca-marche" className="scroll-mt-20 border-t border-white/[0.06] py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-5">
            <SectionHeading
              eyebrow="Comment ça marche"
              title="De zéro idée à un business qui te correspond"
              description="Pas de liste générique : le classement dépend de ton temps, de ton objectif et de ton âge."
            />
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="surface-flat p-6">
                  <p className="font-mono text-[13px] text-brand-400">{s.n}</p>
                  <h3 className="mt-3 font-display text-[18px] font-semibold text-white">{s.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-400">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="offres" className="scroll-mt-20 border-t border-white/[0.06] py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-5">
            <SectionHeading
              eyebrow="Offres"
              title="Débloque ton plan"
              description="Le questionnaire est gratuit. Ton plan, tes guides et tes automatisations se débloquent avec ton offre."
            />
            <div className="mt-12">
              <PricingCards launchNote />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
