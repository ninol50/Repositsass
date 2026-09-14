import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PromptActions } from "@/components/PromptActions";
import { ResultStages } from "@/components/ResultStages";
import { SitePreview } from "@/components/SitePreview";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge, ButtonLink } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { capabilitiesFor } from "@/lib/plans";
import { generatePrompt } from "@/lib/prompt-engine";
import { buildSitePreview, redactModel, type SitePreviewModel } from "@/lib/site-preview";
import { hasActivePlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ton site",
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
  const fullPreview = buildSitePreview(generation.answers);
  // Redact BEFORE the model reaches any component: React serialises the props of
  // a server element passed to a client component into the RSC payload, so a
  // component that merely declines to print a string would still ship it.
  const preview = caps.canReadBrief ? fullPreview : redactModel(fullPreview);

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

        <ResultStages
          continueLabel="Continuer"
          continueHint={
            caps.canReadBrief
              ? "Génère le prompt à coller dans Claude Code"
              : "Voir ce que contient le prompt à coller dans Claude Code"
          }
          preview={
            <SitePreviewStage
              model={preview}
              unlocked={caps.canReadBrief}
              styleLabel={preview.style.label}
            />
          }
          prompt={
            caps.canReadBrief ? (
              <>
                <div className="mt-6">
                  <PromptActions
                    markdown={result.markdown}
                    fileName={`brief-${result.productName.toLowerCase()}.md`}
                  />
                </div>

                <p className="mt-4 text-[13px] text-ink-400">
                  {caps.briefDepth === "pro" ? (
                    <span className="text-mint-400">
                      Version Pro : {result.sectionCount} sections, dont analyse concurrentielle, plan
                      d&apos;acquisition, instrumentation et risques d&apos;exécution.
                    </span>
                  ) : (
                    <>
                      {result.sectionCount} sections. La dernière fait dire à Claude Code, avant de
                      coder, tout ce qu&apos;il reste à connecter — base, paiement, Vercel, domaine.
                    </>
                  )}
                </p>

                <article className="surface mt-6 px-5 py-7 sm:px-9 sm:py-10">
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
            )
          }
        />
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * Step 1: the site itself.
 *
 * Locked accounts get the same layout, the same colour and the same typography,
 * but every generated string is replaced by a skeleton bar before the HTML is
 * sent — the blur on top is the visual cue, not the protection.
 */
function SitePreviewStage({
  model,
  unlocked,
  styleLabel,
}: {
  model: SitePreviewModel;
  unlocked: boolean;
  styleLabel: string;
}) {
  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[20px] font-semibold tracking-tight text-white">
            Ton site
          </h2>
          <p className="mt-1.5 text-[13.5px] text-ink-400">
            {unlocked
              ? `Style ${styleLabel} · ${model.mode === "dark" ? "ambiance sombre" : "ambiance claire"} · palette dérivée de ${model.palette.primary}.`
              : "Voilà la forme, les couleurs et la structure. Le contenu s'affiche avec un plan actif."}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] px-3 py-1.5 text-[12px] text-ink-400">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: model.palette.primary }} />
          {model.palette.primary} · contraste {model.palette.contrastOnPrimary}:1
        </span>
      </div>

      <div className="relative mt-5">
        {/* Locked: the mockup is capped so the padlock lands inside the first screen. */}
        <div
          className={unlocked ? "" : "pointer-events-none max-h-[560px] select-none overflow-hidden rounded-2xl blur-[7px]"}
          aria-hidden={!unlocked}
        >
          <SitePreview model={model} redacted={!unlocked} />
        </div>

        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-ink-950/45 px-5">
            <div className="surface max-w-sm p-6 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-500/30 bg-brand-500/[0.12] text-brand-200">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <h3 className="mt-5 font-display text-[19px] font-semibold text-white">
                Ton site est généré
              </h3>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-400">
                La maquette existe, avec ta couleur et ton style. Il faut un plan actif pour la voir
                en clair et récupérer le prompt qui la construit.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <ButtonLink href="/pricing" variant="brand">
                  Débloquer mon site
                </ButtonLink>
                <ButtonLink href="/billing/verify" variant="ghost" size="sm">
                  J&apos;ai déjà payé
                </ButtonLink>
              </div>
            </div>
          </div>
        )}
      </div>

      {unlocked && (
        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-500">
          Ce n&apos;est pas une capture d&apos;un produit fini : c&apos;est la maquette que décrit ton
          prompt. Les emplacements de chiffres restent vides — tant qu&apos;il n&apos;y a pas de vraie
          donnée, en inventer une est le plus sûr moyen de perdre la confiance d&apos;un premier client.
        </p>
      )}
    </section>
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
