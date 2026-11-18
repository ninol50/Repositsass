"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CONSENT_TEXT,
  OATH_TEXT,
  QUESTIONS,
  questionError,
  type Answers,
  type Question,
  type QuestionId,
} from "@/lib/questions";
import { AuthForm } from "./AuthForm";
import { Fingerprint } from "./Fingerprint";
import { GenerationScreen, type ScreenPhase } from "./GenerationScreen";
import { CheckIcon, cx } from "./ui";

/**
 * The whole first visit:
 *   questions → consent → fingerprint oath → full-screen generation
 *   → account wall (paused) → generation resumes → plan found, locked.
 *
 * Progress lives in sessionStorage so a refresh never makes the visitor
 * start over.
 */

const STORAGE_KEY = "scalebiz:onboarding:v2";

type Phase = "questions" | "consent" | "oath" | ScreenPhase;

/** Where the generation pauses for the account wall. */
const PAUSE_AT = 62;

type Result = { id: string; promoEndsAt: string };

type Saved = {
  values: Values;
  step: number;
  phase: Phase;
  consent: boolean;
  oath: boolean;
  result: Result | null;
};

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

const SCREEN_PHASES: Phase[] = ["working", "auth", "finishing", "locked"];

type Values = Partial<Record<QuestionId, number | boolean>>;

/** What the number field shows when arriving on question `q`. */
function draftFor(q: Question, values: Values): string {
  if (q.kind !== "number") return "";
  const v = values[q.id];
  return String(typeof v === "number" ? v : q.defaultValue);
}

