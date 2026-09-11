"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <h1 className="font-display text-[24px] font-semibold tracking-tight text-white">
        Quelque chose a cassé
      </h1>
      <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-ink-400">
        L&apos;erreur a été enregistrée côté serveur. Tu peux réessayer — si ça persiste, ton brief est
        toujours dans ton espace.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 h-11 rounded-xl bg-white px-6 text-[14px] font-medium text-ink-950 transition-colors hover:bg-ink-100"
      >
        Réessayer
      </button>
    </main>
  );
}
