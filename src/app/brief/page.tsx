import type { Metadata } from "next";
import { BriefWizard } from "@/components/BriefWizard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUser } from "@/lib/auth";
import { findIdea } from "@/lib/ideas";
import { capabilitiesFor } from "@/lib/plans";
import { defaultAnswers, type Answers } from "@/lib/questions";
import { hasActivePlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Générer un brief",
  description: "Réponds au questionnaire et obtiens un brief de construction complet pour ton SaaS.",
};

export default async function BriefPage({
  searchParams,
}: {
  searchParams: Promise<{ idea?: string; from?: string }>;
}) {
  const { idea, from } = await searchParams;
  const user = await currentUser();
  const caps = user ? capabilitiesFor(user.plan, hasActivePlan(user)) : null;

  // Prefill from the catalogue — a Pro capability, re-checked server-side.
  const entry = caps?.autofill ? findIdea(from) : null;
  const prefill: Answers | undefined = entry
    ? { ...defaultAnswers(), ...entry.answers, idea: entry.summary, problem: entry.problem }
    : undefined;

  return (
    <>
      <SiteHeader />
      <main className="min-h-[70vh]">
        <BriefWizard
          signedIn={Boolean(user)}
          initialIdea={entry ? undefined : idea?.slice(0, 400)}
          prefill={prefill}
          prefillLabel={entry?.name}
        />
      </main>
      <SiteFooter />
    </>
  );
}
