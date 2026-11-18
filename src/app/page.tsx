import { ClockIcon } from "@/components/ClockIcon";
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
    title: "Tu réponds à 4 questions",
    text: "Ton âge, ton expérience, le temps que tu as chaque jour et ton objectif. 30 secondes.",
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
