import { Onboarding } from "@/components/Onboarding";
import { PricingCards } from "@/components/PricingCards";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionHeading } from "@/components/ui";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: "01",
    title: "Tu réponds à 3 questions",
    text: "Ton âge, le temps que tu veux y mettre chaque jour, et ce que tu vises par mois. 30 secondes.",
  },
  {
    n: "02",
    title: "ScaleBiz calcule ton plan",
    text: "Heures disponibles, taux horaire à atteindre, niveau d'ambition : tout est chiffré à partir de tes réponses.",
  },
  {
    n: "03",
    title: "Tu reçois tes 5 business",
    text: "Classés du plus adapté au moins adapté à ton profil, avec un plan de lancement pour chacun.",
  },
];

export default async function HomePage() {
  // Never let a database hiccup take the landing page down: the questionnaire
  // works without knowing who the visitor is.
  const user = await currentUser().catch(() => null);

  return (
    <>
      <SiteHeader />

      <main>
        <section className="relative">
          <div className="grid-lines pointer-events-none absolute inset-0 -z-10" />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pt-12 pb-16 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-24 lg:pb-24">
            <div className="animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-500/10 px-3 py-1 text-[12.5px] text-brand-200">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse-ring" />
                3 questions · 30 secondes
              </span>
              <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.04] tracking-tight text-white sm:text-[56px]">
                Trouve le business <span className="text-gradient">fait pour toi.</span>
              </h1>
              <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-ink-300 sm:text-[17px]">
                Dis-nous combien de temps tu as et combien tu veux gagner. ScaleBiz calcule ce qu&apos;il te
                faut et te propose 5 business classés selon ton profil.
              </p>

              <ul className="mt-8 hidden space-y-3 lg:block">
                {["Aucune carte bancaire pour commencer", "Résultat chiffré à partir de tes réponses", "Ton plan reste enregistré dans ton espace"].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-3 text-[14px] text-ink-300">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                      {t}
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div id="questionnaire" className="animate-rise scroll-mt-24" style={{ animationDelay: "80ms" }}>
              <Onboarding signedIn={Boolean(user)} />
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
              title="Débloque tes business"
              description="Le questionnaire et ton profil chiffré sont gratuits. Les business se débloquent selon ton offre."
            />
            <div className="mt-12">
              <PricingCards />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
