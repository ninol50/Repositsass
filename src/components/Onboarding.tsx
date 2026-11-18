"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { QUESTIONS, questionError, type Answers, type QuestionId } from "@/lib/questions";
import { EmailCodeForm } from "./EmailCodeForm";
import { Alert, LockIcon, cx } from "./ui";

/**
 * The whole first visit: three questions, then a generation that stops at the
 * account wall, then the real generation once the account exists.
 *
 * Answers live in sessionStorage so a refresh — or a detour through the login
 * page — never makes the visitor start over.
 */

const STORAGE_KEY = "scalebiz:onboarding";

type Phase = "questions" | "generating" | "locked" | "finishing";

/** Where the progress bar freezes when the account wall appears. */
const LOCK_AT = 64;

const STATUS = [
  { at: 0, text: "Analyse de ton profil…" },
  { at: 18, text: "Calcul de ton taux horaire cible…" },
  { at: 38, text: "Comparaison avec les 5 business ScaleBiz…" },
  { at: 56, text: "Classement selon ton temps et ton objectif…" },
  { at: LOCK_AT, text: "Génération en pause" },
  { at: 80, text: "Préparation de ton plan…" },
  { at: 96, text: "C'est prêt." },
];

function statusFor(progress: number) {
  let current = STATUS[0].text;
  for (const s of STATUS) if (progress >= s.at) current = s.text;
  return current;
}

type Saved = { values: Partial<Record<QuestionId, number>>; step: number; phase: Phase };

function readSaved(): Saved | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function writeSaved(s: Saved) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* private mode: the flow still works, it just won't survive a refresh */
  }
}

