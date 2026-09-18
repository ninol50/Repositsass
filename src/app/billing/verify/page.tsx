import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LicenseForm } from "@/components/LicenseForm";
import { RecoverAccessButton } from "@/components/RecoverAccessButton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Alert } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { hasActivePlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vérifier ma licence",
  robots: { index: false, follow: false },
};

export default async function VerifyPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/billing/verify");

  const active = hasActivePlan(user);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-lg px-5 py-14 sm:py-20">
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-white">
          Vérifier ma licence
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-400">
          Normalement, l&apos;accès se débloque tout seul quelques secondes après le paiement, via le
          webhook Whop. Si ça n&apos;a pas marché, ta clé de licence règle le problème immédiatement.
        </p>

        <div className="surface mt-9 p-7">
          {active ? (
            <Alert tone="success">
              Ton plan <strong>{user.plan}</strong> est déjà actif. Rien à faire ici —{" "}
              <Link href="/dashboard" className="underline underline-offset-4">
                retourne à tes briefs
              </Link>
              .
            </Alert>
          ) : (
            <>
              {/* Tried first: it needs nothing from the customer but the click. */}
              <p className="text-[13.5px] font-medium text-white">Vérification automatique</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">
                On demande directement à Whop si un abonnement actif correspond à ton compte.
              </p>
              <div className="mt-4">
                <RecoverAccessButton variant="brand" label="J'ai déjà payé — vérifier" />
              </div>

              <div className="my-7 flex items-center gap-3 text-[12px] text-ink-600">
                <span className="h-px flex-1 bg-white/[0.07]" />
                ou avec ta clé de licence
                <span className="h-px flex-1 bg-white/[0.07]" />
              </div>

              <LicenseForm />
            </>
          )}
        </div>

        <div className="surface-flat mt-6 p-5">
          <p className="text-[13px] font-medium text-white">Où trouver ta clé ?</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-[13px] leading-relaxed text-ink-400">
            <li>Ouvre ton compte Whop, section « Mes achats ».</li>
            <li>Sélectionne RepositSaaS.</li>
            <li>Copie la clé de licence affichée sur la commande.</li>
          </ol>
          <p className="mt-4 text-[12.5px] text-ink-500">
            Toujours bloqué ? Écris-nous depuis l&apos;adresse email de ton compte, on débloque à la main.
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
