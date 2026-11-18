import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Les questions fréquentes sur ScaleBiz.",
};

const FAQ = [
  {
    q: "Comment ScaleBiz choisit mes business ?",
    a: "À partir de tes trois réponses. On calcule tes heures disponibles par mois et le taux horaire que ton objectif demande, puis chaque business est classé selon le temps qu'il exige, ce qu'il rapporte réellement et l'âge requis. Mêmes réponses, même classement.",
  },
  {
    q: "Pourquoi faut-il créer un compte ?",
    a: "Pour enregistrer ton plan et que tu puisses le retrouver à tout moment depuis ton espace. Le compte est gratuit et ne demande qu'un email et un mot de passe.",
  },
  {
    q: "Qu'est-ce qui est gratuit ?",
    a: "Le questionnaire et la création de compte. Ton plan, lui, se débloque avec une offre : sans offre, il reste verrouillé.",
  },
  {
    q: "Quelle différence entre Starter et Pro ?",
    a: "Starter (23 € par mois) : le plan complet de ton business et son guide. Pro (42 € par mois) : l'automatisation incluse, le plan complet de ton business et son guide, et tous les guides et tous les plans de tous nos business. Juste après ton questionnaire, le premier mois est à 17,99 € ou 34,99 € pendant quelques minutes. Tu peux aussi payer à l'année : 180 € pour Starter (soit 15 € par mois) ou 300 € pour Pro (soit 25 € par mois).",
  },
  {
    q: "Est-ce que ScaleBiz garantit un revenu ?",
    a: "Non. ScaleBiz t'aide à choisir un business adapté et te donne un plan ; le résultat dépend de ce que tu en fais. Les montants affichés sont des ordres de grandeur, pas des promesses.",
  },
  {
    q: "Je peux refaire le questionnaire ?",
    a: "Oui, autant de fois que tu veux. Chaque plan généré est gardé dans ton espace.",
  },
];

export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:py-20">
        <SectionHeading eyebrow="FAQ" title="Questions fréquentes" />
        <div className="mt-12 space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="surface-flat group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-white">
                {item.q}
                <span className="text-ink-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-300">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-12 text-center">
          <ButtonLink href="/#questionnaire" variant="brand">
            Commencer le questionnaire
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
