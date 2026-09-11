import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:py-20">
        <h1 className="font-display text-[32px] font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-2 text-[13px] text-ink-500">Dernière mise à jour : {updated}</p>
        <div className="legal mt-10 space-y-6 text-[14.5px] leading-relaxed text-ink-300">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-[18px] font-semibold text-white">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[13px] text-amber-200">
      {children}
    </mark>
  );
}
