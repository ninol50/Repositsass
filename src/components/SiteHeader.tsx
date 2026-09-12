import Link from "next/link";
import { currentPublicUser } from "@/lib/auth";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";

const LINKS = [
  { href: "/#comment-ca-marche", label: "Comment ça marche" },
  { href: "/#avis", label: "Avis" },
  { href: "/pricing", label: "Tarifs" },
  { href: "/faq", label: "FAQ" },
];

export async function SiteHeader() {
  const user = await currentPublicUser();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-[13.5px] text-ink-300 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link
                href="/ideas"
                className="rounded-lg px-3 py-2 text-[13.5px] text-ink-300 transition-colors hover:text-white"
              >
                Idées
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-2 text-[13.5px] text-ink-300 transition-colors hover:text-white"
              >
                Mes briefs
              </Link>
              <Link
                href="/brief"
                className="rounded-lg bg-white px-4 py-2 text-[13.5px] font-medium text-ink-950 transition-transform hover:scale-[1.02]"
              >
                Nouveau brief
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-[13.5px] text-ink-300 transition-colors hover:text-white"
              >
                Connexion
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-white px-4 py-2 text-[13.5px] font-medium text-ink-950 transition-transform hover:scale-[1.02]"
              >
                Créer un compte
              </Link>
            </>
          )}
        </div>

        <MobileNav links={LINKS} signedIn={Boolean(user)} />
      </div>
    </header>
  );
}
