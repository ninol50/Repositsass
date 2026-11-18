import type { Metadata } from "next";
import { PricingCards } from "@/components/PricingCards";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink, SectionHeading } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { effectivePlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offres",
  description: "Starter ou Pro : débloque ton plan ScaleBiz, tes guides et tes automatisations.",
};

export default async function PricingPage() {
  const user = await currentUser().catch(() => null);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-5 py-14 sm:py-20">
        <SectionHeading
          eyebrow="Offres"
          title="Choisis jusqu'où tu veux aller"
          description="Le questionnaire est gratuit. Chaque offre débloque ton plan, tes guides et tes automatisations."
        />
        <div className="mt-12">
          <PricingCards currentPlan={user ? effectivePlan(user) : undefined} launchNote />
        </div>
        {!user && (
          <div className="mt-12 text-center">
            <p className="text-[14px] text-ink-400">Pas encore fait le questionnaire ?</p>
            <div className="mt-3">
              <ButtonLink href="/#questionnaire" variant="outline">
                Répondre aux 4 questions
              </ButtonLink>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
