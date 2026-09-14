/**
 * The questionnaire. Single source of truth: the form UI, the server-side
 * validation and the prompt engine all read from here.
 */

export type FieldType = "text" | "textarea" | "choice" | "multi" | "color" | "number";

export type Option = {
  value: string;
  label: string;
  hint?: string;
  /** Used by the colour field to render a swatch. */
  swatch?: string;
};

export type Field = {
  id: string;
  label: string;
  help?: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: Option[];
  maxSelected?: number;
  min?: number;
  max?: number;
  defaultValue?: string | string[];
};

export type Step = {
  id: string;
  title: string;
  subtitle: string;
  fields: Field[];
};

export const COLOR_PRESETS: Option[] = [
  { value: "#7C5CFF", label: "Violet électrique", swatch: "#7C5CFF" },
  { value: "#00D4B8", label: "Teal", swatch: "#00D4B8" },
  { value: "#FF5C39", label: "Orange sunset", swatch: "#FF5C39" },
  { value: "#3B82F6", label: "Bleu produit", swatch: "#3B82F6" },
  { value: "#F43F8E", label: "Rose", swatch: "#F43F8E" },
  { value: "#22C55E", label: "Vert", swatch: "#22C55E" },
  { value: "#EAB308", label: "Jaune", swatch: "#EAB308" },
  { value: "#E5E7EB", label: "Monochrome", swatch: "#E5E7EB" },
];

