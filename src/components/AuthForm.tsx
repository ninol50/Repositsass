"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "./ui";

/**
 * Email + password form.
 *
 * On a page it redirects to `next`. Inline (the locked generation), the parent
 * passes `onSuccess` and `onSwitchMode` so the visitor never leaves the flow.
 */
export function AuthForm({
  mode,
  next = "/dashboard",
  onSuccess,
  onSwitchMode,
  submitLabel,
}: {
  mode: "login" | "signup";
  next?: string;
  onSuccess?: () => void | Promise<void>;
  onSwitchMode?: () => void;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Quelque chose n'a pas fonctionné.");
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

  const switchLink = (label: string, target: "login" | "signup") =>
    onSwitchMode ? (
      <button type="button" onClick={onSwitchMode} className="text-brand-300 underline underline-offset-4 hover:text-brand-200">
        {label}
      </button>
    ) : (
      <Link
        href={`/${target}?next=${encodeURIComponent(next)}`}
        className="text-brand-300 underline underline-offset-4 hover:text-brand-200"
      >
        {label}
      </Link>
    );

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor={`${mode}-email`} className="mb-1.5 block text-[13px] text-ink-400">
          Email
        </label>
        <input
          id={`${mode}-email`}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="toi@exemple.com"
        />
      </div>

      <div>
        <label htmlFor={`${mode}-password`} className="mb-1.5 block text-[13px] text-ink-400">
          Mot de passe
        </label>
        <div className="relative">
          <input
            id={`${mode}-password`}
            type={show ? "text" : "password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} pr-20`}
            placeholder={isSignup ? "8 caractères, une lettre, un chiffre" : "••••••••"}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-[12.5px] text-ink-400 hover:text-white"
          >
            {show ? "Cacher" : "Voir"}
          </button>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-[linear-gradient(120deg,#34d399,#10b981)] text-[15px] font-semibold text-ink-950 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
      >
        {pending ? "Un instant..." : (submitLabel ?? (isSignup ? "Créer mon compte" : "Se connecter"))}
      </button>

      <p className="text-center text-[13.5px] text-ink-400">
        {isSignup ? (
          <>Déjà un compte ? {switchLink("Se connecter", "login")}</>
        ) : (
          <>Pas encore de compte ? {switchLink("En créer un", "signup")}</>
        )}
      </p>

      {isSignup && (
        <p className="text-center text-[12px] leading-relaxed text-ink-600">
          En créant un compte, tu acceptes les{" "}
          <Link href="/legal/terms" className="underline underline-offset-2 hover:text-ink-400">
            conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-ink-400">
            politique de confidentialité
          </Link>
          .
        </p>
      )}
    </form>
  );
}
