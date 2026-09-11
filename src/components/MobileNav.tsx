"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function MobileNav({
  links,
  signedIn,
}: {
  links: { href: string; label: string }[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white"
      >
        <span className="relative block h-3.5 w-4">
          <span
            className="absolute left-0 block h-[1.5px] w-4 bg-current transition-transform duration-200"
            style={{ top: open ? 6 : 1, transform: open ? "rotate(45deg)" : "none" }}
          />
          <span
            className="absolute left-0 top-[6px] block h-[1.5px] w-4 bg-current transition-opacity duration-200"
            style={{ opacity: open ? 0 : 1 }}
          />
          <span
            className="absolute left-0 block h-[1.5px] w-4 bg-current transition-transform duration-200"
            style={{ top: open ? 6 : 11, transform: open ? "rotate(-45deg)" : "none" }}
          />
        </span>
      </button>

      {open && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 bg-ink-950/97 px-5 py-6 backdrop-blur-xl">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3.5 text-[15px] text-ink-200 hover:bg-white/[0.05] hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.08] pt-6">
            {signedIn ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-white/12 px-4 py-3.5 text-center text-[15px] text-white"
                >
                  Mes briefs
                </Link>
                <Link
                  href="/brief"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-white px-4 py-3.5 text-center text-[15px] font-medium text-ink-950"
                >
                  Nouveau brief
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-white/12 px-4 py-3.5 text-center text-[15px] text-white"
                >
                  Connexion
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-white px-4 py-3.5 text-center text-[15px] font-medium text-ink-950"
                >
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
