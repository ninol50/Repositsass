import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PromptActions } from "@/components/PromptActions";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge, ButtonLink } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { capabilitiesFor } from "@/lib/plans";
import { generatePrompt } from "@/lib/prompt-engine";
import { hasActivePlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ton brief",
  robots: { index: false, follow: false },
};

/** Titles only — enough to show what is behind the lock, never the content. */
const SECTION_TITLES = [
  { n: "00", title: "Rôle de l'agent", body: "Les règles que Claude Code doit suivre" },
  { n: "01", title: "Le produit", body: "Idée, problème, cible, objection, cycle de décision" },
  { n: "02", title: "Périmètre de la v1", body: "Ce qui se construit, ce qui part en backlog" },
  { n: "03", title: "Design system", body: "Tokens CSS, palette dérivée, contraste WCAG" },
  { n: "04", title: "Direction artistique", body: "Prompts d'images avec ta couleur injectée" },
  { n: "05", title: "Architecture technique", body: "Stack, arborescence, schéma SQL, sécurité" },
  { n: "06", title: "Parcours et routes", body: "Table des routes, accès, chemin critique" },
  { n: "07", title: "Monétisation chiffrée", body: "Clients nécessaires, churn, LTV, CAC, trafic" },
  { n: "08", title: "Copywriting", body: "Structure de landing, ton, interdits" },
  { n: "09", title: "Plan d'exécution", body: "5 étapes datées selon ton délai" },
  { n: "10", title: "Definition of done", body: "La checklist qui dit quand c'est fini" },
  { n: "11", title: "Garde-fous", body: "Ce que Claude Code ne doit pas faire" },
];

const PRO_SECTION_TITLES = [
  { n: "12", title: "Analyse concurrentielle", body: "Tableau comparatif et axe de différenciation" },
  { n: "13", title: "Plan d'acquisition 90 jours", body: "Canaux, phases, seuils de décision" },
  { n: "14", title: "Instrumentation", body: "Les événements à tracker et leurs seuils d'alerte" },
  { n: "15", title: "Risques d'exécution", body: "Ce qui tue le projet et les dates de décision" },
];

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/result/${id}`)}`);

  const generation = await getStore().getGeneration(id);
  if (!generation || generation.userId !== user.id) notFound();

  const caps = capabilitiesFor(user.plan, hasActivePlan(user));

  // The prompt is regenerated from the stored answers: same input, same output.
  const result = generatePrompt(generation.answers, { depth: caps.briefDepth });
  // Counters shown behind the paywall must describe the CHEAPEST paid plan, not
  // the best one: advertising the Pro length to someone about to buy Basic would
  // promise a document they will not receive.
  const basic = caps.canReadBrief ? result : generatePrompt(generation.answers, { depth: "standard" });
  const pro = caps.canReadBrief ? result : generatePrompt(generation.answers, { depth: "pro" });

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:py-14">
        <Link href="/dashboard" className="text-[13px] text-ink-400 transition-colors hover:text-white">
          ← Mes briefs
        </Link>

        <header className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge>
              <span className="h-2 w-2 rounded-full" style={{ background: result.palette.primary }} />
              {result.palette.primary}
            </Badge>
            <h1 className="mt-3 font-display text-[30px] font-semibold tracking-tight text-white sm:text-[38px]">
              {result.productName}
            </h1>
            <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-ink-400">{result.summary}</p>
          </div>

          <dl className="surface-flat shrink-0 divide-y divide-white/[0.07] text-[13px]">
            <div className="flex justify-between gap-8 px-4 py-2.5">
              <dt className="text-ink-500">Clients à atteindre</dt>
              <dd className="font-medium text-white">{result.math.customersNeeded}</dd>
            </div>
            <div className="flex justify-between gap-8 px-4 py-2.5">
              <dt className="text-ink-500">LTV estimée</dt>
              <dd className="font-medium text-white">{result.math.ltv.toLocaleString("fr-FR")} €</dd>
            </div>
            <div className="flex justify-between gap-8 px-4 py-2.5">
              <dt className="text-ink-500">Longueur</dt>
              <dd className="font-medium text-white">
                {result.wordCount.toLocaleString("fr-FR")} mots
              </dd>
            </div>
          </dl>
        </header>

        {caps.canReadBrief ? (
          <>
            <div className="mt-8">
              <PromptActions
                markdown={result.markdown}
                fileName={`brief-${result.productName.toLowerCase()}.md`}
              />
            </div>

            {caps.briefDepth === "pro" && (
              <p className="mt-4 text-[13px] text-mint-400">
                Version Pro : {result.sectionCount} sections, dont analyse concurrentielle, plan
                d&apos;acquisition, instrumentation et risques d&apos;exécution.
              </p>
            )}

            <article className="surface mt-8 px-5 py-7 sm:px-9 sm:py-10">
              <div
                className="prompt-doc"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(result.markdown) }}
              />
            </article>
          </>
        ) : (
          <LockedBrief
            productName={result.productName}
            words={basic.wordCount}
            sections={basic.sectionCount}
            proWords={pro.wordCount}
            proSections={pro.sectionCount}
          />
        )}
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * The free-account view. No line of the generated document reaches the browser:
 * the markdown is never serialised into this branch, so there is nothing to
 * recover from the page source.
 */