function clearSaved() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function Onboarding({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<Partial<Record<QuestionId, number>>>({});
  const [draft, setDraft] = useState<string>(String(QUESTIONS[0].defaultValue));
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("questions");
  const [progress, setProgress] = useState(0);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const restored = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const question = QUESTIONS[step];

  /* Restore an interrupted session once, on mount. */
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = readSaved();
    if (!saved) return;
    setValues(saved.values);
    const s = Math.min(saved.step, QUESTIONS.length - 1);
    setStep(s);
    setDraft(String(saved.values[QUESTIONS[s].id] ?? QUESTIONS[s].defaultValue));
    if (saved.phase === "locked" || saved.phase === "generating" || saved.phase === "finishing") {
      // Coming back to a paused generation: resume where it stopped.
      setProgress(LOCK_AT);
      setPhase(signedIn ? "finishing" : "locked");
    }
  }, [signedIn]);

  useEffect(() => {
    if (phase === "questions") inputRef.current?.focus();
  }, [phase, step]);

  /* Phase 1: fake-but-honest progress up to the wall. */
  useEffect(() => {
    if (phase !== "generating") return;
    const id = window.setInterval(() => {
      setProgress((p) => Math.min(LOCK_AT, p + 1 + Math.random() * 2.2));
    }, 70);
    return () => window.clearInterval(id);
  }, [phase]);

  /* Reaching the wall: lock, or go straight through when already signed in. */
  useEffect(() => {
    if (phase !== "generating" || progress < LOCK_AT) return;
    const id = window.setTimeout(() => setPhase(signedIn ? "finishing" : "locked"), 450);
    return () => window.clearTimeout(id);
  }, [phase, progress, signedIn]);

  useEffect(() => {
    if (phase === "locked") writeSaved({ values, step, phase: "locked" });
  }, [phase, values, step]);

  /* Phase 2: the real generation, once an account exists. */
  useEffect(() => {
    if (phase !== "finishing") return;
    let cancelled = false;

    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(94, p + 1.5));
    }, 45);

    (async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: values }),
        });
        const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
        if (cancelled) return;

        if (res.status === 401) {
          window.clearInterval(tick);
          setProgress(LOCK_AT);
          setPhase("locked");
          return;
        }
        if (!res.ok || !data.id) {
          window.clearInterval(tick);
          setApiError(data.error ?? "La génération a échoué. Réessaie.");
          return;
        }

        // Let the bar visibly finish before leaving.
        await new Promise((r) => window.setTimeout(r, 650));
        window.clearInterval(tick);
        setProgress(100);
        clearSaved();
        await new Promise((r) => window.setTimeout(r, 350));
        router.push(`/result/${data.id}`);
        router.refresh();
      } catch {
        window.clearInterval(tick);
        if (!cancelled) setApiError("Connexion impossible. Vérifie ta connexion internet et réessaie.");
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
  }, [phase, values, router]);

  function commit(raw: string): number | null {
    const cleaned = raw.replace(/\s/g, "").replace(",", ".");
    const n = cleaned === "" ? null : Number(cleaned);
    const err = questionError(question, n);
    setFieldError(err);
    return err ? null : n;
  }

  function next(e?: React.FormEvent) {
    e?.preventDefault();
    const n = commit(draft);
    if (n === null) return;

    const updated = { ...values, [question.id]: n };
    setValues(updated);

    if (step < QUESTIONS.length - 1) {
      const s = step + 1;
      setStep(s);
      setDraft(String(updated[QUESTIONS[s].id] ?? QUESTIONS[s].defaultValue));
      writeSaved({ values: updated, step: s, phase: "questions" });
      return;
    }

    setProgress(0);
    setApiError(null);
    setPhase("generating");
    writeSaved({ values: updated, step, phase: "generating" });
  }

  function back() {
    if (step === 0) return;
    const s = step - 1;
    setStep(s);
    setFieldError(null);
    setDraft(String(values[QUESTIONS[s].id] ?? QUESTIONS[s].defaultValue));
  }

  function nudge(delta: number) {
    const current = Number(draft.replace(/\s/g, "")) || question.defaultValue;
    const n = Math.min(question.max, Math.max(question.min, current + delta * question.step));
    setDraft(String(n));
    setFieldError(null);
  }

  /* ----------------------------- render ----------------------------- */

  if (phase !== "questions") {
    const answers = values as Answers;
    const locked = phase === "locked";
    return (
      <div className="surface relative overflow-hidden p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-brand-300">
            {locked ? "Génération en pause" : "Génération en cours"}
          </p>
          <p className="font-mono text-[13px] text-ink-300">{Math.round(progress)}%</p>
        </div>

        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cx(
              "h-full rounded-full transition-[width] duration-200 ease-out",
              locked
                ? "bg-[linear-gradient(90deg,#10b981,#fbbf24)]"
                : "animate-shimmer bg-[linear-gradient(90deg,#10b981,#6ee7b7,#10b981)]",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 text-[14px] text-ink-300" aria-live="polite">
          {statusFor(progress)}
        </p>

        <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Âge", value: `${answers.age} ans` },
            { label: "Par jour", value: `${answers.hoursPerDay} h` },
            { label: "Objectif", value: `${(answers.monthlyTarget ?? 0).toLocaleString("fr-FR")} €` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.07] bg-ink-950/60 px-2 py-3">
              <dt className="text-[11.5px] text-ink-500">{s.label}</dt>
              <dd className="mt-0.5 font-display text-[15px] font-semibold text-white">{s.value}</dd>
            </div>
          ))}
        </dl>

        {locked && (
          <div className="animate-rise mt-7 border-t border-white/[0.08] pt-7">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-300">
                <LockIcon size={18} />
              </span>
              <div>
                <h2 className="font-display text-[20px] font-semibold tracking-tight text-white">
                  Entre ton email pour finir la génération
                </h2>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-400">
                  Tu reçois un code, et ton compte est créé. Tes réponses sont gardées et ton plan sera
                  enregistré dans ton espace.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <EmailCodeForm submitLabel="Valider et voir mon plan" onSuccess={() => setPhase("finishing")} />
            </div>
          </div>
        )}

        {apiError && (
          <div className="mt-6 space-y-3">
            <Alert tone="error">{apiError}</Alert>
            <button
              type="button"
              onClick={() => {
                setApiError(null);
                setPhase("generating");
                setProgress(LOCK_AT - 1);
              }}
              className="text-[13.5px] text-brand-300 underline underline-offset-4"
            >
              Relancer la génération
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={next} className="surface p-6 sm:p-8" noValidate>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-brand-300">
          Question {step + 1} / {QUESTIONS.length}
        </p>
        <div className="flex gap-1.5" aria-hidden>
          {QUESTIONS.map((q, i) => (
            <span
              key={q.id}
              className={cx("h-1.5 w-8 rounded-full transition-colors", i <= step ? "bg-brand-400" : "bg-white/10")}
            />
          ))}
        </div>
      </div>

      <div key={question.id} className="animate-rise">
        <label htmlFor="answer" className="mt-5 block font-display text-[24px] font-semibold leading-tight tracking-tight text-white sm:text-[28px]">
          {question.title}
        </label>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">{question.hint}</p>

        <div className="mt-6 flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Diminuer"
            className="w-12 shrink-0 rounded-xl border border-white/[0.09] text-[20px] text-ink-300 hover:border-white/20 hover:text-white"
          >
            −
          </button>
          <div className="relative flex-1">
            <input
              ref={inputRef}
              id="answer"
              inputMode="numeric"
              autoComplete="off"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value.replace(/[^\d\s]/g, ""));
                setFieldError(null);
              }}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? "answer-error" : undefined}
              className="h-16 w-full rounded-xl border border-white/[0.09] bg-ink-950 px-4 pr-24 font-display text-[28px] font-semibold text-white focus:border-brand-500/60 focus:outline-none"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-ink-500">
              {question.unit}
            </span>
          </div>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Augmenter"
            className="w-12 shrink-0 rounded-xl border border-white/[0.09] text-[20px] text-ink-300 hover:border-white/20 hover:text-white"
          >
            +
          </button>
        </div>

        {fieldError && (
          <p id="answer-error" className="mt-2 text-[13px] text-red-300">
            {fieldError}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {question.presets.map((p) => {
            const active = draft.replace(/\s/g, "") === String(p.value);
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => {
                  setDraft(String(p.value));
                  setFieldError(null);
                }}
                className={cx(
                  "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                  active
                    ? "border-brand-400/60 bg-brand-500/15 text-brand-100"
                    : "border-white/10 text-ink-300 hover:border-white/25 hover:text-white",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="rounded-xl px-4 py-3 text-[14px] text-ink-400 hover:text-white disabled:invisible"
        >
          ← Retour
        </button>
        <button
          type="submit"
          className="h-12 rounded-xl bg-[linear-gradient(120deg,#34d399,#10b981)] px-6 text-[15px] font-semibold text-ink-950 transition-all hover:brightness-110 active:scale-[0.99]"
        >
          {step < QUESTIONS.length - 1 ? "Continuer →" : "Générer mon business →"}
        </button>
      </div>
    </form>
  );
}
