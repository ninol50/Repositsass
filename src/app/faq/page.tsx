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
    a: "Pour enregistrer ton plan et que tu puisses le retrouver à tout moment depuis ton espace. Le compte est gratuit : tu entres ton email, tu reçois un code à 6 chiffres, et c'est tout. Pas de mot de passe à retenir.",
  },
  {
    q: "Qu'est-ce qui est gratuit ?",
    a: "Le questionnaire, la création de compte et ton profil chiffré (heures par mois, taux horaire à atteindre, niveau d'ambition). Les business eux-mêmes se débloquent avec une offre.",
  },
  {
    q: "Quelle différence entre Starter, Pro et Elite ?",
    a: "Le nombre de business débloqués : 1 avec Starter, 3 avec Pro, les 5 avec Elite. Les mieux classés pour toi sont toujours débloqués en premier.",
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
