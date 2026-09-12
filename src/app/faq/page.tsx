import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Les questions qu'on nous pose vraiment sur RepositSaaS, avec des réponses directes.",
};

const FAQ = [
  {
    q: "C'est juste un prompt ChatGPT déguisé ?",
    a: "Non, et pour une raison simple : il n'y a aucun appel à un modèle. Le brief est généré par un moteur déterministe. Tes réponses entrent dans des règles écrites à la main — dérivation de palette, calcul de churn et de LTV, choix d'architecture selon ta stack. C'est pour ça que c'est instantané et que deux réponses identiques donnent exactement le même document.",
  },
  {
    q: "Qu'est-ce que je reçois exactement ?",
    a: "Un fichier Markdown d'environ 2 000 mots, structuré en 12 sections : rôle de l'agent, produit, périmètre, design system avec les hex, direction artistique, architecture et schéma SQL, routes, monétisation chiffrée, copywriting, plan d'exécution, definition of done, garde-fous. Tu le copies dans Claude Code, tu le colles, il construit.",
  },
  {
    q: "Est-ce que ça fabrique mon SaaS tout seul ?",
    a: "Non. Ça fabrique les instructions. C'est Claude Code — ou toi — qui écrit le code. Un bon brief fait gagner des heures et évite les allers-retours ; il ne remplace pas le travail de construction, ni les décisions produit que tu es le seul à pouvoir prendre.",
  },
  {
    q: "Pourquoi il faut un compte pour générer ?",
    a: "Pour que tu retrouves tes briefs, pour éviter que la génération soit spammée, et parce que seuls les comptes vérifiés peuvent laisser un avis. Le compte est gratuit et ne demande pas de carte.",
  },
  {
    q: "Qu'est-ce qui est gratuit et qu'est-ce qui est payant ?",
    a: "Le compte et la génération sont gratuits : tu peux produire jusqu'à 5 briefs par mois sans payer. En revanche aucune ligne du document n'est lisible sans plan actif — tu vois son titre, sa longueur exacte et le détail de ses 12 à 16 sections, pas leur contenu. Basic donne 10 briefs par mois, Pro 30 avec 4 sections supplémentaires, Max sans limite.",
  },
  {
    q: "Les chiffres de la section monétisation sont fiables ?",
    a: "Ce sont des ordres de grandeur, construits sur des moyennes de marché par type de cible — pas sur tes données. Ils servent à confronter ton objectif à la réalité arithmétique, pas à prédire ton revenu. Le brief le dit noir sur blanc et te demande de les remplacer dès que tu as 30 inscriptions.",
  },
  {
    q: "Et si le brief me dit que mon idée ne tient pas ?",
    a: "C'est exactement ce pour quoi il est fait. Si ton prix est sous-évalué, si ton objectif demande un volume de trafic que tu n'as pas, ou si ton churn annule ton acquisition, le brief l'écrit dans une section dédiée. Un outil qui te félicite quoi qu'il arrive ne t'apprend rien.",
  },
  {
    q: "Comment fonctionne le paiement ?",
    a: "Via Whop. L'accès est accordé côté serveur par le webhook de paiement, jamais par la redirection de retour. Si le webhook échoue, la page de vérification de licence débloque ton compte manuellement.",
  },
  {
    q: "Je peux me faire rembourser ?",
    a: "Oui, 7 jours, sans justification, tant que l'usage reste raisonnable. Les conditions exactes sont sur la page remboursement.",
  },
  {
    q: "Mes idées sont-elles confidentielles ?",
    a: "Tes réponses sont stockées pour te permettre de rouvrir tes briefs. Elles ne sont ni publiées, ni revendues, ni envoyées à un fournisseur d'IA — puisqu'aucun modèle n'est appelé. Tu peux demander la suppression de ton compte et de tes données à tout moment.",
  },
];

export default function FaqPage() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:py-20">
        <SectionHeading
          eyebrow="FAQ"
          title="Les vraies questions"
          description="Pas de questions de confort écrites pour rassurer. Celles-là, on nous les pose."
        />

        <div className="mt-14 space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="surface-flat group overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium text-white transition-colors hover:bg-white/[0.02]">
                {item.q}
                <span className="shrink-0 text-ink-500 transition-transform duration-200 group-open:rotate-45">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="border-t border-white/[0.06] px-5 py-4 text-[14px] leading-relaxed text-ink-400">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <div className="surface mt-14 p-8 text-center">
          <h2 className="font-display text-[20px] font-semibold text-white">Une autre question ?</h2>
          <p className="mt-2.5 text-[14px] text-ink-400">
            Génère un brief gratuitement : tu verras sa longueur réelle et le détail de ce qu'il contient
            avant de décider.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/brief" variant="brand">
              Générer un brief
            </ButtonLink>
            <ButtonLink href="/pricing" variant="outline">
              Voir les tarifs
            </ButtonLink>
          </div>
          <p className="mt-6 text-[12.5px] text-ink-600">
            <Link href="/legal/terms" className="underline underline-offset-4 hover:text-ink-400">
              Conditions
            </Link>{" "}
            ·{" "}
            <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-ink-400">
              Confidentialité
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
