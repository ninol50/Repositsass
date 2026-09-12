import Link from "next/link";
import { BriefPreview } from "@/components/BriefPreview";
import { HeroIdeaForm } from "@/components/HeroIdeaForm";
import { ReviewsSection } from "@/components/ReviewsSection";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge, ButtonLink, SectionHeading } from "@/components/ui";
import { STEPS } from "@/lib/questions";
import { planCatalog } from "@/lib/whop";

export const dynamic = "force-dynamic";

const QUESTION_COUNT = STEPS.reduce((n, s) => n + s.fields.length, 0);

const DELIVERABLES = [
  {
    title: "Positionnement et cible",
    body: "Où se trouve ton audience, son objection n°1 à l'achat, son cycle de décision. Et si tu n'as pas nommé de concurrent, le brief te dit pourquoi c'est un problème.",
    icon: "M12 2 2 7l10 5 10-5-10-5Z M2 17l10 5 10-5 M2 12l10 5 10-5",
  },
  {
    title: "Design system, pas des adjectifs",
    body: "Ta couleur devient une palette complète en hex : hover, actif, surfaces, bordures, états. Avec le ratio de contraste WCAG calculé, et une correction si ton choix passe sous le seuil.",
    icon: "M12 21a9 9 0 1 1 0-18c4.97 0 9 3.58 9 8 0 2.76-2.24 5-5 5h-1.8a1.7 1.7 0 0 0-1.2 2.9c.4.4.6.9.6 1.4 0 .4-.3.7-.6.7Z",
  },
  {
    title: "Direction artistique des images",
    body: "Le style que tu choisis devient un prompt d'image réutilisable, avec ta couleur injectée dedans. Et un avertissement quand le style ne colle pas à ta cible.",
    icon: "M3 5h18v14H3z M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M21 15l-5-5L5 19",
  },
  {
    title: "Architecture et modèle de données",
    body: "La stack, l'arborescence des fichiers structurants, le schéma SQL minimal, et les tables que chaque fonctionnalité choisie ajoute. Plus les règles de sécurité qui vont avec.",
    icon: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7",
  },
  {
    title: "Le calcul que personne ne fait",
    body: "Clients payants nécessaires, churn attendu pour ta cible, LTV, CAC maximum soutenable, visiteurs par mois. À partir de ton objectif de MRR et de ton prix.",
    icon: "M3 3v18h18 M7 15l4-5 3 3 5-7",
  },
  {
    title: "Ce qui ne tient pas",
    body: "Une section dédiée aux hypothèses bancales : prix sous-évalué, volume d'acquisition irréaliste, churn qui annule l'acquisition, lifetime deal qui ne produit pas de MRR.",
    icon: "M12 9v4 M12 17h.01 M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  },
  {
    title: "Plan d'exécution daté",
    body: "Cinq étapes découpées selon le délai que tu vises, avec la règle de périmètre qui va avec. Une semaine et trois mois ne donnent pas le même plan.",
    icon: "M8 2v4 M16 2v4 M3 10h18 M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z",
  },
  {
    title: "Definition of done et garde-fous",
    body: "La checklist qui dit quand la v1 est finie, et la liste de ce que Claude Code ne doit pas faire : pas de feature hors périmètre, pas de chiffre inventé, pas d'accès payant côté client.",
    icon: "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  },
];

const HOW = [
  {
    n: "01",
    title: "Tu décris ton idée",
    body: "Une phrase suffit pour démarrer. Le problème que tu résous, on te le demandera juste après — et c'est là que la plupart des idées se cassent.",
  },
  {
    n: "02",
    title: "Tu réponds au questionnaire",
    body: `${QUESTION_COUNT} questions réparties en 5 étapes : produit, direction artistique, business, technique, périmètre. Trois minutes, pas de champ décoratif.`,
  },
  {
    n: "03",
    title: "Tu colles le brief dans Claude Code",
    body: "Tu récupères un document Markdown structuré en 12 sections. Tu l'ouvres dans un dossier vide, tu le colles, tu laisses construire.",
  },
];

const STATS = [
  { value: `${QUESTION_COUNT}`, label: "questions ciblées" },
  { value: "12", label: "sections générées" },
  { value: "~2 000", label: "mots de brief" },
  { value: "0 s", label: "d'attente, aucun appel API" },
];

export default function HomePage() {
  const plans = planCatalog();

  return (
    <>
      <SiteHeader />

      <main>
        {/* ---------------------------------------------------------- Hero */}
        <section className="relative overflow-hidden">
          <div className="grid-lines absolute inset-0 -z-10" />
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-20 pt-16 text-center sm:pt-24">
            <Badge className="animate-rise">
              <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
              Questionnaire guidé, brief exécutable
            </Badge>

            <h1 className="animate-rise mt-6 max-w-4xl font-display text-[36px] font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-[58px]">
              Ton idée de SaaS,{" "}
              <span className="text-gradient">transformée en brief</span> que Claude Code peut exécuter.
            </h1>

            <p className="animate-rise mt-6 max-w-2xl text-[16px] leading-relaxed text-ink-400 sm:text-[18px]">
              Tu décris ton idée. On te pose les questions qui comptent — cible, couleur, style
              d&apos;images, revenus visés, stack. Tu repars avec un document de construction complet.
              Pas un paragraphe vague de trois lignes.
            </p>

            <div className="animate-rise mt-10 flex w-full justify-center">
              <HeroIdeaForm />
            </div>

            <p className="mt-6 text-[13px] text-ink-500">
              Compte gratuit pour générer. Un plan actif pour lire le brief.
            </p>

            <dl className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="bg-ink-950/80 px-4 py-5">
                  <dt className="font-display text-[24px] font-semibold text-white">{s.value}</dt>
                  <dd className="mt-1 text-[12.5px] leading-snug text-ink-500">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ------------------------------------------------------- Preview */}
        <section className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
          <SectionHeading
            eyebrow="Aperçu réel"
            title="Voilà ce que ça produit"
            description="Ce document est généré par le même moteur que celui du produit, à partir d'un exemple d'idée. Rien n'est écrit à la main."
          />
          <div className="mt-12">
            <BriefPreview />
          </div>
        </section>

        {/* --------------------------------------------------- How it works */}
        <section id="comment-ca-marche" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-20 sm:py-28">
          <SectionHeading eyebrow="Comment ça marche" title="Trois étapes, trois minutes" />

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {HOW.map((step) => (
              <div key={step.n} className="surface relative p-7">
                <span className="font-display text-[13px] font-semibold tracking-widest text-brand-400">
                  {step.n}
                </span>
                <h3 className="mt-4 font-display text-[19px] font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-400">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------- Deliverables */}
        <section className="relative">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:py-28">
            <SectionHeading
              eyebrow="Dans le brief"
              title="Douze sections, aucune de remplissage"
              description="Chaque réponse du questionnaire change quelque chose de concret dans le document final."
            />

            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-4">
              {DELIVERABLES.map((d) => (
                <article key={d.title} className="group bg-ink-950/85 p-6 transition-colors hover:bg-ink-900">
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.03] text-brand-300 transition-colors group-hover:border-brand-500/40">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d={d.icon} />
                    </svg>
                  </span>
                  <h3 className="font-display text-[15.5px] font-semibold leading-snug text-white">{d.title}</h3>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-400">{d.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- Reviews */}
        <ReviewsSection />

        {/* --------------------------------------------------------- Pricing */}
        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:py-24">
          <SectionHeading
            eyebrow="Tarifs"
            title="Tester ne coûte rien. Le brief complet, si."
            description="Générer est gratuit, lire ne l'est pas. Tu vois la longueur exacte de ton brief et le détail de ses sections avant de payer — pas leur contenu."
          />

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.key}
                className={`surface relative flex flex-col p-7 ${p.highlight ? "ring-1 ring-brand-500/40" : ""}`}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-7 rounded-full bg-[linear-gradient(120deg,#8f6fff,#6a45f5)] px-2.5 py-1 text-[11px] font-medium text-white">
                    Le plus pris
                  </span>
                )}
                <h3 className="font-display text-[17px] font-semibold text-white">{p.name}</h3>
                <p className="mt-1 text-[13px] text-ink-400">{p.tagline}</p>
                <p className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display text-[38px] font-semibold tracking-tight text-white">{p.price}€</span>
                  <span className="text-[13px] text-ink-500">{p.period}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[13.5px] text-ink-300">
                      <svg className="mt-1 shrink-0 text-mint-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href="/pricing"
                  variant={p.highlight ? "brand" : "outline"}
                  className="mt-7 w-full"
                >
                  Choisir {p.name}
                </ButtonLink>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-[13px] text-ink-500">
            Paiement via Whop. Remboursement sous 7 jours si le brief ne t&apos;a servi à rien —{" "}
            <Link href="/legal/refund" className="text-ink-300 underline underline-offset-4 hover:text-white">
              conditions
            </Link>
            .
          </p>
        </section>

        {/* ------------------------------------------------------- Final CTA */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-28">
          <div className="surface relative overflow-hidden px-6 py-14 text-center sm:px-16 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(34rem 20rem at 50% 0%, rgba(124,92,255,0.28), transparent 70%)",
              }}
            />
            <h2 className="mx-auto max-w-2xl font-display text-[28px] font-semibold leading-tight tracking-tight text-white sm:text-[40px]">
              Ton idée mérite mieux qu&apos;un prompt écrit à l&apos;arrache.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-400">
              Trois minutes de questionnaire contre un document de construction complet. Si le résultat
              ne te sert à rien, tu le dis et on te rembourse.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/brief" variant="brand" size="lg">
                Générer mon brief
              </ButtonLink>
              <ButtonLink href="/pricing" variant="outline" size="lg">
                Voir les tarifs
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
