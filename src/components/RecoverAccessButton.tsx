"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, buttonClass, cx, type ButtonVariant } from "./ui";

type Response = {
  ok?: boolean;
  plan?: string;
  error?: string;
  needsEmail?: boolean;
  alreadyActive?: boolean;
};

/**
 * "J'ai déjà payé".
 *
 * Asks the server to confront the account with Whop. When no membership is
 * found for the account address, it asks for the address actually used to pay
 * — the single most common reason a paid customer stays locked out — and
 * retries with it.
 */
export function RecoverAccessButton({
  variant = "ghost",
  size = "md",
  className,
  label = "J'ai déjà payé",
}: {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askEmail, setAskEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<string | null>(null);

  async function check(billingEmail?: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billingEmail ? { billingEmail } : {}),
      });

      if (res.status === 401) {
        router.push("/login?next=/pricing");
        return;
      }

      const data = (await res.json().catch(() => ({}))) as Response;

      if (data.ok) {
        setDone(data.plan ?? "actif");
        setAskEmail(false);
        // The plan lives in a server-rendered page: refresh rather than patch
        // the DOM, so every gate on the page re-evaluates server-side.
        router.refresh();
        return;
      }

      setError(data.error ?? "Vérification impossible pour l'instant.");
      if (data.needsEmail) setAskEmail(true);
    } catch {
      setError("Problème réseau. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <Alert tone="success">
        Accès débloqué — plan <strong>{done}</strong>. Recharge la page si rien ne bouge.
      </Alert>
    );
  }

  return (
    <div className={cx("w-full", className)}>
      {error && (
        <p className="mb-3 text-left text-[12.5px] leading-relaxed text-amber-300">{error}</p>
      )}

      {/* The field comes before its button: asking for an address under the
          button that consumes it reads backwards. */}
      {askEmail && (
        <div className="mb-3">
          <label htmlFor="billing-email" className="block text-[12.5px] text-ink-400">
            Adresse email utilisée pour payer sur Whop
          </label>
          <input
            id="billing-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && email) void check(email);
            }}
            placeholder="adresse@exemple.com"
            className="mt-1.5 h-11 w-full rounded-xl border border-white/[0.09] bg-ink-950 px-3.5 text-[14px] text-white placeholder:text-ink-600 focus:border-brand-500/60 focus:outline-none"
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => void check(askEmail && email ? email : undefined)}
        disabled={pending || (askEmail && !email)}
        className={buttonClass(variant, size, "w-full")}
      >
        {pending ? "Vérification…" : askEmail ? "Vérifier cette adresse" : label}
      </button>
    </div>
  );
}
