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
import { generatePrompt } from "@/lib/prompt-engine";
import { hasActivePlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ton brief",
  robots: { index: false, follow: false },
};

const LOCKED_SECTIONS = [
  { n: "03", title: "Design system", body: "Tokens CSS, palette dérivée de ta couleur, ratio de contraste WCAG" },
  { n: "04", title: "Direction artistique", body: "Prompts d'images réutilisables avec ta couleur injectée" },
  { n: "05", title: "Architecture technique", body: "Stack, arborescence, schéma SQL, règles de sécurité" },
  { n: "06", title: "Parcours et routes", body: "Table des routes, niveaux d'accès, chemin critique" },
  { n: "07", title: "Monétisation chiffrée", body: "Clients nécessaires, churn, LTV, CAC max, grille tarifaire" },
  { n: "08", title: "Copywriting", body: "Structure de landing, ton, interdits" },
  { n: "09", title: "Plan d'exécution", body: "5 étapes datées selon ton délai" },
  { n: "10", title: "Definition of done", body: "La checklist qui dit quand c'est fini" },
  { n: "11", title: "Garde-fous", body: "Ce que Claude Code ne doit pas faire" },
];

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/result/${id}`)}`);

  const generation = await getStore().getGeneration(id);
  if (!generation || generation.userId !== user.id) notFound();

  // The prompt is regenerated from the stored answers: same input, same output.
  const result = generatePrompt(generation.answers);
  const unlocked = hasActivePlan(user);
  const body = unlocked ? result.markdown : result.preview;
  const html = renderMarkdown(body);

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
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: result.palette.primary }}
              />
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
              <dd className="font-medium text-white">{result.wordCount.toLocaleString("fr-FR")} mots</dd>
            </div>
          </dl>
        </header>

        {unlocked && (
          <div className="mt-8">
            <PromptActions markdown={result.markdown} fileName={`brief-${result.productName.toLowerCase()}.md`} />
          </div>
        )}

        {/* ------------------------------------------------------ Document */}
        <article className="surface mt-8 px-5 py-7 sm:px-9 sm:py-10">
          <div className="prompt-doc" dangerouslySetInnerHTML={{ __html: html }} />

          {!unlocked && (
            <div className="relative mt-2">
              {/* Blurred teaser of what comes next */}
              <div aria-hidden className="pointer-events-none select-none space-y-3 opacity-45 blur-[5px]">
                <div className="h-4 w-2/5 rounded bg-white/20" />
                <div className="h-3 w-full rounded bg-white/10" />
                <div className="h-3 w-11/12 rounded bg-white/10" />
                <div className="h-24 rounded-xl bg-white/[0.07]" />
                <div className="h-3 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-5/6 rounded bg-white/10" />
              </div>

              <div className="absolute inset-x-0 -top-6 bottom-0 bg-gradient-to-b from-transparent via-ink-950/80 to-ink-950" />
            </div>
          )}
        </article>

        {/* -------------------------------------------------------- Paywall */}
        {!unlocked && (
          <section className="surface relative mt-6 overflow-hidden p-7 sm:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{ background: "radial-gradient(30rem 18rem at 50% 0%, rgba(124,92,255,0.24), transparent 70%)" }}
            />

            <div className="flex flex-col items-center text-center">
              <span className="animate-pulse-ring flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-500/30 bg-brand-500/[0.12] text-brand-200">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>

              <h2 className="mt-6 font-display text-[24px] font-semibold tracking-tight text-white sm:text-[30px]">
                9 sections sur 12 sont verrouillées
              </h2>
              <p className="mt-3 max-w-lg text-[14.5px] leading-relaxed text-ink-400">
                Tu viens de lire le positionnement et le périmètre. Le reste — design system, architecture,
                chiffres, plan d&apos;exécution — demande un plan actif.
              </p>
            </div>

            <ul className="mt-9 grid gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.07] sm:grid-cols-3">
              {LOCKED_SECTIONS.map((s) => (
                <li key={s.n} className="flex gap-3 bg-ink-950/85 p-4">
                  <span className="mt-0.5 shrink-0 text-ink-600">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-medium text-white">{s.title}</span>
                    <span className="mt-1 block text-[12.5px] leading-snug text-ink-500">{s.body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <ButtonLink href="/pricing" variant="brand" size="lg">
                Débloquer le brief complet
              </ButtonLink>
              <ButtonLink href="/billing/verify" variant="ghost" size="lg">
                J&apos;ai déjà payé
              </ButtonLink>
            </div>

            <p className="mt-6 text-center text-[12.5px] text-ink-500">
              Ton brief reste enregistré. Il se débloque automatiquement dès que ton paiement est confirmé.
            </p>
          </section>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
