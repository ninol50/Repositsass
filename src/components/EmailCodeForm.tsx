"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert } from "./ui";

/** Seconds before "send again" is offered — matches nobody's patience, not the rate limit. */
const RESEND_AFTER = 30;

/**
 * Passwordless sign-in: email → 6-digit code → signed in.
 *
 * One flow for new and returning users: the account is created when the
 * first code is verified. On a page it redirects to `next`; inline (the
 * locked generation) the parent passes `onSuccess`.
 */
export function EmailCodeForm({
  next = "/dashboard",
  onSuccess,
  submitLabel = "Valider",
}: {
  next?: string;
  onSuccess?: () => void | Promise<void>;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function post(path: string, payload: object) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; devCode?: string; expired?: boolean };
    return { res, data };
  }

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const { res, data } = await post("/api/auth/request-code", { email });
      if (!res.ok) {
        setError(data.error ?? `Le serveur a répondu une erreur ${res.status}. Ouvre /api/health pour voir ce qui manque.`);
        return;
      }
      setStep("code");
      setCode("");
      setCooldown(RESEND_AFTER);
      setNotice(
        data.devCode
          ? `Mode développement : aucun email envoyé, ton code est ${data.devCode}.`
          : `Code envoyé à ${email.trim().toLowerCase()}. Pense à regarder dans les spams.`,
      );
    } catch {
      setError("Connexion impossible. Vérifie ta connexion internet et réessaie.");
    } finally {
      setPending(false);
    }
  }

  async function verify(e?: React.FormEvent, value = code) {
    e?.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const { res, data } = await post("/api/auth/verify-code", { email, code: value });
      if (!res.ok) {
        setError(data.error ?? `Le serveur a répondu une erreur ${res.status}. Ouvre /api/health pour voir ce qui manque.`);
        if (data.expired) setCooldown(0);
        setPending(false);
        return;
      }
      if (onSuccess) {
        await onSuccess();
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Connexion impossible. Vérifie ta connexion internet et réessaie.");
      setPending(false);
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-white/[0.09] bg-ink-950 px-4 text-[15px] text-white placeholder:text-ink-600 focus:border-brand-500/60 focus:outline-none";
  const buttonClass =
    "h-12 w-full rounded-xl bg-[linear-gradient(120deg,#34d399,#10b981)] text-[15px] font-semibold text-ink-950 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50";

  if (step === "email") {
    return (
      <form onSubmit={requestCode} className="space-y-5">
        <div>
          <label htmlFor="signin-email" className="mb-1.5 block text-[13px] text-ink-400">
            Ton email
          </label>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="toi@exemple.com"
          />
          <p className="mt-2 text-[12.5px] text-ink-500">Pas de mot de passe : on t&apos;envoie un code à 6 chiffres.</p>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Envoi du code..." : "Recevoir mon code"}
        </button>

        <p className="text-center text-[12px] leading-relaxed text-ink-600">
          En continuant, tu acceptes les{" "}
          <Link href="/legal/terms" className="underline underline-offset-2 hover:text-ink-400">
            conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-ink-400">
            politique de confidentialité
          </Link>
          .
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-5">
      {notice && <Alert tone="success">{notice}</Alert>}

      <div>
        <label htmlFor="signin-code" className="mb-1.5 block text-[13px] text-ink-400">
          Code reçu par email
        </label>
        <input
          ref={codeRef}
          id="signin-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(digits);
            setError(null);
            // Pasted or autofilled code: no need to press the button.
            if (digits.length === 6) verify(undefined, digits);
          }}
          className="h-16 w-full rounded-xl border border-white/[0.09] bg-ink-950 text-center font-mono text-[30px] tracking-[0.5em] text-white placeholder:text-ink-700 focus:border-brand-500/60 focus:outline-none"
          placeholder="••••••"
        />
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <button type="submit" disabled={pending || code.length !== 6} className={buttonClass}>
        {pending ? "Vérification..." : submitLabel}
      </button>

      <div className="flex items-center justify-between gap-3 text-[13px]">
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setError(null);
            setNotice(null);
          }}
          className="text-ink-400 hover:text-white"
        >
          ← Changer d&apos;email
        </button>
        <button
          type="button"
          disabled={cooldown > 0 || pending}
          onClick={() => requestCode()}
          className="text-brand-300 underline underline-offset-4 hover:text-brand-200 disabled:text-ink-600 disabled:no-underline"
        >
          {cooldown > 0 ? `Renvoyer (${cooldown} s)` : "Renvoyer le code"}
        </button>
      </div>
    </form>
  );
}