export const STEPS: Step[] = [
  {
    id: "idea",
    title: "Ton idée",
    subtitle: "On part de là. Plus tu es précis, plus le brief final sera exploitable.",
    fields: [
      {
        id: "idea",
        label: "Ton idée de SaaS",
        help: "Une ou deux phrases. Ex : un outil qui transforme les appels clients en comptes-rendus CRM automatiques.",
        type: "textarea",
        required: true,
        placeholder: "Je veux construire...",
      },
      {
        id: "problem",
        label: "Quel problème précis ça résout ?",
        help: "Si tu n'arrives pas à l'écrire en une phrase, le positionnement n'est pas prêt.",
        type: "textarea",
        required: true,
        placeholder: "Aujourd'hui, les gens doivent... et ça leur coûte...",
      },
      {
        id: "audience",
        label: "Pour qui ?",
        type: "choice",
        required: true,
        options: [
          { value: "b2b-smb", label: "PME / TPE", hint: "5 à 200 salariés" },
          { value: "b2b-enterprise", label: "Grands comptes", hint: "Cycle long, sécurité exigeante" },
          { value: "freelances", label: "Freelances & agences" },
          { value: "developers", label: "Développeurs", hint: "Produit technique, API first" },
          { value: "ecommerce", label: "E-commerçants" },
          { value: "creators", label: "Créateurs de contenu" },
          { value: "b2c", label: "Grand public" },
        ],
      },
      {
        id: "competitor",
        label: "Un concurrent ou un outil que les gens utilisent déjà",
        help: "Optionnel mais utile : le brief intégrera un axe de différenciation explicite.",
        type: "text",
        placeholder: "Ex : Notion, un tableur, Zapier, rien du tout",
      },
    ],
  },
  {
    id: "design",
    title: "Direction artistique",
    subtitle: "Ce bloc devient un design system concret dans le brief : tokens, hex, typographie.",
    fields: [
      {
        id: "primaryColor",
        label: "Couleur principale",
        help: "On en dérive une palette complète : survol, bordures, surfaces, états.",
        type: "color",
        required: true,
        defaultValue: "#7C5CFF",
        options: COLOR_PRESETS,
      },
      {
        id: "mode",
        label: "Ambiance",
        type: "choice",
        required: true,
        defaultValue: "dark",
        options: [
          { value: "dark", label: "Dark", hint: "Sombre, par défaut" },
          { value: "light", label: "Light", hint: "Clair, lisible" },
          { value: "auto", label: "Les deux", hint: "Bascule + prefers-color-scheme" },
        ],
      },
      {
        id: "visualStyle",
        label: "Style d'interface",
        type: "choice",
        required: true,
        options: [
          { value: "minimal", label: "Minimal", hint: "Espaces, peu de couleur" },
          { value: "glass", label: "Glassmorphism", hint: "Flou, halos, dégradés" },
          { value: "brutalist", label: "Brutalist", hint: "Bordures franches, contrastes" },
          { value: "neo-retro", label: "Néo-rétro", hint: "Grain, néon, années 80" },
          { value: "corporate", label: "Corporate clean", hint: "Sobre, rassurant, B2B" },
        ],
      },
      {
        id: "imageStyle",
        label: "Style des images",
        help: "Le brief inclura des prompts d'images prêts à coller dans un générateur.",
        type: "choice",
        required: true,
        options: [
          { value: "realistic", label: "Photo réaliste" },
          { value: "3d", label: "Rendu 3D" },
          { value: "anime", label: "Anime / manga" },
          { value: "flat", label: "Illustration flat" },
          { value: "abstract", label: "Abstrait / dégradés" },
          { value: "screenshots", label: "Captures produit", hint: "Pas d'illustration" },
          { value: "none", label: "Aucune image", hint: "Typographie et couleur seulement" },
        ],
      },
      {
        id: "typography",
        label: "Typographie",
        type: "choice",
        defaultValue: "modern-sans",
        options: [
          { value: "modern-sans", label: "Sans moderne", hint: "Inter, Geist" },
          { value: "grotesk", label: "Grotesk display", hint: "Space Grotesk, Satoshi" },
          { value: "serif", label: "Serif éditorial", hint: "Instrument Serif" },
          { value: "mono", label: "Mono tech", hint: "JetBrains Mono" },
        ],
      },
    ],
  },
  {
    id: "business",
    title: "Business",
    subtitle: "On calcule le nombre de clients nécessaire pour ton objectif. Sans enrobage.",
    fields: [
      {
        id: "mrrTarget",
        label: "Revenus mensuels visés (MRR)",
        type: "choice",
        required: true,
        options: [
          { value: "500", label: "500 € / mois", hint: "Side project" },
          { value: "2000", label: "2 000 € / mois", hint: "Complément de revenu" },
          { value: "5000", label: "5 000 € / mois", hint: "Temps plein en solo" },
          { value: "10000", label: "10 000 € / mois", hint: "Petite équipe" },
          { value: "50000", label: "50 000 € / mois", hint: "Startup financée" },
        ],
      },
      {
        id: "pricingModel",
        label: "Modèle de revenus",
        type: "choice",
        required: true,
        options: [
          { value: "subscription", label: "Abonnement mensuel" },
          { value: "usage", label: "À l'usage", hint: "Crédits, tokens, appels API" },
          { value: "freemium", label: "Freemium" },
          { value: "lifetime", label: "Paiement unique", hint: "Lifetime deal" },
          { value: "marketplace", label: "Commission / marketplace" },
        ],
      },
      {
        id: "arpu",
        label: "Prix moyen par client et par mois (€)",
        help: "Ton intuition suffit, on la confrontera à ton objectif.",
        type: "number",
        required: true,
        min: 1,
        max: 5000,
        defaultValue: "29",
      },
      {
        id: "timeline",
        label: "Délai avant la première version en ligne",
        type: "choice",
        required: true,
        options: [
          { value: "1w", label: "1 semaine", hint: "Périmètre très serré" },
          { value: "1m", label: "1 mois" },
          { value: "3m", label: "3 mois" },
        ],
      },
    ],
  },
  {
    id: "tech",
    title: "Technique",
    subtitle: "Ce que Claude Code doit réellement écrire, et avec quoi.",
    fields: [
      {
        id: "stack",
        label: "Stack",
        type: "choice",
        required: true,
        defaultValue: "next-postgres",
        options: [
          { value: "next-supabase", label: "Next.js + Supabase" },
          { value: "next-postgres", label: "Next.js + Postgres", hint: "Neon / Vercel Postgres" },
          { value: "t3", label: "T3 stack", hint: "tRPC, Prisma, NextAuth" },
          { value: "laravel", label: "Laravel" },
          { value: "django", label: "Django" },
          { value: "auto", label: "Choisis pour moi", hint: "On tranche selon ton profil" },
        ],
      },
      {
        id: "auth",
        label: "Authentification",
        type: "choice",
        defaultValue: "email-password",
        options: [
          { value: "email-password", label: "Email + mot de passe" },
          { value: "magic-link", label: "Lien magique" },
          { value: "oauth", label: "Google / GitHub" },
          { value: "managed", label: "Service géré", hint: "Clerk, Auth0, Supabase Auth" },
        ],
      },
      {
        id: "payments",
        label: "Paiement",
        type: "choice",
        defaultValue: "stripe",
        options: [
          { value: "stripe", label: "Stripe" },
          { value: "whop", label: "Whop" },
          { value: "lemonsqueezy", label: "Lemon Squeezy", hint: "Merchant of record" },
          { value: "paddle", label: "Paddle", hint: "Merchant of record" },
          { value: "none", label: "Pas encore" },
        ],
      },
      {
        id: "skill",
        label: "Ton niveau technique",
        help: "Détermine le niveau de détail des instructions générées.",
        type: "choice",
        required: true,
        options: [
          { value: "beginner", label: "Débutant", hint: "Explique tout, pas à pas" },
          { value: "intermediate", label: "Intermédiaire" },
          { value: "senior", label: "Dev confirmé", hint: "Va droit au but" },
        ],
      },
      {
        id: "ai",
        label: "IA dans le produit",
        type: "choice",
        defaultValue: "none",
        options: [
          { value: "claude", label: "Oui, via Claude" },
          { value: "openai", label: "Oui, via OpenAI" },
          { value: "none", label: "Non", hint: "Logique déterministe" },
        ],
      },
    ],
  },
  {
    id: "scope",
    title: "Périmètre",
    subtitle:
      "Trois derniers réglages. Le périmètre fonctionnel, lui, est déduit de ta cible et de ton délai : c'est justement là que les projets s'enlisent.",
    fields: [
      {
        id: "language",
        label: "Langue du produit",
        type: "choice",
        defaultValue: "fr",
        options: [
          { value: "fr", label: "Français" },
          { value: "en", label: "Anglais" },
          { value: "both", label: "Les deux" },
        ],
      },
      {
        id: "tone",
        label: "Ton de la marque",
        type: "choice",
        defaultValue: "direct",
        options: [
          { value: "direct", label: "Direct", hint: "Phrases courtes, zéro jargon" },
          { value: "expert", label: "Expert", hint: "Technique, précis" },
          { value: "friendly", label: "Chaleureux" },
          { value: "bold", label: "Cash", hint: "Tranché, assumé" },
        ],
      },
    ],
  },
];