function LockedBrief({
  productName,
  words,
  sections,
  proWords,
  proSections,
}: {
  productName: string;
  words: number;
  sections: number;
  proWords: number;
  proSections: number;
}) {
  return (
    <section className="surface relative mt-8 overflow-hidden p-7 sm:p-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "radial-gradient(32rem 20rem at 50% 0%, rgba(124,92,255,0.26), transparent 70%)" }}
      />

      <div className="flex flex-col items-center text-center">
        <span className="animate-pulse-ring flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-500/30 bg-brand-500/[0.12] text-brand-200">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>

        <h2 className="mt-7 font-display text-[26px] font-semibold tracking-tight text-white sm:text-[34px]">
          Ton brief est prêt
        </h2>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-400">
          <strong className="text-white">{words.toLocaleString("fr-FR")} mots</strong> répartis en{" "}
          <strong className="text-white">{sections} sections</strong>, générés à partir de tes réponses
          pour {productName}. Il faut un plan actif pour le lire.
        </p>
        <p className="mt-2 text-[13.5px] text-ink-500">
          Avec le plan Pro : {proSections} sections et {proWords.toLocaleString("fr-FR")} mots, les
          quatre sections marquées Pro ci-dessous en plus.
        </p>
      </div>

      <ul className="mt-10 grid gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.07] sm:grid-cols-2">
        {[...SECTION_TITLES, ...PRO_SECTION_TITLES].map((s, i) => (
          <li key={s.n} className="flex gap-3 bg-ink-950/85 p-4">
            <span className="mt-0.5 shrink-0 font-mono text-[11px] text-ink-600">{s.n}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-[13.5px] font-medium text-white">{s.title}</span>
                {i >= SECTION_TITLES.length && (
                  <span className="rounded-full border border-mint-500/40 px-1.5 py-0.5 text-[10.5px] text-mint-400">
                    Pro
                  </span>
                )}
              </span>
              <span className="mt-1 block text-[12.5px] leading-snug text-ink-500">{s.body}</span>
            </span>
            <span className="mt-0.5 shrink-0 text-ink-600">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <ButtonLink href="/pricing" variant="brand" size="lg">
          Débloquer mon brief
        </ButtonLink>
        <ButtonLink href="/billing/verify" variant="ghost" size="lg">
          J&apos;ai déjà payé
        </ButtonLink>
      </div>

      <p className="mt-6 text-center text-[12.5px] text-ink-500">
        Ton brief reste enregistré. Il s&apos;ouvre automatiquement dès que ton paiement est confirmé.
      </p>
    </section>
  );
}
