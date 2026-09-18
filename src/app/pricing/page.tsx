import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PlanCheckoutButton } from "@/components/PlanCheckoutButton";
import { Alert, Badge, ButtonLink, SectionHeading } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { hasActivePlan } from "@/lib/types";
import { planCatalog, whopPlanIdFromUrl } from "@/lib/whop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Débloque le brief complet : design system, architecture, chiffres et plan d'exécution. Paiement via Whop.",
};

const COMPARISON: { label: string; free: string | boolean; basic: string | boolean; pro: string | boolean }[] = [
  { label: "Briefs générés par mois", free: "5", basic: "10", pro: "30" },
  { label: "Lire le contenu du brief", free: false, basic: true, pro: true },
  { label: "Sections du document", free: "—", basic: "12", pro: "16" },
  { label: "Design system, architecture, schéma SQL", free: false, basic: true, pro: true },
  { label: "Calcul MRR, churn, LTV, CAC", free: false, basic: true, pro: true },
  { label: "Copie en un clic et export .md", free: false, basic: true, pro: true },
  { label: "Analyse concurrentielle", free: false, basic: false, pro: true },
  { label: "Plan d'acquisition 90 jours", free: false, basic: false, pro: true },
  { label: "Instrumentation et seuils d'alerte", free: false, basic: false, pro: true },
  { label: "Risques d'exécution et points de décision", free: false, basic: false, pro: true },
  { label: "Guide complet : installer, connecteurs, mise en ligne", free: false, basic: false, pro: true },
  { label: "Catalogue d'idées validées", free: false, basic: false, pro: true },
  { label: "Pré-remplissage « Copier ce site »", free: false, basic: false, pro: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "string") {
    return <span className="text-[13px] text-ink-200">{value}</span>;
  }
  return <Check on={value} />;
}

