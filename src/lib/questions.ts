/**
 * The onboarding questionnaire.
 *
 * Single source of truth: the client wizard renders these, and the server
 * validates the same bounds — the browser never decides what is acceptable.
 * To add a question: add it to QUESTIONS, to the Answers type and to the zod
 * schema below.
 */

import { z } from "zod";

export type Answers = {
  /** Years. */
  age: number;
  /**
   * Years of business experience. Optional in the type only because plans
   * generated before this question existed do not have it.
   */
  experience?: number;
  /** Hours the person is ready to work, per working day. */
  hoursPerDay: number;
  /** Net monthly income they aim for, in euros. */
  monthlyTarget: number;
};

export type QuestionId = keyof Answers;

export type Question = {
  id: QuestionId;
  title: string;
  /** Shown under the title. Empty = nothing shown. */
  hint: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  /** Quick picks shown as chips; the field still accepts any value in range. */
  presets: { value: number; label: string }[];
  defaultValue: number;
};

export const QUESTIONS: Question[] = [
  {
    id: "age",
    title: "Quel est ton âge ?",
    hint: "",
    unit: "ans",
    min: 16,
    max: 99,
    step: 1,
    presets: [
      { value: 18, label: "18" },
      { value: 22, label: "22" },
      { value: 28, label: "28" },
      { value: 35, label: "35" },
      { value: 45, label: "45+" },
    ],
    defaultValue: 22,
  },
  {
    id: "experience",
    title: "Quelle est ton expérience dans le business ?",
    hint: "",
    unit: "an(s)",
    min: 0,
    max: 50,
    step: 1,
    presets: [
      { value: 0, label: "Aucune" },
      { value: 1, label: "1 an" },
      { value: 2, label: "2 ans" },
      { value: 3, label: "3 ans" },
      { value: 5, label: "5 ans et +" },
    ],
    defaultValue: 0,
  },
  {
    id: "hoursPerDay",
    title: "Combien de temps as-tu à consacrer en moyenne dans une journée ?",
    hint: "",
    unit: "h / jour",
    min: 1,
    max: 14,
    step: 1,
    presets: [
      { value: 1, label: "1 h" },
      { value: 2, label: "2 h" },
      { value: 4, label: "4 h" },
      { value: 6, label: "6 h" },
      { value: 8, label: "8 h et +" },
    ],
    defaultValue: 4,
  },
  {
    id: "monthlyTarget",
    title: "Quel est ton objectif avec ton plan business ?",
    hint: "Ce que tu veux gagner chaque mois une fois lancé.",
    unit: "€ / mois",
    min: 100,
    max: 100000,
    step: 100,
    presets: [
      { value: 500, label: "500 €" },
      { value: 1500, label: "1 500 €" },
      { value: 3000, label: "3 000 €" },
      { value: 5000, label: "5 000 €" },
      { value: 10000, label: "10 000 €+" },
    ],
    defaultValue: 3000,
  },
];

const bounds = Object.fromEntries(QUESTIONS.map((q) => [q.id, q])) as Record<QuestionId, Question>;

/** Shown once the questions are done: required to generate. */
export const CONSENT_TEXT =
  "J'accepte que mes réponses soient filtrées pour mettre mon plan en place (30 secondes max).";

/** The commitment sealed with the fingerprint. */
export const OATH_TEXT = "Je jure de ne jamais lâcher mon business et de suivre le plan à la lettre.";

function field(id: QuestionId) {
  const q = bounds[id];
  return z.coerce
    .number({ invalid_type_error: "Nombre attendu." })
    .int("Nombre entier attendu.")
    .min(q.min, `Minimum ${q.min} ${q.unit}.`)
    .max(q.max, `Maximum ${q.max} ${q.unit}.`);
}

export const answersSchema = z.object({
  age: field("age"),
  experience: field("experience"),
  hoursPerDay: field("hoursPerDay"),
  monthlyTarget: field("monthlyTarget"),
});

export type Validation =
  | { ok: true; answers: Answers }
  | { ok: false; errors: Partial<Record<QuestionId, string>> };

export function validateAnswers(input: unknown): Validation {
  const parsed = answersSchema.safeParse(input);
  if (parsed.success) return { ok: true, answers: parsed.data };
  const errors: Partial<Record<QuestionId, string>> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as QuestionId | undefined;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/** Checks one value on the client before moving to the next step. */
export function questionError(q: Question, value: number | null): string | null {
  if (value === null || Number.isNaN(value)) return "Indique une valeur.";
  if (!Number.isInteger(value)) return "Nombre entier attendu.";
  if (value < q.min) return `Minimum ${q.min} ${q.unit}.`;
  if (value > q.max) return `Maximum ${q.max.toLocaleString("fr-FR")} ${q.unit}.`;
  return null;
}
