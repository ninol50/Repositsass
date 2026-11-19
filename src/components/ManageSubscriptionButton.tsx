"use client";

import { useState } from "react";

/** Opens Stripe's customer portal: change offer, update the card, cancel. */
export function ManageSubscriptionButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Impossible d'ouvrir la gestion de l'abonnement.");
    } catch {
      setError("Connexion impossible. Réessaie.");
    }
    setPending(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="h-11 rounded-xl border border-white/15 px-5 text-[14px] font-medium text-white transition-colors hover:border-white/30 hover:bg-white/[0.04] disabled:opacity-60"
      >
        {pending ? "Ouverture…" : "Gérer mon abonnement"}
      </button>
      {error && <p className="mt-2 text-[12.5px] text-red-300">{error}</p>}
    </div>
  );
}
