"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  COLOR_PRESETS,
  STEPS,
  defaultAnswers,
  type Answers,
  type Field,
} from "@/lib/questions";
import { Alert, cx } from "./ui";

const DRAFT_KEY = "repositsaas:draft";

function isAnswered(field: Field, answers: Answers): boolean {
  const v = answers[field.id];
  if (!field.required) return true;
  if (Array.isArray(v)) return v.length > 0;
  if (field.type === "text" || field.type === "textarea") return (v ?? "").trim().length >= 10;
  return Boolean(v);
}

/* ----------------------------- field views ---------------------------- */

function TextField({ field, value, onChange }: { field: Field; value: string; onChange: (v: string) => void }) {
  const long = field.type === "textarea";
  const shared = {
    id: field.id,
    value,
    maxLength: 600,
    placeholder: field.placeholder,
    className: cx(
      "w-full rounded-xl border border-white/[0.09] bg-ink-950 px-4 text-[15px] text-white placeholder:text-ink-600 transition-colors focus:border-brand-500/60 focus:outline-none",
      long ? "resize-none py-3.5 leading-relaxed" : "h-12",
    ),
  };

  return (
    <div>
      {long ? (
        <textarea {...shared} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...shared} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.required && (
        <p className="mt-1.5 text-right text-[11.5px] text-ink-600">{value.length} caractères</p>
      )}
    </div>
  );
}

function NumberField({ field, value, onChange }: { field: Field; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input
        id={field.id}
        type="number"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-40 rounded-xl border border-white/[0.09] bg-ink-950 px-4 text-[15px] text-white focus:border-brand-500/60 focus:outline-none"
      />
      <span className="text-[13.5px] text-ink-500">€ / mois / client</span>
    </div>
  );
}

