import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Crée ton compte RepositSaaS pour générer et retrouver tes briefs.",
};

const POINTS = [
  "Génère autant de briefs que tu veux",
  "Retrouve-les dans ton espace, à tout moment",
  "Le début de chaque brief est lisible gratuitement",
];

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await currentUser();
  const target = next && next.startsWith("/") ? next : "/brief";
  if (user) redirect(target);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-14">
      <div className="w-full max-w-md">
        <div className="mb-9 flex justify-center">
          <Logo size={36} />
        </div>

        <div className="surface p-7 sm:p-9">
          <h1 className="font-display text-[25px] font-semibold tracking-tight text-white">
            Crée ton compte
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
            Email et mot de passe, rien d&apos;autre. Aucune carte demandée à cette étape.
          </p>

          <div className="mt-7">
            <AuthForm mode="signup" next={target} />
          </div>
        </div>

        <ul className="mt-7 space-y-2.5">
          {POINTS.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[13px] text-ink-400">
              <svg className="mt-1 shrink-0 text-mint-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
