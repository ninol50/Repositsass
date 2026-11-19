import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { planLabel } from "@/lib/plans";
import { stripe, syncSubscription } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Paiement validé",
  robots: { index: false, follow: false },
};

type CheckoutSession = {
  id: string;
  status: string | null;
  client_reference_id: string | null;
  subscription: string | null;
};

/**
 * Return page after Stripe Checkout. It does not trust the URL: it reads the
 * session back from Stripe, checks that it belongs to this account, then
 * applies the subscription — so access is open even before the webhook lands.
 */
export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/merci?session_id=${session_id ?? ""}`)}`);
  if (!session_id || !/^cs_[A-Za-z0-9_]+$/.test(session_id)) notFound();

  let paid = false;
  let plan = user.plan;
  try {
    const session = await stripe<CheckoutSession>("GET", `/checkout/sessions/${session_id}`);
    if (session.client_reference_id !== user.id) notFound();
    if (session.status === "complete" && session.subscription) {
      const result = await syncSubscription(session.subscription);
      paid = result?.plan !== "free";
      if (result) plan = result.plan;
    }
  } catch (err) {
    if ((err as { digest?: string }).digest?.startsWith("NEXT_")) throw err;
    console.error(`[stripe] page merci : ${err instanceof Error ? err.message : err}`);
  }

  const latest = (await getStore().listGenerations(user.id, 1))[0];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-col items-center px-5 py-16 text-center sm:py-24">
        <span className="text-[56px]" aria-hidden>
          {paid ? "🎉" : "⏳"}
        </span>
        <h1 className="mt-4 font-display text-[30px] font-bold tracking-tight text-white sm:text-[38px]">
          {paid ? `Bienvenue dans ${planLabel(plan)} !` : "Paiement en cours de validation"}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-300">
          {paid
            ? "Ton paiement est validé et ton plan est débloqué."
            : "Stripe confirme ton paiement. Ça prend en général quelques secondes : rafraîchis la page dans un instant."}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {latest && (
            <ButtonLink href={`/result/${latest.id}`} variant="brand" size="lg">
              Voir mon plan
            </ButtonLink>
          )}
          <ButtonLink href="/dashboard" variant="outline" size="lg">
            Mon espace
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
