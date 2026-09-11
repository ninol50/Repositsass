import type { Metadata } from "next";
import { BriefWizard } from "@/components/BriefWizard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { currentPublicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Générer un brief",
  description: "Réponds au questionnaire et obtiens un brief de construction complet pour ton SaaS.",
};

export default async function BriefPage({
  searchParams,
}: {
  searchParams: Promise<{ idea?: string }>;
}) {
  const { idea } = await searchParams;
  const user = await currentPublicUser();

  return (
    <>
      <SiteHeader />
      <main className="min-h-[70vh]">
        <BriefWizard signedIn={Boolean(user)} initialIdea={idea?.slice(0, 400)} />
      </main>
      <SiteFooter />
    </>
  );
}