export const ALL_FIELDS: Field[] = STEPS.flatMap((s) => s.fields);

export function fieldById(id: string): Field | undefined {
  return ALL_FIELDS.find((f) => f.id === id);
}

export type Answers = Record<string, string | string[]>;

export function defaultAnswers(): Answers {
  const out: Answers = {};
  for (const f of ALL_FIELDS) {
    if (f.defaultValue !== undefined) out[f.id] = f.defaultValue;
    else if (f.type === "multi") out[f.id] = [];
    else out[f.id] = "";
  }
  return out;
}

export type ValidationResult =
  | { ok: true; answers: Answers }
  | { ok: false; errors: Record<string, string> };

/** Server-authoritative validation. The client mirrors it for instant feedback. */
export function validateAnswers(input: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const answers: Answers = {};

  for (const field of ALL_FIELDS) {
    const value = raw[field.id];

    if (field.type === "multi") {
      const listed = Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
      const allowed = new Set((field.options ?? []).map((o) => o.value));
      const cleaned = Array.from(new Set(listed.filter((v) => allowed.has(v))));
      if (field.required && cleaned.length === 0) errors[field.id] = "Choisis au moins une option.";
      if (field.maxSelected && cleaned.length > field.maxSelected) {
        errors[field.id] = `${field.maxSelected} maximum.`;
      }
      answers[field.id] = cleaned.slice(0, field.maxSelected ?? cleaned.length);
      continue;
    }

    const str = typeof value === "string" ? value.trim() : "";

    if (field.type === "choice") {
      const allowed = new Set((field.options ?? []).map((o) => o.value));
      if (!allowed.has(str)) {
        if (field.required) errors[field.id] = "Sélectionne une option.";
        answers[field.id] = typeof field.defaultValue === "string" ? field.defaultValue : "";
      } else {
        answers[field.id] = str;
      }
      continue;
    }

    if (field.type === "number") {
      const n = Number(str);
      if (!str || Number.isNaN(n)) {
        if (field.required) errors[field.id] = "Entre un nombre.";
        answers[field.id] = typeof field.defaultValue === "string" ? field.defaultValue : "";
      } else if ((field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) {
        errors[field.id] = `Entre ${field.min ?? 0} et ${field.max ?? "l'infini"}.`;
        answers[field.id] = String(n);
      } else {
        answers[field.id] = String(Math.round(n));
      }
      continue;
    }

    if (field.type === "color") {
      answers[field.id] = /^#?[0-9a-fA-F]{3,6}$/.test(str) ? str : "#7C5CFF";
      continue;
    }

    // text / textarea
    if (field.required && str.length < 10) {
      errors[field.id] = "Au moins 10 caractères, sois un peu précis.";
    }
    answers[field.id] = str.slice(0, 1200);
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, answers };
}

export function str(a: Answers, id: string): string {
  const v = a[id];
  return typeof v === "string" ? v : "";
}

export function list(a: Answers, id: string): string[] {
  const v = a[id];
  return Array.isArray(v) ? v : [];
}

export function labelOf(fieldId: string, value: string): string {
  const f = fieldById(fieldId);
  return f?.options?.find((o) => o.value === value)?.label ?? value;
}
