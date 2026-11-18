"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function MobileNav({
  links,
  signedIn,
}: {
  links: { href: string; label: string }[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

      {/* Rendered into <body>: the header's backdrop blur would otherwise trap
          this fixed panel inside the 64px header, with no background. */}
      {open &&
        mounted &&
        createPortal(
        <div className="fixed inset-x-0 top-16 bottom-0 z-[60] overflow-y-auto border-t border-white/[0.08] bg-ink-950 px-5 py-6">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-4 text-[17px] font-semibold text-white hover:bg-white/[0.06]"
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
                  className="rounded-xl bg-[linear-gradient(120deg,#34d399,#10b981)] px-4 py-4 text-center text-[16px] font-bold text-ink-950"
                >
                  Mon espace
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-white/20 px-4 py-4 text-center text-[16px] font-semibold text-white"
                >
                  Connexion
                </Link>
                <Link
                  href="/#questionnaire"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-[linear-gradient(120deg,#34d399,#10b981)] px-4 py-4 text-center text-[16px] font-bold text-ink-950"
                >
                  Commencer
                </Link>
              </>
            )}
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
