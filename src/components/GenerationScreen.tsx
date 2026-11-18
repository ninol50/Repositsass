"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { formatPrice, recommendedOffer } from "@/lib/plans";
import { computeProfile, euros } from "@/lib/profile";
import type { Answers } from "@/lib/questions";
import { LogoMark } from "./Logo";
import { FeatureList } from "./PricingCards";
import { PromoCountdown } from "./PromoCountdown";
import { LockIcon, cx } from "./ui";

export type ScreenPhase = "working" | "auth" | "finishing" | "locked";

type Line = { at: number; text: string; tone?: "ok" | "warn" | "dim" | "accent" };

/** Log lines, personalised with the answers. `at` = progress (0–100) at which each appears. */
function buildLines(a: Answers): Line[] {
  const p = computeProfile(a);
  const xp = a.experience ?? 0;
  return [
    { at: 0, text: "$ scalebiz build --profil nouveau --mode a-z", tone: "accent" },
    { at: 2, text: "▸ initialisation du moteur v2.4 …", tone: "dim" },
    { at: 5, text: `▸ lecture des réponses : âge=${a.age} · expérience=${xp} an(s) · ${a.hoursPerDay} h/jour · objectif=${euros(a.monthlyTarget)}` },
    { at: 7, text: `▸ automatisation demandée : ${a.automate ? "oui, tout à ta place" : "non, guides pas à pas"}` },
    { at: 9, text: "✓ réponses validées et filtrées", tone: "ok" },
    { at: 13, text: `▸ temps disponible : ${a.hoursPerDay} h × 21,7 jours = ${p.hoursPerMonth} h / mois` },
    { at: 18, text: `▸ taux horaire cible : ${euros(a.monthlyTarget)} ÷ ${p.hoursPerMonth} h = ${euros(p.requiredHourlyRate)} / h` },
    { at: 23, text: `✓ niveau d'ambition : ${p.ambitionLabel.toLowerCase()}`, tone: "ok" },
    { at: 28, text: "▸ chargement du catalogue : 5 modèles de business …", tone: "dim" },
    { at: 33, text: "▸ score[temps] · score[revenu] · score[âge] · score[expérience]" },
    { at: 39, text: "▸ simulation des 90 premiers jours …", tone: "dim" },
    { at: 45, text: "✓ 5 business classés selon ton profil", tone: "ok" },
    { at: 51, text: "▸ génération du plan d'action de A à Z …" },
    { at: 57, text: "▸ découpage semaine par semaine …", tone: "dim" },
    { at: 62, text: "⚠ compte requis pour enregistrer ton plan", tone: "warn" },
    { at: 66, text: "✓ compte relié, reprise de la génération", tone: "ok" },
    { at: 72, text: "▸ rédaction des étapes de lancement …" },
    { at: 79, text: "▸ estimation du budget de départ …", tone: "dim" },
    { at: 86, text: "▸ objectifs mois par mois …" },
    { at: 93, text: "✓ plan compilé — 0 erreur", tone: "ok" },
    { at: 99, text: "★ PLAN TROUVÉ", tone: "accent" },
  ];
}

const MODULES = [
  { at: 9, label: "Filtrage des réponses" },
  { at: 23, label: "Analyse du profil" },
  { at: 45, label: "Sélection des business" },
  { at: 72, label: "Plan d'action A → Z" },
  { at: 93, label: "Planning mois par mois" },
];

const RAIN =
  "const plan = build(profil);\nscore(temps, revenu, age, xp);\nfor (const b of business) rank(b);\nif (fit > 80) unlock();\nawait compile(plan);\nexport default plan;\n";

