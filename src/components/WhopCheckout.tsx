"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const LOADER_SRC = "https://js.whop.com/static/checkout/loader.js";
const LOADER_ID = "whop-checkout-loader";
/** How long the embed gets before we offer the way out. */
const FALLBACK_AFTER_MS = 5000;

/**
 * Loads the Whop checkout script once per page, not once per modal.
 *
 * It is only injected when someone actually opens a checkout: a third-party
 * script on every page view costs every visitor, paying or not.
 */
function ensureLoader(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(LOADER_ID)) return;
  const script = document.createElement("script");
  script.id = LOADER_ID;
  script.src = LOADER_SRC;
  script.async = true;
  document.head.appendChild(script);
}

export type WhopCheckoutProps = {
  planId: string;
  planName: string;
  price: string;
  period: string;
  /** The account address — the one the payment must be made with. */
  accountEmail: string | null;
  /** Full checkout URL, used only if the embed never appears. */
  fallbackUrl: string | null;
  siteName?: string;
  onClose: () => void;
};

export function WhopCheckout({
  planId,
  planName,
  price,
  period,
  accountEmail,
  fallbackUrl,
  siteName = "RepositSaaS",
  onClose,
}: WhopCheckoutProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [embedded, setEmbedded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    ensureLoader();
  }, []);

  /* The script is third-party and can simply never answer. Watch the mount
     point instead of trusting it: an iframe appearing is the only proof the
     form is really there. */
  useEffect(() => {
    const node = mountRef.current;
    if (!node) return;

    const seen = () => node.querySelector("iframe") !== null;
    if (seen()) {
      setEmbedded(true);
      return;
    }

    const observer = new MutationObserver(() => {
      if (seen()) {
        setEmbedded(true);
        observer.disconnect();
      }
    });
    observer.observe(node, { childList: true, subtree: true });

    const timer = window.setTimeout(() => {
      // Only offered while the form is still missing — putting an exit next to
      // a checkout that works only tempts the customer to leave.
      if (!seen()) setShowFallback(true);
    }, FALLBACK_AFTER_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [planId]);

  useEffect(() => {
    if (embedded) setShowFallback(false);
  }, [embedded]);

  /* Escape closes, and the page behind must not scroll under the modal. */
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previous;
    };
  }, [handleKey]);

  // Rendered into <body>, not where the button lives: the plan cards use
  // `backdrop-filter`, which makes them a containing block for `position:
  // fixed` — the modal would be clipped inside the card it was opened from.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink-950/80 px-4 py-6 backdrop-blur-sm sm:items-center sm:py-10"
      role="dialog"
      aria-modal="true"
      aria-label={`Paiement ${planName}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="surface relative w-full max-w-[500px] overflow-hidden p-0">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
          <div>
            <p className="font-display text-[16px] font-semibold text-white">Plan {planName}</p>
            <p className="mt-0.5 text-[12.5px] text-ink-400">
              {price}€ {period} · paiement sécurisé par Whop
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Above the form on purpose: a warning under it is read after the
            field has already been filled, which is too late. */}
        <div className="border-b border-amber-400/20 bg-amber-400/[0.08] px-5 py-3.5">
          <p className="text-[13px] leading-relaxed text-amber-100">
            <span aria-hidden>⚠️</span> Utilise la même adresse email que ton compte {siteName}, sinon
            ton accès ne sera pas activé.
          </p>
          {accountEmail && (
            <p className="mt-1.5 break-all font-mono text-[12.5px] text-amber-200/90">{accountEmail}</p>
          )}
          <p className="mt-1.5 text-[12px] leading-relaxed text-amber-100/70">
            Whop pré-remplit l&apos;adresse de ton compte Whop, qui n&apos;est pas toujours la même.
            Si tu paies avec une autre, clique sur « J&apos;ai déjà payé » ensuite : on la rattache.
          </p>
        </div>

        <div className="px-3 py-3">
          {/* The loader script replaces this div with its iframe. */}
          <div
            ref={mountRef}
            data-whop-checkout-plan-id={planId}
            data-whop-checkout-theme="light"
            // Height only once the form is in: an empty 420px box would push
            // the loading state below the fold.
            className={embedded ? "min-h-[420px] w-full" : "w-full"}
          />

          {!embedded && (
            <div className="px-3 pb-3 pt-1 text-center">
              <div className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
              <p className="text-[13px] text-ink-400">Chargement du paiement sécurisé…</p>

              {showFallback && (
                <div className="mt-5 border-t border-white/[0.07] pt-4">
                  <p className="text-[12.5px] leading-relaxed text-ink-400">
                    Le formulaire met anormalement longtemps à s&apos;afficher. Un bloqueur de
                    publicité ou une extension peut en être la cause.
                  </p>
                  {fallbackUrl && (
                    <a
                      href={fallbackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex h-10 items-center rounded-xl border border-white/12 px-4 text-[13.5px] text-white transition-colors hover:bg-white/[0.05]"
                    >
                      Payer sur Whop
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