function Check({ on }: { on: boolean }) {
  return on ? (
    <svg className="text-mint-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ) : (
    <svg className="text-ink-600" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export default async function PricingPage() {
  const user = await currentUser();
  const plans = planCatalog();
  const active = user ? hasActivePlan(user) : false;
  const anyCheckout = plans.some((p) => p.checkoutUrl);

  function hrefFor(checkoutUrl: string | null): string {
    if (!user) return "/signup?next=/pricing";
    if (!checkoutUrl) return "/billing/verify";
    const url = new URL(checkoutUrl);
    // Passed through to the webhook so the payment can be matched to this account.
    url.searchParams.set("email", user.email);
    url.searchParams.set("metadata[user_id]", user.id);
    return url.toString();
  }

  return (
    <>
      <SiteHeader />

      <main>
        <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-14 sm:pt-20">
          <div className="text-center">
            <Badge>
              <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
              Paiement sécurisé via Whop
            </Badge>
          </div>

          <div className="mt-7">
            <SectionHeading
              title="Générer est gratuit. Lire ne l'est pas."
              description="Tu génères jusqu'à 5 briefs par mois sans payer et tu vois leur longueur exacte et le détail de leurs sections. Pour en lire le contenu, il faut un plan — résiliable en un clic depuis Whop."
            />
          </div>

          {active && (
            <div className="mx-auto mt-10 max-w-xl">
              <Alert tone="success">
                Ton plan <strong>{user?.plan}</strong> est actif. Tous tes briefs sont débloqués.{" "}
                <Link href="/dashboard" className="underline underline-offset-4">
                  Voir mes briefs
                </Link>
              </Alert>
            </div>
          )}

          {!anyCheckout && (
            <div className="mx-auto mt-10 max-w-xl">
              <Alert tone="warning">
                Aucun lien de paiement n&apos;est configuré sur ce déploiement. Renseigne les variables
                <code className="mx-1 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px]">WHOP_PLAN_*_ID</code>
                pour activer le checkout.
              </Alert>
            </div>
          )}

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.key}
                className={`surface relative flex flex-col p-7 ${p.highlight ? "ring-1 ring-brand-500/40 lg:-mt-4 lg:pb-11" : ""}`}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-7 rounded-full bg-[linear-gradient(120deg,#8f6fff,#6a45f5)] px-2.5 py-1 text-[11px] font-medium text-white">
                    Le plus pris
                  </span>
                )}

                <h2 className="font-display text-[18px] font-semibold text-white">{p.name}</h2>
                <p className="mt-1 text-[13px] text-ink-400">{p.tagline}</p>

                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-display text-[42px] font-semibold tracking-tight text-white">{p.price}€</span>
                  <span className="text-[13px] text-ink-500">{p.period}</span>
                </p>

                {p.highlights && p.highlights.length > 0 && (
                  <ul className="mt-7 space-y-2.5">
                    {p.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-center gap-3 rounded-xl border border-brand-500/30 bg-brand-500/[0.09] px-3.5 py-3"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-200">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </span>
                        {/* Blurred on purpose: a teaser, not a paywall — the
                            text ships in the HTML like the rest of the page. */}
                        <span
                          className="select-none font-display text-[14px] font-semibold leading-snug text-white blur-[3.5px]"
                          aria-hidden
                        >
                          {h}
                        </span>
                        <span className="sr-only">{h} — débloqué avec le plan Pro</span>
                      </li>
                    ))}
                  </ul>
                )}

                <ul className="mt-7 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[13.5px] leading-snug text-ink-300">
                      <span className="mt-0.5 shrink-0">
                        <Check on />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <PlanCheckoutButton
                  // Only a signed-in customer gets the embedded checkout: the
                  // payment has to land on an account that already exists.
                  planId={user ? whopPlanIdFromUrl(p.checkoutUrl) : null}
                  planName={p.name}
                  price={p.price}
                  period={p.period}
                  href={hrefFor(p.checkoutUrl)}
                  label={!user ? "Créer un compte" : p.checkoutUrl ? `Payer ${p.price}€` : "Vérifier ma licence"}
                  accountEmail={user?.email ?? null}
                  variant={p.highlight ? "brand" : "outline"}
                  className="mt-8 w-full"
                />
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------ Comparison */}
        <section className="mx-auto w-full max-w-3xl px-5 py-16">
          <h2 className="font-display text-[22px] font-semibold tracking-tight text-white">
            Ce que chaque plan débloque
          </h2>

          <div className="surface-flat mt-7 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-white/[0.07] px-5 py-3 text-[12px] uppercase tracking-wider text-ink-500">
              <span>Ce que tu obtiens</span>
              <span className="w-14 text-center">Gratuit</span>
              <span className="w-14 text-center">Basic</span>
              <span className="w-14 text-center">Pro</span>
            </div>
            {COMPARISON.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-white/[0.05] px-5 py-3.5 last:border-0"
              >
                <span className="text-[13.5px] text-ink-200">{row.label}</span>
                <span className="flex w-14 justify-center">
                  <Cell value={row.free} />
                </span>
                <span className="flex w-14 justify-center">
                  <Cell value={row.basic} />
                </span>
                <span className="flex w-14 justify-center">
                  <Cell value={row.pro} />
                </span>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="surface-flat p-5">
              <h3 className="text-[14px] font-medium text-white">Déjà payé sur Whop ?</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-400">
                Si l&apos;accès ne s&apos;est pas débloqué automatiquement, entre ta clé de licence.
              </p>
              <ButtonLink href="/billing/verify" variant="outline" size="sm" className="mt-4">
                Vérifier ma licence
              </ButtonLink>
            </div>
            <div className="surface-flat p-5">
              <h3 className="text-[14px] font-medium text-white">Remboursement</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-400">
                7 jours, sans justification, tant que le volume d&apos;usage reste raisonnable.
              </p>
              <ButtonLink href="/legal/refund" variant="outline" size="sm" className="mt-4">
                Lire les conditions
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