export function Onboarding({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>({});
  const [draft, setDraft] = useState<string>(draftFor(QUESTIONS[0], {}));
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("questions");
  const [consent, setConsent] = useState(false);
  const [oath, setOath] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const restored = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const question = QUESTIONS[step];

  /* Restore an interrupted visit once, on mount. */
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = readSaved();
    if (!saved) return;
    setValues(saved.values);
    setConsent(saved.consent);
    setOath(saved.oath);
    const s = Math.min(saved.step, QUESTIONS.length - 1);
    setStep(s);
    setDraft(draftFor(QUESTIONS[s], saved.values));

    if (saved.result) {
      setResult(saved.result);
      setProgress(100);
      setPhase("locked");
    } else if (SCREEN_PHASES.includes(saved.phase)) {
      setProgress(PAUSE_AT);
      setPhase(signedIn ? "finishing" : "auth");
    } else {
      setPhase(saved.phase);
    }
  }, [signedIn]);

  const save = useCallback(
    (patch: Partial<Saved>) =>
      writeSaved({ values, step, phase, consent, oath, result, ...patch }),
    [values, step, phase, consent, oath, result],
  );

  useEffect(() => {
    if (phase === "questions") inputRef.current?.focus();
  }, [phase, step]);

  /* 1. Working up to the account wall. */
  useEffect(() => {
    if (phase !== "working") return;
    const id = window.setInterval(() => {
      setProgress((p) => Math.min(PAUSE_AT, p + 0.6 + Math.random() * 1.1));
    }, 90);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "working" || progress < PAUSE_AT) return;
    const id = window.setTimeout(() => setPhase(signedIn ? "finishing" : "auth"), 700);
    return () => window.clearTimeout(id);
  }, [phase, progress, signedIn]);

  useEffect(() => {
    if (phase === "auth") save({ phase: "auth" });
  }, [phase, save]);

  /* 2. The real generation, once an account exists. */
  useEffect(() => {
    if (phase !== "finishing") return;
    let cancelled = false;
    const tick = window.setInterval(() => setProgress((p) => Math.min(97, p + 0.9)), 70);

    (async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: values, consent: true }),
        });
        const data = (await res.json().catch(() => ({}))) as Partial<Result> & { error?: string };
        if (cancelled) return;

        if (res.status === 401) {
          window.clearInterval(tick);
          setProgress(PAUSE_AT);
          setPhase("auth");
          return;
        }
        if (!res.ok || !data.id || !data.promoEndsAt) {
          window.clearInterval(tick);
          setApiError(data.error ?? "La génération a échoué. Réessaie.");
          return;
        }

        // Let the log run to the end before revealing the result.
        await new Promise((r) => window.setTimeout(r, 2600));
        if (cancelled) return;
        window.clearInterval(tick);
        setProgress(100);
        const found = { id: data.id, promoEndsAt: data.promoEndsAt };
        setResult(found);
        await new Promise((r) => window.setTimeout(r, 900));
        if (cancelled) return;
        setPhase("locked");
        writeSaved({ values, step, phase: "locked", consent, oath, result: found });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ----------------------------- actions ----------------------------- */

  function commit(raw: string): number | null {
    if (question.kind !== "number") return null;
    const cleaned = raw.replace(/\s/g, "").replace(",", ".");
    const n = cleaned === "" ? null : Number(cleaned);
    const err = questionError(question, n);
    setFieldError(err);
    return err ? null : n;
  }

  function nextQuestion(e?: React.FormEvent) {
    e?.preventDefault();
    const n = commit(draft);
    if (n === null) return;
    advance({ ...values, [question.id]: n });
  }

  /** Stores an answer and moves to the next question, or to the consent step. */
  function advance(updated: Values) {
    setValues(updated);

    if (step < QUESTIONS.length - 1) {
      const s = step + 1;
      setStep(s);
      setDraft(draftFor(QUESTIONS[s], updated));
      writeSaved({ values: updated, step: s, phase: "questions", consent, oath, result: null });
      return;
    }
    setPhase("consent");
    writeSaved({ values: updated, step, phase: "consent", consent, oath, result: null });
  }

  function back() {
    setFieldError(null);
    if (phase === "oath") return setPhase("consent");
    if (phase === "consent") return setPhase("questions");
    if (step === 0) return;
    const s = step - 1;
    setStep(s);
    setDraft(draftFor(QUESTIONS[s], values));
  }

  function nudge(delta: number) {
    if (question.kind !== "number") return;
    const current = Number(draft.replace(/\s/g, ""));
    const base = Number.isFinite(current) ? current : question.defaultValue;
    const n = Math.min(question.max, Math.max(question.min, base + delta * question.step));
    setDraft(String(n));
    setFieldError(null);
  }

  function launch() {
    setProgress(0);
    setApiError(null);
    setResult(null);
    setPhase("working");
    writeSaved({ values, step, phase: "working", consent, oath, result: null });
  }

  /* ----------------------------- render ------------------------------ */

  if (SCREEN_PHASES.includes(phase)) {
    return (
      <GenerationScreen
        phase={phase as ScreenPhase}
        progress={progress}
        answers={values as Answers}
        result={result}
        error={apiError}
        onRetry={() => {
          setApiError(null);
          setPhase("finishing");
        }}
        onLeave={clearSaved}
        auth={
          <AuthForm
            key={authMode}
            mode={authMode}
            submitLabel={authMode === "signup" ? "Créer mon compte et continuer" : "Me connecter et continuer"}
            onSwitchMode={() => setAuthMode((m) => (m === "signup" ? "login" : "signup"))}
            onSuccess={() => setPhase("finishing")}
          />
        }
      />
    );
  }

  const backButton = (
    <button
      type="button"
      onClick={back}
      className={cx(
        "rounded-xl px-2 py-3 text-[14px] text-ink-400 hover:text-white",
        phase === "questions" && step === 0 && "invisible",
      )}
    >
      ← Retour
    </button>
  );

  if (phase === "consent") {
    return (
      <div className="surface relative p-6 sm:p-8">
        <span className="absolute right-5 top-5 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-[12px] font-medium text-gold-300">
          Plus que 2 étapes 🔥
        </span>
        <h2 className="max-w-[80%] font-display text-[24px] font-semibold leading-tight tracking-tight text-white sm:text-[28px]">
          Avant de construire ton plan
        </h2>

        <label
          className={cx(
            "mt-7 flex cursor-pointer items-start gap-4 rounded-2xl border p-5 transition-colors",
            consent ? "border-brand-400/60 bg-brand-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/25",
          )}
        >
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              save({ consent: e.target.checked });
            }}
            className="peer sr-only"
          />
          <span
            className={cx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400",
              consent ? "border-brand-400 bg-brand-400 text-ink-950" : "border-white/25 text-transparent",
            )}
            aria-hidden
          >
            <CheckIcon size={18} />
          </span>
          <span className="text-[16px] leading-relaxed text-ink-100 sm:text-[17px]">{CONSENT_TEXT}</span>
        </label>

        <div className="mt-8 flex items-center justify-between gap-3">
          {backButton}
          <button
            type="button"
            disabled={!consent}
            onClick={() => {
              setPhase("oath");
              save({ phase: "oath" });
            }}
            className="h-12 rounded-xl bg-[linear-gradient(120deg,#34d399,#10b981)] px-6 text-[15px] font-semibold text-ink-950 transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuer →
          </button>
        </div>
      </div>
    );
  }

  if (phase === "oath") {
    return (
      <div className="surface relative p-6 sm:p-8">
        <span className="absolute right-5 top-5 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-[12px] font-medium text-gold-300">
          Dernière étape
        </span>
        <h2 className="max-w-[75%] font-display text-[24px] font-semibold leading-tight tracking-tight text-white sm:text-[28px]">
          Ton engagement
        </h2>
        <p className="mt-4 text-center font-display text-[19px] font-semibold leading-snug text-white sm:text-[21px]">
          « {OATH_TEXT} »
        </p>

        <div className="mt-7">
          <Fingerprint
            done={oath}
            onDone={() => {
              setOath(true);
              save({ oath: true });
            }}
          />
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          {backButton}
          <button
            type="button"
            disabled={!oath}
            onClick={launch}
            className="h-12 rounded-xl bg-[linear-gradient(120deg,#34d399,#10b981)] px-5 text-[15px] font-bold text-ink-950 transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 sm:px-6"
          >
            Créer mon business de A à Z →
          </button>
        </div>
      </div>
    );
  }

  if (question.kind === "choice") {
    const chosen = values[question.id];
    return (
      <div className="surface p-6 sm:p-8">
        <div key={question.id} className="animate-rise">
          <h2 className="font-display text-[24px] font-semibold leading-tight tracking-tight text-white sm:text-[28px]">
            {question.title}
          </h2>
          {question.hint && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">{question.hint}</p>}

          <div className="mt-6 grid gap-3">
            {question.options.map((o) => (
              <button
                key={String(o.value)}
                type="button"
                onClick={() => advance({ ...values, [question.id]: o.value })}
                className={cx(
                  "flex items-center gap-4 rounded-2xl border p-5 text-left transition-colors",
                  chosen === o.value
                    ? "border-brand-400/60 bg-brand-500/10"
                    : "border-white/10 bg-white/[0.02] hover:border-brand-400/40 hover:bg-white/[0.04]",
                )}
              >
                <span className="text-[30px] leading-none" aria-hidden>
                  {o.emoji}
                </span>
                <span>
                  <span className="block text-[17px] font-semibold text-white">{o.label}</span>
                  <span className="mt-0.5 block text-[13.5px] text-ink-400">{o.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">{backButton}</div>
      </div>
    );
  }

  return (
    <form onSubmit={nextQuestion} className="surface p-6 sm:p-8" noValidate>
      <div key={question.id} className="animate-rise">
        <label
          htmlFor="answer"
          className="block font-display text-[24px] font-semibold leading-tight tracking-tight text-white sm:text-[28px]"
        >
          {question.title}
        </label>
        {question.hint && <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">{question.hint}</p>}

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
        {backButton}
        <button
          type="submit"
          className="h-12 rounded-xl bg-[linear-gradient(120deg,#34d399,#10b981)] px-6 text-[15px] font-semibold text-ink-950 transition-all hover:brightness-110 active:scale-[0.99]"
        >
          Continuer →
        </button>
      </div>
    </form>
  );
}
