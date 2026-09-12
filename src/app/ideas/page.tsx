import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge, ButtonLink, SectionHeading } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { listIdeas } from "@/lib/ideas";
import { capabilitiesFor } from "@/lib/plans";
import { hasActivePlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Idées qui marchent déjà",
  description:
    "Un catalogue d'idées de SaaS déjà validées sur le marché américain, copiables en un clic dans le questionnaire.",
};

export default async function IdeasPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/ideas");

  const caps = capabilitiesFor(user.plan, hasActivePlan(user));

  // Unlike /admin, this is a selling point: a locked visitor sees the offer,
  // not a 404.
  if (!caps.ideaCatalog) return <Upsell />;

  const ideas = listIdeas();

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[30px] font-semibold tracking-tight text-white sm:text-[38px]">
            Idées qui marchent déjà
          </h1>
          <Badge>
            <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
            Pro
          </Badge>
        </div>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-400">
          Au lieu de partir de ta propre idée, pars d&apos;un modèle déjà validé sur le marché
          américain. Un clic remplit le questionnaire — tu n&apos;ajustes que ce qui te distingue :
          couleurs, prix, cible.
        </p>

        {ideas.length === 0 ? (
          <div className="surface-flat mt-12 px-6 py-20 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.09] text-ink-600">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a7 7 0 0 0-4 12.7V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.3A7 7 0 0 0 12 2Z" />
                <path d="M9 22h6" />
              </svg>
            </div>
            <p className="text-[16px] font-medium text-white">Catalogue en cours de constitution</p>
            <p className="mx-auto mt-2.5 max-w-md text-[13.5px] leading-relaxed text-ink-400">
              Aucune idée n&apos;est publiée pour l&apos;instant. Ce catalogue ne contiendra que des
              modèles réellement observés sur le marché, avec leur source — pas des exemples inventés
              pour faire nombre.
            </p>
            <ButtonLink href="/brief" variant="outline" className="mt-8">
              Partir de ma propre idée
            </ButtonLink>
          </div>
        ) : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {ideas.map((idea) => (
              <article key={idea.id} className="surface-flat flex flex-col p-6">
                <span className="text-[11.5px] uppercase tracking-wider text-brand-300">
                  {idea.category}
                </span>
                <h2 className="mt-2 font-display text-[18px] font-semibold text-white">{idea.name}</h2>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-300">{idea.summary}</p>

                {idea.evidence && (
                  <p className="mt-4 border-l-2 border-mint-500/40 pl-3 text-[12.5px] leading-relaxed text-ink-400">
                    {idea.evidence}
                    {idea.sourceUrl && (
                      <>
                        {" "}
                        <a
                          href={idea.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-300 underline underline-offset-2"
                        >
                          source
                        </a>
                      </>
                    )}
                  </p>
                )}

                <ButtonLink href={`/brief?from=${idea.id}`} variant="brand" className="mt-6 w-full">
                  Copier ce site
                </ButtonLink>
              </article>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}

function Upsell() {
  const perks = [
    "Questionnaire pré-rempli : nom, cible, modèle, style — déjà posés",
    "Tu n'ajustes que ce qui te distingue : couleurs, prix, périmètre",
    "Brief Pro : 4 sections de plus (concurrence, acquisition, mesure, risques)",
    "30 briefs par mois au lieu de 10",
  ];

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-24">
        <SectionHeading
          eyebrow="Réservé au plan Pro"
          title="Pars d'une idée déjà validée"
          description="Écrire son idée soi-même, c'est repartir d'une page blanche. Le catalogue te donne des modèles déjà éprouvés sur le marché américain, copiables en un clic dans le questionnaire."
        />

        <div className="surface mt-12 p-8 sm:p-10">
          <ul className="space-y-3.5">
            {perks.map((p) => (
              <li key={p} className="flex gap-3 text-[14.5px] leading-snug text-ink-200">
                <svg className="mt-1 shrink-0 text-mint-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {p}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/pricing" variant="brand" size="lg" className="flex-1">
              Passer au plan Pro
            </ButtonLink>
            <ButtonLink href="/brief" variant="outline" size="lg" className="flex-1">
              Partir de mon idée
            </ButtonLink>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
