import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connecte-toi à ton espace RepositSaaS.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await currentUser();
  const target = next && next.startsWith("/") ? next : "/dashboard";
  if (user) redirect(target);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-14">
      <div className="w-full max-w-md">
        <div className="mb-9 flex justify-center">
          <Logo size={36} />
        </div>

        <div className="surface p-7 sm:p-9">
          <h1 className="font-display text-[25px] font-semibold tracking-tight text-white">
            Content de te revoir
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
            Connecte-toi pour retrouver tes briefs.
          </p>

          <div className="mt-7">
            <AuthForm mode="login" next={target} />
          </div>
        </div>
      </div>
    </main>
  );
}
