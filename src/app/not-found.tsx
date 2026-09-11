import { ButtonLink } from "@/components/ui";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <Logo size={36} />
      <p className="mt-12 font-display text-[72px] font-semibold leading-none tracking-tight text-white/10">
        404
      </p>
      <h1 className="mt-4 font-display text-[24px] font-semibold tracking-tight text-white">
        Cette page n&apos;existe pas
      </h1>
      <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-ink-400">
        Le lien est peut-être périmé, ou ce brief appartient à un autre compte.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/" variant="outline">
          Retour à l&apos;accueil
        </ButtonLink>
        <ButtonLink href="/brief" variant="brand">
          Générer un brief
        </ButtonLink>
      </div>
    </main>
  );
}
