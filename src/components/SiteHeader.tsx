import Link from "next/link";
import { isAdminEmail } from "@/lib/admin";
import { currentUser } from "@/lib/auth";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";

const LINKS = [
  { href: "/#comment-ca-marche", label: "Comment ça marche" },
  { href: "/pricing", label: "Offres" },
  { href: "/faq", label: "FAQ" },
];

export async function SiteHeader() {
  const user = await currentUser().catch(() => null);
  const admin = user ? isAdminEmail(user.email) : false;

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
              {admin && (
                <Link href="/admin" className="rounded-lg px-3 py-2 text-[13.5px] text-ink-300 transition-colors hover:text-white">
                  Admin
                </Link>
              )}
              <Link
                href="/dashboard"
                className="rounded-lg bg-white px-4 py-2 text-[13.5px] font-medium text-ink-950 transition-transform hover:scale-[1.02]"
              >
                Mon espace
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 text-[13.5px] text-ink-300 transition-colors hover:text-white">
                Connexion
              </Link>
              <Link
                href="/#questionnaire"
                className="rounded-lg bg-white px-4 py-2 text-[13.5px] font-medium text-ink-950 transition-transform hover:scale-[1.02]"
              >
                Commencer
              </Link>
            </>
          )}
        </div>

        <MobileNav links={LINKS} signedIn={Boolean(user)} />
      </div>
    </header>
  );
}