export function GenerationScreen({
  phase,
  progress,
  answers,
  auth,
  error,
  onRetry,
  result,
  onLeave,
}: {
  phase: ScreenPhase;
  progress: number;
  answers: Answers;
  /** The sign-up form, shown when phase is "auth". */
  auth: ReactNode;
  error: string | null;
  onRetry: () => void;
  result: { id: string; promoEndsAt: string } | null;
  /** Called before navigating away (clears the saved onboarding). */
  onLeave: () => void;
}) {
  const lines = useMemo(() => buildLines(answers), [answers]);
  const recommended = useMemo(() => recommendedOffer(answers), [answers]);
  const visible = lines.filter((l) => l.at <= progress);
  const logRef = useRef<HTMLDivElement>(null);
  const locked = phase === "locked";
  // Rendered into <body>: an animated ancestor (transform) would otherwise
  // trap this "fixed" screen inside the questionnaire card.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Lock page scroll while the screen covers it.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [visible.length]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-ink-950 text-ink-100"
      role="dialog"
      aria-modal="true"
      aria-label="Génération de ton plan"
    >
      {/* Faint code rain in the background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.06]" aria-hidden>
        <pre className="animate-code-rain whitespace-pre font-mono text-[12px] leading-5 text-brand-300">
          {RAIN.repeat(60)}
        </pre>
      </div>

      {/* Window bar */}
      <div className="relative flex h-12 shrink-0 items-center justify-between border-b border-white/[0.07] bg-ink-900/90 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex shrink-0 gap-1.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-amber-400/70" />
            <span className="h-3 w-3 rounded-full bg-brand-400/70" />
          </span>
          <LogoMark size={22} />
          <span className="truncate font-mono text-[12.5px] text-ink-300">scalebiz<span className="hidden sm:inline"> — moteur de génération</span></span>
        </div>
        <span className="flex shrink-0 items-center gap-2 font-mono text-[12px] text-ink-400">
          <span className={cx("h-2 w-2 rounded-full", locked ? "bg-amber-400" : "bg-brand-400 animate-pulse")} />
          {locked ? "terminé" : phase === "auth" ? "en attente" : "en cours"}
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {/* Modules */}
        <aside className="hidden w-64 shrink-0 border-r border-white/[0.07] bg-ink-900/60 p-4 md:block">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-500">Modules</p>
          <ul className="space-y-2">
            {MODULES.map((m) => {
              const done = progress >= m.at;
              return (
                <li key={m.label} className="flex items-center gap-2.5 font-mono text-[12.5px]">
                  <span
                    className={cx(
                      "flex h-4 w-4 items-center justify-center rounded-full border text-[9px]",
                      done ? "border-brand-400 bg-brand-500/20 text-brand-300" : "border-white/15 text-transparent",
                    )}
                  >
                    ✓
                  </span>
                  <span className={done ? "text-ink-100" : "text-ink-500"}>{m.label}</span>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Terminal */}
        <main className={cx("relative flex min-w-0 flex-1 flex-col", locked && "select-none")}>
          <div
            ref={logRef}
            className={cx(
              "min-h-0 flex-1 overflow-y-auto px-4 py-5 font-mono text-[12.5px] leading-6 sm:px-6 sm:text-[13.5px]",
              locked && "blur-[3px]",
            )}
          >
            {visible.map((l, i) => (
              <p
                key={i}
                className={cx(
                  "animate-rise break-words",
                  l.tone === "ok" && "text-brand-300",
                  l.tone === "warn" && "text-gold-300",
                  l.tone === "dim" && "text-ink-500",
                  l.tone === "accent" && "font-semibold text-white",
                )}
                style={{ animationDuration: "0.25s" }}
              >
                {l.text}
              </p>
            ))}
            {!locked && <span className="animate-blink inline-block h-4 w-2 translate-y-0.5 bg-brand-300" />}
          </div>

          {/* Progress */}
          <div className="shrink-0 border-t border-white/[0.07] bg-ink-900/80 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between font-mono text-[12px] text-ink-400">
              <span>{locked ? "génération terminée" : phase === "auth" ? "génération en pause" : "compilation du plan"}</span>
              <span className="text-white">{Math.round(progress)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="animate-shimmer h-full rounded-full bg-[linear-gradient(90deg,#10b981,#6ee7b7,#fbbf24)] transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Sign-up, over the paused terminal */}
          {phase === "auth" && (
            <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-ink-950/70 p-4 backdrop-blur-sm">
              <div className="animate-rise w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl sm:p-7">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-300">
                    <LockIcon size={18} />
                  </span>
                  <div>
                    <h2 className="font-display text-[20px] font-semibold tracking-tight text-white">
                      Crée ton compte pour continuer
                    </h2>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-400">
                      Ton plan est à {Math.round(progress)}%. Il sera enregistré dans ton espace.
                    </p>
                  </div>
                </div>
                <div className="mt-6">{auth}</div>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-x-4 bottom-24 mx-auto max-w-md rounded-xl border border-red-500/30 bg-ink-900 p-4 text-[13.5px] text-red-200 shadow-2xl">
              {error}
              <button type="button" onClick={onRetry} className="mt-2 block text-brand-300 underline underline-offset-4">
                Relancer la génération
              </button>
            </div>
          )}
        </main>

        {/* The plan is found, and locked */}
        {locked && result && (
          <div className="absolute inset-0 flex justify-center overflow-y-auto bg-ink-950/60 p-4">
            <div className="animate-siren pointer-events-none absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#ef4444,#f59e0b,#ef4444)]" aria-hidden />
            <div className="animate-siren pointer-events-none absolute inset-x-0 bottom-0 h-2 bg-[linear-gradient(90deg,#f59e0b,#ef4444,#f59e0b)]" aria-hidden />

            <div className="animate-alert animate-shake my-auto w-full max-w-lg rounded-3xl p-5 text-center sm:p-8">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold-400/40 bg-ink-950/90 text-gold-300 shadow-[0_0_40px_-4px_rgba(251,191,36,0.7)]">
                <LockIcon size={24} />
              </span>

              <p className="mt-4 font-display text-[25px] font-bold leading-tight tracking-tight text-white sm:text-[36px]">
                ⚠️ On a trouvé ton plan ‼️‼️
              </p>
              <p className="mt-2 text-[15px] text-ink-200 sm:text-[16px]">
                Débloque-le tout de suite avant de le perdre.
              </p>

              <div className="mx-auto mt-5 w-fit rounded-2xl border border-white/10 bg-ink-950/90 px-6 py-3">
                <p className="text-[12px] uppercase tracking-[0.16em] text-gold-300">Ton offre promo se termine dans</p>
                <PromoCountdown
                  endsAt={result.promoEndsAt}
                  className="mt-0.5 block font-mono text-[34px] font-bold tabular-nums text-white sm:text-[40px]"
                />
              </div>

              {/* The one offer that fits this plan */}
              <div className="mt-5 rounded-2xl border border-brand-400/40 bg-ink-950/90 p-5 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-brand-300">
                      Recommandé pour ton plan
                    </p>
                    <p className="mt-1 font-display text-[22px] font-bold text-white">{recommended.offer.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="whitespace-nowrap font-display text-[26px] font-bold leading-none text-white">
                      {formatPrice(recommended.offer.launchPrice)}
                    </p>
                    <p className="mt-1 text-[12.5px] text-ink-500 line-through">{formatPrice(recommended.offer.monthlyPrice)} / mois</p>
                  </div>
                </div>
                <p className="mt-1 text-[12.5px] font-medium text-gold-300">
                  le premier mois, puis {formatPrice(recommended.offer.monthlyPrice)} / mois
                </p>
                <Link
                  href={`/result/${result.id}#offres`}
                  onClick={onLeave}
                  className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-[linear-gradient(120deg,#fbbf24,#f59e0b)] text-[16px] font-bold text-ink-950 shadow-[0_10px_40px_-10px_rgba(251,191,36,0.8)] transition-all hover:brightness-110 active:scale-[0.99]"
                >
                  Débloquer avec {recommended.offer.name}
                </Link>
                <Link
                  href={`/result/${result.id}?offres=toutes#offres`}
                  onClick={onLeave}
                  className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-white/15 text-[14px] font-medium text-white transition-colors hover:border-white/30 hover:bg-white/[0.04]"
                >
                  Découvrir les autres offres
                </Link>
                <FeatureList offer={recommended.offer} className="mt-4 border-t border-white/10 pt-4" />
              </div>

            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