function ChoiceField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {(field.options ?? []).map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={cx(
              "rounded-xl border p-4 text-left transition-all",
              active
                ? "border-brand-500/60 bg-brand-500/[0.1] shadow-[0_0_0_1px_rgba(124,92,255,0.25)]"
                : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cx(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  active ? "border-brand-400 bg-brand-500" : "border-white/25",
                )}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span className="text-[14px] font-medium text-white">{o.label}</span>
            </span>
            {o.hint && <span className="mt-1.5 block pl-6 text-[12.5px] leading-snug text-ink-500">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

function MultiField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const max = field.maxSelected ?? 99;
  const full = value.length >= max;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(field.options ?? []).map((o) => {
          const active = value.includes(o.value);
          const disabled = !active && full;
          return (
            <button
              key={o.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(active ? value.filter((v) => v !== o.value) : [...value, o.value])}
              className={cx(
                "rounded-full border px-4 py-2.5 text-[13.5px] transition-all",
                active
                  ? "border-brand-500/60 bg-brand-500/[0.14] text-white"
                  : disabled
                    ? "cursor-not-allowed border-white/[0.06] text-ink-600"
                    : "border-white/[0.09] text-ink-300 hover:border-white/25 hover:text-white",
              )}
            >
              {active && <span className="mr-1.5 text-brand-300">✓</span>}
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[12.5px] text-ink-500">
        {value.length}/{max} sélectionnées
        {full && " — c'est le maximum, et c'est volontaire."}
      </p>
    </div>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2.5">
        {COLOR_PRESETS.map((p) => {
          const active = value.toUpperCase() === p.value.toUpperCase();
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              title={p.label}
              aria-label={p.label}
              aria-pressed={active}
              className={cx(
                "h-11 w-11 rounded-xl border-2 transition-transform hover:scale-105",
                active ? "border-white" : "border-white/10",
              )}
              style={{ background: p.swatch }}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#7C5CFF"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          aria-label="Couleur personnalisée"
          className="h-11 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          maxLength={7}
          className="h-11 w-32 rounded-xl border border-white/[0.09] bg-ink-950 px-3 font-mono text-[14px] uppercase text-white focus:border-brand-500/60 focus:outline-none"
        />
        <span className="text-[12.5px] text-ink-500">Ou une couleur à toi</span>
      </div>
    </div>
  );
}

/* ------------------------------- wizard -------------------------------- */

export function BriefWizard({
  signedIn,
  initialIdea,
  prefill,
  prefillLabel,
}: {
  signedIn: boolean;
  initialIdea?: string;
  /** Answers copied from a catalogue entry (Pro). */
  prefill?: Answers;
  prefillLabel?: string;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => {
    const base = { ...defaultAnswers(), ...(prefill ?? {}) };
    if (initialIdea) base.idea = initialIdea;
    return base;
  });
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  /* Restore a draft (e.g. after being sent to signup mid-flow). */
  useEffect(() => {
    if (prefill) {
      setHydrated(true);
      return;
    }
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { answers: Answers; step: number };
        setAnswers((prev) => ({ ...prev, ...saved.answers, ...(initialIdea ? { idea: initialIdea } : {}) }));
        setStepIndex(Math.min(saved.step ?? 0, STEPS.length - 1));
      }
    } catch {
      /* corrupted draft: start clean */
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Persist the draft so nothing is lost on refresh or auth detour. */
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, step: stepIndex }));
    } catch {
      /* private mode: drafts just won't persist */
    }
  }, [answers, stepIndex, hydrated]);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const missing = useMemo(
    () => step.fields.filter((f) => !isAnswered(f, answers)),
    [step, answers],
  );

  const totalRequired = useMemo(
    () => STEPS.flatMap((s) => s.fields).filter((f) => f.required).length,
    [],
  );
  const answeredRequired = useMemo(
    () => STEPS.flatMap((s) => s.fields).filter((f) => f.required && isAnswered(f, answers)).length,
    [answers],
  );
  const progress = Math.round((answeredRequired / totalRequired) * 100);

  const set = useCallback((id: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  async function submit() {
    setError(null);

    if (!signedIn) {
      router.push("/signup?next=/brief");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (res.status === 401) {
        router.push("/signup?next=/brief");
        return;
      }

      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
        errors?: Record<string, string>;
        upgrade?: boolean;
      };

      if (!res.ok || !data.id) {
        setError(data.error ?? "La génération a échoué. Vérifie tes réponses.");
        setNeedsUpgrade(Boolean(data.upgrade));
        setSubmitting(false);
        return;
      }

      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      router.push(`/result/${data.id}`);
    } catch {
      setError("Problème réseau. Réessaie.");
      setSubmitting(false);
    }
  }

  function next() {
    setTouched(true);
    if (missing.length > 0) {
      document.getElementById(missing[0].id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setTouched(false);
    if (isLast) void submit();
    else {
      setStepIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      {/* Progress ------------------------------------------------------ */}
      <div className="mb-10">
        <div className="mb-3 flex items-center justify-between text-[12.5px]">
          <span className="text-ink-400">
            Étape {stepIndex + 1} sur {STEPS.length}
          </span>
          <span className="text-ink-500">{progress}% complété</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#6a45f5,#8f6fff,#22cfa8)] transition-[width] duration-500"
            style={{ width: `${Math.max(4, progress)}%` }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => i <= stepIndex && setStepIndex(i)}
              disabled={i > stepIndex}
              className={cx(
                "rounded-lg px-2.5 py-1 text-[12px] transition-colors",
                i === stepIndex
                  ? "bg-white/[0.08] text-white"
                  : i < stepIndex
                    ? "text-ink-400 hover:text-white"
                    : "text-ink-600",
              )}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {prefillLabel && stepIndex === 0 && (
        <div className="mb-8">
          <Alert tone="success">
            Questionnaire pré-rempli depuis <strong>{prefillLabel}</strong>. Ajuste ce que tu veux —
            couleurs, prix, cible — le reste est déjà posé.
          </Alert>
        </div>
      )}

      {/* Step ---------------------------------------------------------- */}
      <div key={step.id} className="animate-rise">
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-white sm:text-[34px]">
          {step.title}
        </h1>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-400">{step.subtitle}</p>

        <div className="mt-10 space-y-9">
          {step.fields.map((field) => {
            const value = answers[field.id];
            const invalid = touched && !isAnswered(field, answers);
            return (
              <div key={field.id} className="scroll-mt-24" id={`wrap-${field.id}`}>
                <label htmlFor={field.id} className="block text-[15px] font-medium text-white">
                  {field.label}
                  {!field.required && <span className="ml-2 text-[12px] font-normal text-ink-600">optionnel</span>}
                </label>
                {field.help && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{field.help}</p>}

                <div className="mt-4">
                  {(field.type === "text" || field.type === "textarea") && (
                    <TextField field={field} value={typeof value === "string" ? value : ""} onChange={(v) => set(field.id, v)} />
                  )}
                  {field.type === "number" && (
                    <NumberField field={field} value={typeof value === "string" ? value : ""} onChange={(v) => set(field.id, v)} />
                  )}
                  {field.type === "choice" && (
                    <ChoiceField field={field} value={typeof value === "string" ? value : ""} onChange={(v) => set(field.id, v)} />
                  )}
                  {field.type === "multi" && (
                    <MultiField field={field} value={Array.isArray(value) ? value : []} onChange={(v) => set(field.id, v)} />
                  )}
                  {field.type === "color" && (
                    <ColorField value={typeof value === "string" ? value : "#7C5CFF"} onChange={(v) => set(field.id, v)} />
                  )}
                </div>

                {invalid && (
                  <p className="mt-2.5 text-[12.5px] text-red-300">
                    {field.type === "textarea" || field.type === "text"
                      ? "Au moins 10 caractères — sois précis, le brief en dépend."
                      : "Fais un choix pour continuer."}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mt-8">
          <Alert tone="error">
            {error}
            {needsUpgrade && (
              <>
                {" "}
                <Link href="/pricing" className="underline underline-offset-4">
                  Voir les plans
                </Link>
              </>
            )}
          </Alert>
        </div>
      )}

      {!signedIn && isLast && (
        <div className="mt-8">
          <Alert tone="info">
            Un compte est nécessaire pour générer et retrouver ton brief. Tes réponses sont conservées
            pendant l&apos;inscription.
          </Alert>
        </div>
      )}

      {/* Nav ------------------------------------------------------------ */}
      <div className="mt-10 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-7">
        <button
          type="button"
          onClick={() => {
            setTouched(false);
            setStepIndex((i) => Math.max(0, i - 1));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          disabled={stepIndex === 0}
          className="h-11 rounded-xl px-4 text-[14px] text-ink-400 transition-colors hover:text-white disabled:opacity-0"
        >
          ← Retour
        </button>

        <button
          type="button"
          onClick={next}
          disabled={submitting}
          className="h-12 rounded-xl bg-[linear-gradient(120deg,#8f6fff,#6a45f5)] px-7 text-[14.5px] font-medium text-white transition-all hover:brightness-110 active:scale-[0.985] disabled:opacity-50"
        >
          {submitting ? "Génération..." : isLast ? "Générer mon site" : "Continuer"}
        </button>
      </div>
    </div>
  );
}
