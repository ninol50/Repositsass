"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Stars } from "./ui";

export function ReviewForm({
  existing,
  defaultName,
}: {
  existing: { rating: number; body: string; authorName: string } | null;
  defaultName: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [name, setName] = useState(existing?.authorName ?? defaultName);
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) return setError("Choisis une note.");
    if (body.trim().length < 20) return setError("20 caractères minimum, sinon ça n'aide personne.");

    setState("saving");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, body, authorName: name }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setState("idle");
      setError(data.error ?? "Impossible d'enregistrer ton avis.");
      return;
    }
    setState("done");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="surface-flat space-y-4 p-5">
      <div>
        <p className="mb-2 text-[13.5px] font-medium text-white">
          {existing ? "Modifier ton avis" : "Laisser un avis"}
        </p>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
              className="rounded p-0.5 transition-transform hover:scale-110"
            >
              <Stars rating={(hover || rating) >= i ? 5 : 0} size={22} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="review-name" className="mb-1.5 block text-[12.5px] text-ink-400">
          Nom affiché
        </label>
        <input
          id="review-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="h-11 w-full rounded-xl border border-white/[0.09] bg-ink-950 px-3.5 text-[14px] text-white placeholder:text-ink-600 focus:border-brand-500/50 focus:outline-none"
          placeholder="Ton prénom ou ton pseudo"
        />
      </div>

      <div>
        <label htmlFor="review-body" className="mb-1.5 block text-[12.5px] text-ink-400">
          Ton retour — ce qui a marché, ce qui manque
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={600}
          className="w-full resize-none rounded-xl border border-white/[0.09] bg-ink-950 p-3.5 text-[14px] leading-relaxed text-white placeholder:text-ink-600 focus:border-brand-500/50 focus:outline-none"
          placeholder="Sois honnête, les avis complaisants ne servent à personne."
        />
        <p className="mt-1 text-right text-[11.5px] text-ink-600">{body.length}/600</p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {state === "done" && <Alert tone="success">Avis enregistré. Merci.</Alert>}

      <Button type="submit" variant="brand" disabled={state === "saving"}>
        {state === "saving" ? "Enregistrement..." : existing ? "Mettre à jour" : "Publier mon avis"}
      </Button>
    </form>
  );
}
