"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Billing } from "@/lib/plans";
import { cx } from "./ui";

async function post(path: string, body: object) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; portal?: boolean };
  return { res, data };
}

/**
 * Plan call-to-action: opens Stripe Checkout for this offer.
 *
 * The browser only says which offer and billing period were clicked, plus the
 * questionnaire it comes from. Price, launch discount and access are decided
 * by the server and Stripe.
 */
export function PlanButton({
  offerId,
  planName,
  billing = "monthly",
  generationId,
  highlighted,
  current,
}: {
  offerId: "starter" | "pro";
  planName: string;
  billing?: Billing;
  /** The questionnaire whose countdown may grant the launch price. */
  generationId?: string;
  highlighted?: boolean;
  current?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (current) {
    return (
      <div className="flex h-11 w-full items-center justify-center rounded-xl border border-brand-400/40 bg-brand-500/10 text-[14px] font-medium text-brand-200">
        Ton offre actuelle
      </div>
    );
  }

  async function choose() {
    setPending(true);
    setError(null);
    try {
      const { res, data } = await post("/api/billing/checkout", {
        offer: offerId,
        billing,
        generationId,
        returnPath: pathname,
      });

      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      // Already subscribed: switching offers happens in Stripe's portal.
      if (res.status === 409 && data.portal) {
        const portal = await post("/api/billing/portal", {});
        if (portal.data.url) {
          window.location.href = portal.data.url;
          return;
        }
      }
      if (!res.ok || !data.url) {
        setError(data.error ?? "Le paiement n'a pas pu s'ouvrir. Réessaie.");
        setPending(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Connexion impossible. Vérifie ta connexion internet et réessaie.");
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={choose}
        disabled={pending}
        className={cx(
          "h-11 w-full rounded-xl text-[14px] font-semibold transition-all active:scale-[0.99] disabled:opacity-60",
          highlighted
            ? "bg-[linear-gradient(120deg,#34d399,#10b981)] text-ink-950 hover:brightness-110"
            : "border border-white/12 text-white hover:border-white/25 hover:bg-white/[0.04]",
        )}
      >
        {pending ? "Ouverture du paiement…" : `Choisir ${planName}`}
      </button>
      {error && (
        <p className="mt-2.5 text-center text-[12.5px] leading-relaxed text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
