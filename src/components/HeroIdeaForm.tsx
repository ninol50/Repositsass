"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMPLES = [
  "Un outil qui transforme les appels clients en compte-rendus CRM automatiques",
  "Une app qui surveille les prix des concurrents e-commerce et alerte sur Slack",
  "Un dashboard qui centralise les factures des freelances et relance les impayés",
  "Un générateur de plannings pour les salles de sport indépendantes",
];

export function HeroIdeaForm() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [pending, setPending] = useState(false);

  function submit(value: string) {
    const clean = value.trim();
    if (clean.length < 10) return;
    setPending(true);
    router.push(`/brief?idea=${encodeURIComponent(clean.slice(0, 400))}`);
  }

  return (
    <div className="w-full max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(idea);
        }}
        className="surface flex flex-col gap-2.5 p-2.5 sm:flex-row sm:items-center"
      >
        <label htmlFor="hero-idea" className="sr-only">
          Ton idée de SaaS
        </label>
        <input
          id="hero-idea"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Décris ton idée de SaaS en une phrase..."
          maxLength={400}
          className="h-12 w-full flex-1 rounded-xl bg-transparent px-4 text-[15px] text-white placeholder:text-ink-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={idea.trim().length < 10 || pending}
          className="h-12 shrink-0 rounded-xl bg-[linear-gradient(120deg,#8f6fff,#6a45f5)] px-6 text-[14.5px] font-medium text-white transition-all hover:brightness-110 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Ouverture..." : "Générer mon site"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-ink-500">Essaie :</span>
        {EXAMPLES.slice(0, 3).map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setIdea(ex)}
            className="rounded-full border border-white/[0.09] bg-white/[0.03] px-3 py-1.5 text-left text-[12.5px] text-ink-400 transition-colors hover:border-white/20 hover:text-ink-200"
          >
            {ex.length > 46 ? `${ex.slice(0, 46)}…` : ex}
          </button>
        ))}
      </div>
    </div>
  );
}
