/**
 * The prompt engine.
 *
 * Deterministic on purpose: no LLM call, no marginal cost per generation, no
 * latency, no provider outage. The value is in the structure and in the
 * business maths, not in re-wording the user's own idea.
 */

import { buildPalette, normalizeHex, type Palette } from "./color";
import { labelOf, str, type Answers } from "./questions";

export type BusinessMath = {
  mrrTarget: number;
  arpu: number;
  customersNeeded: number;
  monthlyChurnPct: number;
  ltv: number;
  cacCeiling: number;
  newCustomersPerMonth: number;
  monthlyVisitorsNeeded: number;
  tiers: { name: string; price: number; pitch: string; limits: string }[];
  warnings: string[];
};

export type GeneratedPrompt = {
  productName: string;
  tagline: string;
  summary: string;
  palette: Palette;
  math: BusinessMath;
  markdown: string;
  /** Free teaser: everything before the paywall cut. */
  preview: string;
  wordCount: number;
  depth: "standard" | "pro";
  sectionCount: number;
};

/* ------------------------------------------------------------------ */
/* Reference data                                                      */
/* ------------------------------------------------------------------ */

const AUDIENCE_CHURN: Record<string, number> = {
  "b2b-enterprise": 1.5,
  "b2b-smb": 3.5,
  developers: 4,
  ecommerce: 5,
  freelances: 6,
  creators: 7.5,
  b2c: 9,
};

const AUDIENCE_CONTEXT: Record<string, { where: string; objection: string; cycle: string }> = {
  "b2b-enterprise": {
    where: "LinkedIn, salons sectoriels, outbound ciblé, références clients",
    objection: "la sécurité, la conformité, et qui signe le contrat",
    cycle: "3 à 9 mois, plusieurs interlocuteurs",
  },
  "b2b-smb": {
    where: "SEO longue traîne, LinkedIn, communautés métier, bouche-à-oreille",
    objection: "le temps d'installation et la migration des données existantes",
    cycle: "1 à 4 semaines, un seul décideur",
  },
  developers: {
    where: "GitHub, Hacker News, Reddit, documentation indexée, DevRel",
    objection: "pourquoi ne pas le coder soi-même en un week-end",
    cycle: "immédiat si le free tier convainc, sinon jamais",
  },
  ecommerce: {
    where: "app stores Shopify et WooCommerce, agences partenaires, groupes Facebook",
    objection: "l'impact réel sur le chiffre d'affaires, prouvé",
    cycle: "quelques jours, très sensible au ROI",
  },
  freelances: {
    where: "Twitter/X, communautés de freelances, Indie Hackers, SEO outils",
    objection: "le prix rapporté au nombre de clients qu'ils gèrent",
    cycle: "quelques jours, décision solo",
  },
  creators: {
    where: "TikTok, YouTube, Instagram, partenariats créateurs",
    objection: "est-ce que ça fait vraiment gagner du temps ou de l'audience",
    cycle: "impulsif, très sensible à la preuve sociale",
  },
  b2c: {
    where: "TikTok, SEO, ASO, bouche-à-oreille, publicité payante",
    objection: "le prix, face à une alternative gratuite",
    cycle: "immédiat, churn élevé",
  },
};

const STACK_BLUEPRINT: Record<string, { label: string; detail: string; files: string[] }> = {
  "next-supabase": {
    label: "Next.js 15 (App Router) + Supabase",
    detail:
      "Supabase pour Postgres, l'authentification et le stockage. Row Level Security activée sur toutes les tables. Client serveur via @supabase/ssr.",
    files: [
      "src/app/(marketing)/page.tsx — landing",
      "src/app/(app)/dashboard/page.tsx — espace connecté",
      "src/lib/supabase/server.ts + client.ts",
      "supabase/migrations/0001_init.sql",
    ],
  },
  "next-postgres": {
    label: "Next.js 15 (App Router) + Postgres",
    detail:
      "Postgres géré (Neon ou Vercel Postgres), accès par requêtes SQL typées. Sessions JWT en cookie httpOnly. Aucune dépendance lourde.",
    files: [
      "src/app/(marketing)/page.tsx — landing",
      "src/app/(app)/dashboard/page.tsx — espace connecté",
      "src/lib/db.ts — client SQL et migrations idempotentes",
      "src/lib/auth.ts — hachage du mot de passe et session",
    ],
  },
  t3: {
    label: "T3 stack (Next.js, tRPC, Prisma, NextAuth)",
    detail:
      "Typage de bout en bout via tRPC. Prisma pour le schéma. NextAuth pour les sessions. Plus de couches, mais très structuré.",
    files: [
      "prisma/schema.prisma",
      "src/server/api/routers/*.ts",
      "src/server/auth.ts",
      "src/app/_components/*",
    ],
  },
  laravel: {
    label: "Laravel 11 + Blade/Inertia",
    detail:
      "Eloquent pour les modèles, migrations versionnées, Laravel Breeze pour l'authentification, files d'attente pour les traitements longs.",
    files: ["app/Models/*.php", "database/migrations/*.php", "routes/web.php", "resources/views/*"],
  },
  django: {
    label: "Django 5 + Postgres",
    detail:
      "ORM Django, admin natif pour le back-office, django-allauth pour l'authentification, Celery si des tâches asynchrones sont nécessaires.",
    files: ["core/models.py", "core/views.py", "core/urls.py", "templates/*"],
  },
};

const VISUAL_STYLE_SPEC: Record<string, string> = {
  minimal:
    "Beaucoup de vide, une seule couleur d'accent, bordures 1px très discrètes, pas d'ombres portées marquées, hiérarchie portée uniquement par la taille du texte.",
  glass:
    "Surfaces semi-transparentes (background-color en rgba + backdrop-filter: blur(20px)), halos radiaux flous derrière les sections clés, bordures 1px en blanc à 8% d'opacité, dégradés doux.",
  brutalist:
    "Bordures 2px pleines, aucun arrondi ou 2px maximum, ombres dures décalées (box-shadow: 4px 4px 0), contrastes élevés, typographie large et dense.",
  "neo-retro":
    "Grain léger en surimpression (SVG feTurbulence), lueurs néon autour des éléments actifs, dégradés type chrome, typographie condensée, quadrillage en fond.",
  corporate:
    "Arrondis 8px, ombres très douces, palette sobre, densité d'information élevée, tableaux et cartes de métriques, aucune fantaisie visuelle.",
};

const IMAGE_STYLE_SPEC: Record<string, { spec: string; prompt: string }> = {
  realistic: {
    spec: "Photographies réalistes, lumière naturelle, faible profondeur de champ, sujets humains en situation de travail. Pas de banque d'images générique souriante.",
    prompt:
      "photographie éditoriale réaliste, [SUJET] dans un bureau lumineux, lumière naturelle latérale, 50mm, faible profondeur de champ, teintes {PRIMARY}, ambiance {MODE}, sans texte",
  },
  "3d": {
    spec: "Rendus 3D doux, matériaux mats, éclairage studio à trois points, objets flottants isométriques, ombres portées douces.",
    prompt:
      "rendu 3D style clay, [SUJET] isométrique, matériaux mats, éclairage studio doux, palette centrée sur {PRIMARY}, fond {MODE}, sans texte, 4k",
  },
  anime: {
    spec: "Illustrations style anime moderne, lignes nettes, aplats de couleur, arrière-plans simplifiés. Attention : ce style limite la crédibilité sur une cible B2B.",
    prompt:
      "illustration anime moderne, [SUJET], lineart net, aplats de couleur, palette dominante {PRIMARY}, arrière-plan simplifié, sans texte",
  },
  flat: {
    spec: "Illustrations vectorielles plates, formes géométriques simples, deux à trois couleurs maximum issues de la palette, personnages stylisés sans visage détaillé.",
    prompt:
      "illustration vectorielle flat, [SUJET], formes géométriques simples, palette {PRIMARY} plus deux neutres, fond uni, sans texte",
  },
  abstract: {
    spec: "Formes abstraites, dégradés maillés, halos lumineux, aucune représentation figurative. Se fabrique en CSS/SVG sans générateur d'images.",
    prompt:
      "dégradé abstrait fluide, formes organiques, dominante {PRIMARY}, halo lumineux, fond {MODE}, rendu doux, sans texte ni objet reconnaissable",
  },
  screenshots: {
    spec: "Uniquement des captures réelles du produit, encadrées dans un mockup de navigateur sobre. C'est le choix le plus crédible pour un outil B2B.",
    prompt:
      "Pas de génération d'image : produire de vraies captures d'écran du produit une fois l'interface construite.",
  },
  none: {
    spec: "Aucune image. La hiérarchie repose sur la typographie, la couleur et l'espacement. Rapide à charger, difficile à rendre mémorable.",
    prompt: "Aucune image à générer.",
  },
};

const TYPO_SPEC: Record<string, string> = {
  "modern-sans":
    "Inter (ou Geist) pour tout. Titres en 600/700, corps en 400. Interlettrage -0.02em sur les gros titres.",
  grotesk:
    "Space Grotesk pour les titres, Inter pour le corps de texte. Titres en 500, très larges, interlettrage serré.",
  serif:
    "Instrument Serif ou Newsreader pour les titres, Inter pour le corps. Contraste éditorial fort.",
  mono: "JetBrains Mono partout, tailles réduites, interlignage 1.6. Lisible seulement si la densité de texte reste faible.",
};

const TIMELINE_SPEC: Record<string, { label: string; weeks: number; rule: string }> = {
  "1w": {
    label: "1 semaine",
    weeks: 1,
    rule: "Une seule fonctionnalité, une seule page applicative, paiement par lien externe. Tout le reste est hors périmètre.",
  },
  "1m": {
    label: "1 mois",
    weeks: 4,
    rule: "Trois fonctionnalités maximum, un vrai parcours d'inscription, paiement intégré.",
  },
  "3m": {
    label: "3 mois",
    weeks: 12,
    rule: "Périmètre complet possible, mais la première version en ligne doit sortir avant la fin de la semaine 4.",
  },
};

const FEATURE_SPEC: Record<string, { label: string; work: string; tables: string[] }> = {
  dashboard: {
    label: "Dashboard",
    work: "Une page /dashboard avec trois ou quatre métriques réelles et la liste des objets créés par l'utilisateur. État vide soigné.",
    tables: [],
  },
  onboarding: {
    label: "Onboarding guidé",
    work: "Checklist en trois étapes persistée en base, visible tant qu'elle n'est pas terminée. C'est le levier numéro un sur l'activation.",
    tables: ["onboarding_steps(user_id, step_key, completed_at)"],
  },
  analytics: {
    label: "Analytics produit",
    work: "Une table d'événements maison plus un outil externe (PostHog). Suivre au minimum : inscription, activation, passage payant, résiliation.",
    tables: ["events(id, user_id, name, props jsonb, created_at)"],
  },
  emails: {
    label: "Emails transactionnels",
    work: "Bienvenue, réinitialisation de mot de passe, confirmation de paiement, relance à J+3 si le compte n'est pas activé. Via Resend ou Postmark.",
    tables: ["email_log(id, user_id, template, sent_at)"],
  },
  teams: {
    label: "Équipes / multi-tenant",
    work: "Coût élevé : chaque requête doit être filtrée par organisation. À ne faire que si la cible achète réellement en équipe.",
    tables: ["organizations(id, name, owner_id)", "memberships(org_id, user_id, role)"],
  },
  api: {
    label: "API publique",
    work: "Clés API hachées, limitation de débit, documentation. Ne la construis pas avant qu'un client l'ait demandée par écrit.",
    tables: ["api_keys(id, user_id, key_hash, last_used_at)"],
  },
  export: {
    label: "Export des données",
    work: "Export CSV/JSON de toutes les données de l'utilisateur. Rapide à faire, lève une objection d'achat et couvre le RGPD.",
    tables: [],
  },
  admin: {
    label: "Back-office admin",
    work: "Liste des utilisateurs, statut d'abonnement, possibilité de forcer un accès. Protégé par un rôle, jamais par une URL secrète.",
    tables: [],
  },
  referral: {
    label: "Parrainage",
    work: "Code unique par utilisateur, crédit à la conversion. Inutile tant que la rétention n'est pas prouvée.",
    tables: ["referrals(id, referrer_id, referred_id, credited_at)"],
  },
  i18n: {
    label: "Multi-langue",
    work: "Fichiers de traduction et routes localisées. Double le coût de chaque page. À repousser sauf marché non anglophone confirmé.",
    tables: [],
  },
  integrations: {
    label: "Intégrations tierces",
    work: "Une seule intégration au départ : celle que la cible utilise déjà quotidiennement. OAuth et rafraîchissement de jeton inclus.",
    tables: [
      "integrations(id, user_id, provider, access_token_enc, refresh_token_enc, expires_at)",
    ],
  },
  notifications: {
    label: "Notifications in-app",
    work: "Table de notifications et badge non-lu. Simple, mais sans valeur tant qu'il n'y a pas d'événements à notifier.",
    tables: ["notifications(id, user_id, type, payload jsonb, read_at, created_at)"],
  },
};

/**
 * The v1 feature set is DERIVED, not asked.
 *
 * Asking someone to pick five features before they have a single user is how a
 * one-week project becomes a six-month one: the list is always a wish list, and
 * nothing in the questionnaire stopped a "1 semaine" timeline from carrying five
 * features. So the scope now falls out of the answers that actually constrain it
 * — who buys, how they pay, and how long there is — and the budget is capped by
 * the timeline the user chose.
 *
 * Same input, same output: this stays as deterministic as the rest of the engine.
 */
export function deriveFeatures(answers: Answers): string[] {
  const audience = str(answers, "audience");
  const timeline = str(answers, "timeline") || "1m";
  const pricingModel = str(answers, "pricingModel");
  const payments = str(answers, "payments") || "stripe";
  const auth = str(answers, "auth") || "email-password";
  const language = str(answers, "language");

  const budget = timeline === "1w" ? 1 : timeline === "3m" ? 5 : 3;

  // Ordered by how much each one moves the needle for THIS profile. The first
  // entry is the core surface every SaaS needs; the rest earn their place.
  const ranked: string[] = ["dashboard"];
  const push = (id: string) => {
    if (!ranked.includes(id)) ranked.push(id);
  };

  switch (audience) {
    case "developers":
      push("api");
      push("analytics");
      break;
    case "ecommerce":
      push("integrations");
      push("analytics");
      break;
    case "b2b-enterprise":
      push("teams");
      push("admin");
      push("export");
      break;
    case "b2b-smb":
      push("onboarding");
      push("integrations");
      break;
    case "freelances":
      push("onboarding");
      push("export");
      break;
    case "creators":
    case "b2c":
      push("onboarding");
      push("notifications");
      break;
    default:
      push("onboarding");
  }

  // Freemium and usage-based pricing are unpilotable without a funnel.
  if (pricingModel === "freemium" || pricingModel === "usage") push("analytics");
  // A password login without a reset email is a support ticket waiting to happen.
  if (auth === "email-password") push("emails");
  if (payments !== "none") push("admin");
  if (language === "both") push("i18n");

  for (const fallback of ["onboarding", "emails", "analytics", "export", "admin"]) {
    push(fallback);
  }

  return ranked.slice(0, budget);
}

export function featureLabel(id: string): string {
  return FEATURE_SPEC[id]?.label ?? id;
}

const TONE_SPEC: Record<string, string> = {
  direct:
    "Phrases courtes. Verbes d'action. Zéro jargon marketing. On dit ce que le produit fait, pas ce qu'il représente.",
  expert:
    "Vocabulaire technique assumé, chiffres et détails d'implémentation dans la page. La cible doit sentir qu'on connaît son métier.",
  friendly: "Ton chaleureux, tutoiement, humour discret. Jamais infantilisant.",
  bold: "Prises de position tranchées, on nomme ce qui ne marche pas ailleurs. Fonctionne si le produit tient la promesse, se retourne contre toi sinon.",
};

const SKILL_SPEC: Record<string, string> = {
  beginner:
    "Explique chaque commande avant de l'exécuter, crée les fichiers un par un, commente le code non évident et arrête-toi après chaque étape pour vérifier que ça tourne.",
  intermediate:
    "Avance par lots cohérents, explique les décisions d'architecture, ne détaille pas la syntaxe de base.",
  senior:
    "Pas de pédagogie. Donne le diff, signale les compromis et les dettes techniques assumées, propose des alternatives quand elles existent.",
};

/* ------------------------------------------------------------------ */
/* Business maths                                                      */
/* ------------------------------------------------------------------ */

/** Round to a 9-ending price point, the way real SaaS pricing pages do. */
function pricePoint(value: number): number {
  if (value <= 0) return 9;
  if (value < 15) return Math.max(5, Math.round(value));
  if (value < 100) return Math.round(value / 10) * 10 - 1;
  if (value < 1000) return Math.round(value / 50) * 50 - 1;
  return Math.round(value / 100) * 100;
}

export function computeMath(answers: Answers): BusinessMath {
  const mrrTarget = Number(str(answers, "mrrTarget")) || 2000;
  const arpu = Math.max(1, Number(str(answers, "arpu")) || 29);
  const audience = str(answers, "audience");
  const model = str(answers, "pricingModel");

  const monthlyChurnPct = AUDIENCE_CHURN[audience] ?? 5;
  const customersNeeded = Math.ceil(mrrTarget / arpu);
  const ltv = Math.round(arpu / (monthlyChurnPct / 100));
  const cacCeiling = Math.round(ltv / 3);

  // Reaching the target in 12 months, while replacing churned customers.
  const grossAdds = Math.ceil(customersNeeded / 12 + (customersNeeded * monthlyChurnPct) / 100 / 2);

  // Self-serve funnel benchmarks: ~2.5% visitor to signup, ~4-6% free to paid.
  const visitorToSignup = 0.025;
  const signupToPaid = model === "freemium" ? 0.03 : 0.06;
  const monthlyVisitorsNeeded = Math.ceil(grossAdds / (visitorToSignup * signupToPaid));

  const warnings: string[] = [];
  if (arpu < 15 && audience.startsWith("b2b")) {
    warnings.push(
      `Un ARPU de ${arpu} € sur une cible B2B est probablement sous-évalué : le coût de support par compte sera quasi identique à ${arpu * 3} €. Teste un prix deux à trois fois supérieur avant de construire quoi que ce soit.`,
    );
  }
  if (customersNeeded > 1000) {
    warnings.push(
      `${customersNeeded} clients payants pour atteindre l'objectif : c'est un volume d'acquisition grand public, pas un projet solo. Soit tu montes le prix, soit tu changes d'objectif.`,
    );
  }
  if (monthlyChurnPct >= 7) {
    warnings.push(
      `Churn attendu autour de ${monthlyChurnPct}% par mois sur cette cible : tu renouvelles ta base entière en ${Math.round(100 / monthlyChurnPct)} mois. Sans rétention, l'acquisition ne sert à rien.`,
    );
  }
  if (model === "lifetime") {
    warnings.push(
      "Un paiement unique ne produit pas de MRR. Tu peux financer un démarrage, pas un revenu récurrent. Prévois la bascule vers l'abonnement dès le départ.",
    );
  }
  if (monthlyVisitorsNeeded > 50000) {
    warnings.push(
      `Ce modèle exige environ ${monthlyVisitorsNeeded.toLocaleString("fr-FR")} visiteurs par mois. Si tu n'as pas déjà une audience ou un budget d'acquisition, l'hypothèse ne tient pas.`,
    );
  }

  const base = pricePoint(arpu);
  const tiers =
    model === "lifetime"
      ? [
          {
            name: "Lifetime",
            price: pricePoint(arpu * 12),
            pitch: "Accès complet, paiement unique",
            limits: "Sans limite d'usage raisonnable",
          },
          {
            name: "Lifetime Pro",
            price: pricePoint(arpu * 30),
            pitch: "Pour les gros volumes",
            limits: "Limites hautes et support prioritaire",
          },
        ]
      : [
          {
            name: model === "freemium" ? "Gratuit" : "Starter",
            price: model === "freemium" ? 0 : pricePoint(base * 0.45),
            pitch: "Pour tester sur un cas réel",
            limits: "Limite basse sur l'unité de valeur principale",
          },
          {
            name: "Pro",
            price: base,
            pitch: "Le plan que 70% des clients doivent prendre",
            limits: "Limite confortable, toutes les fonctionnalités de la v1",
          },
          {
            name: "Scale",
            price: pricePoint(base * 3.2),
            pitch: "Volumes élevés et équipes",
            limits: "Limites hautes, support prioritaire",
          },
        ];

  return {
    mrrTarget,
    arpu,
    customersNeeded,
    monthlyChurnPct,
    ltv,
    cacCeiling,
    newCustomersPerMonth: grossAdds,
    monthlyVisitorsNeeded,
    tiers,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* Naming                                                              */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set([
  "un", "une", "des", "le", "la", "les", "de", "du", "pour", "qui", "que", "avec", "dans", "sur",
  "et", "ou", "a", "au", "aux", "en", "je", "veux", "mon", "ma", "mes", "ce", "cette", "est",
  "sont", "plus", "par", "son", "sa", "leur", "leurs", "the", "of", "to", "for", "with", "and",
  "that", "this", "app", "saas", "outil", "plateforme", "site", "solution",
]);

function keywords(text: string, take = 3): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
    .slice(0, take);
}

function titleCase(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

export function buildName(idea: string): string {
  const ks = keywords(idea, 2);
  if (ks.length === 0) return "Nova";
  const suffixes = ["ly", "flow", "kit", "base", "loop", "deck"];
  const root = titleCase(ks[0].slice(0, 7));
  const suffix = suffixes[(ks[0].length + (ks[1]?.length ?? 0)) % suffixes.length];
  return `${root}${suffix}`;
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "saas"
  );
}

/* ------------------------------------------------------------------ */
/* The generator                                                       */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Connection checklist                                                */
/* ------------------------------------------------------------------ */

export type ConnectionItem = {
  service: string;
  why: string;
  env: string[];
  where: string;
};

/**
 * Everything the generated project will need an account or a key for.
 *
 * This is the list the user is told to expect BEFORE any code is written:
 * a project that builds locally and dies on deploy because nobody created the
 * database is the single most common way this goes wrong. Only services implied
 * by the answers are listed — no upsell, no "nice to have".
 */
export function connectionChecklist(answers: Answers): ConnectionItem[] {
  const skill = str(answers, "skill") || "intermediate";
  let stack = str(answers, "stack") || "next-postgres";
  if (stack === "auto") stack = skill === "beginner" ? "next-supabase" : "next-postgres";
  const auth = str(answers, "auth") || "email-password";
  const payments = str(answers, "payments") || "stripe";
  const ai = str(answers, "ai") || "none";
  const features = deriveFeatures(answers);

  const items: ConnectionItem[] = [
    {
      service: "GitHub",
      why: "Héberger le code et déclencher les déploiements automatiques.",
      env: [],
      where: "github.com/new — dépôt privé, puis `git remote add origin` et premier push.",
    },
    {
      service: "Vercel",
      why: "Héberger le site et exécuter les fonctions serveur.",
      env: ["NEXT_PUBLIC_SITE_URL"],
      where:
        "vercel.com/new — importer le dépôt GitHub. Chaque variable ci-dessous se met dans Settings → Environment Variables, puis il faut redéployer : une variable ajoutée ne s'applique pas au déploiement déjà en ligne.",
    },
  ];

  if (stack === "next-supabase") {
    items.push({
      service: "Supabase",
      why: "Base de données Postgres, authentification et stockage.",
      env: ["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
      where:
        "supabase.com → nouveau projet → Settings → Database → Connection string → **Transaction pooler (port 6543)**. La chaîne « Direct connection » en 5432 est en IPv6 et ne se connecte pas depuis Vercel. La clé `service_role` reste côté serveur : jamais dans une variable `NEXT_PUBLIC_`.",
    });
  } else if (stack === "laravel") {
    items.push({
      service: "Base Postgres managée",
      why: "Stocker les données de l'application.",
      env: ["DB_CONNECTION", "DB_HOST", "DB_PORT", "DB_DATABASE", "DB_USERNAME", "DB_PASSWORD", "APP_KEY"],
      where: "Neon, Railway ou Scalingo. `php artisan key:generate` pour APP_KEY.",
    });
  } else if (stack === "django") {
    items.push({
      service: "Base Postgres managée",
      why: "Stocker les données de l'application.",
      env: ["DATABASE_URL", "SECRET_KEY", "ALLOWED_HOSTS"],
      where: "Neon ou Railway. SECRET_KEY généré, jamais celui du template de départ.",
    });
  } else {
    items.push({
      service: "Postgres managé (Neon ou Vercel Postgres)",
      why: "Stocker les données de l'application.",
      env: ["DATABASE_URL"],
      where:
        "neon.tech ou l'onglet Storage du projet Vercel. Prendre la chaîne « pooled ». Sur Vercel Postgres, l'intégration renseigne la variable automatiquement.",
    });
  }

  items.push({
    service: "Secret de session",
    why: "Signer les sessions. Sans lui, n'importe qui peut forger un cookie de connexion.",
    env: ["AUTH_SECRET"],
    where: "`openssl rand -base64 48` en local, puis copier la valeur dans Vercel. Une valeur différente par environnement.",
  });

  if (auth === "oauth") {
    items.push({
      service: "Google Cloud et/ou GitHub OAuth",
      why: "Connexion par compte Google ou GitHub.",
      env: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
      where:
        "console.cloud.google.com → Credentials → OAuth client, et github.com/settings/developers. L'URL de rappel doit être déclarée deux fois : une pour localhost, une pour le domaine de production.",
    });
  } else if (auth === "managed") {
    items.push({
      service: "Fournisseur d'authentification géré",
      why: "Déléguer inscription, connexion et réinitialisation de mot de passe.",
      env: ["AUTH_PROVIDER_PUBLIC_KEY", "AUTH_PROVIDER_SECRET_KEY"],
      where:
        "Clerk, Auth0 ou Supabase Auth selon ce qui est choisi. Prendre les noms exacts de variables dans la documentation du fournisseur retenu, pas ceux ci-dessus.",
    });
  }

  if (payments === "stripe") {
    items.push({
      service: "Stripe",
      why: "Encaisser les paiements et recevoir les changements d'abonnement.",
      env: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_STRIPE_PRICE_ID"],
      where:
        "dashboard.stripe.com → Developers → API keys, puis Webhooks → endpoint `/api/webhooks/stripe`. Le secret de webhook du mode test est différent de celui du mode live.",
    });
  } else if (payments === "whop") {
    items.push({
      service: "Whop",
      why: "Encaisser les paiements et débloquer l'accès.",
      env: ["WHOP_WEBHOOK_SECRET", "WHOP_API_KEY"],
      where:
        "Tableau de bord Whop → Developer → Webhooks, pointé sur `/api/webhooks/whop`. Les identifiants de plan sont publics, ils figurent dans l'URL de checkout.",
    });
  } else if (payments === "lemonsqueezy" || payments === "paddle") {
    items.push({
      service: labelOf("payments", payments),
      why: "Encaisser les paiements. Merchant of record : la TVA est gérée par le prestataire.",
      env: ["PAYMENTS_API_KEY", "PAYMENTS_WEBHOOK_SECRET", "PAYMENTS_STORE_ID"],
      where:
        "Le compte doit être validé par le prestataire avant de pouvoir vendre — compter quelques jours. Prendre les noms exacts de variables dans sa documentation.",
    });
  }

  if (features.includes("emails")) {
    items.push({
      service: "Envoi d'emails (Resend ou Postmark)",
      why: "Emails transactionnels : bienvenue, réinitialisation, confirmation de paiement.",
      env: ["RESEND_API_KEY", "EMAIL_FROM"],
      where:
        "resend.com → API Keys, puis Domains : il faut ajouter les enregistrements DNS et attendre la vérification. Tant que le domaine n'est pas vérifié, l'envoi ne part que vers sa propre adresse.",
    });
  }

  if (features.includes("analytics")) {
    items.push({
      service: "PostHog",
      why: "Mesurer l'activation, le passage payant et la résiliation.",
      env: ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"],
      where: "posthog.com → Project settings. La clé projet est publique par conception.",
    });
  }

  if (ai === "claude") {
    items.push({
      service: "API Anthropic",
      why: "Faire tourner la fonctionnalité IA du produit.",
      env: ["ANTHROPIC_API_KEY"],
      where:
        "console.anthropic.com → API keys. Attention : c'est un coût variable par utilisateur — poser une limite par compte avant l'ouverture publique.",
    });
  } else if (ai === "openai") {
    items.push({
      service: "API OpenAI",
      why: "Faire tourner la fonctionnalité IA du produit.",
      env: ["OPENAI_API_KEY"],
      where:
        "platform.openai.com → API keys. Coût variable par utilisateur : poser une limite par compte avant l'ouverture publique.",
    });
  }

  if (features.includes("integrations")) {
    items.push({
      service: "Application OAuth de l'outil intégré",
      why: "Connecter le compte de l'utilisateur à l'outil qu'il utilise déjà.",
      env: ["INTEGRATION_CLIENT_ID", "INTEGRATION_CLIENT_SECRET"],
      where:
        "Espace développeur de l'outil visé. Certaines plateformes exigent une revue avant d'autoriser les comptes tiers : vérifier ce délai avant de le promettre à un client.",
    });
  }

  items.push({
    service: "Nom de domaine",
    why: "Une URL `.vercel.app` suffit pour tester, pas pour vendre.",
    env: [],
    where:
      "Vercel → Settings → Domains, puis pointer les DNS chez le registrar. Propagation : de quelques minutes à quelques heures.",
  });

  return items;
}

export type GenerateOptions = {
  /** "pro" appends the four deep-dive sections paid plans unlock. */
  depth?: "standard" | "pro";
};

export function generatePrompt(answers: Answers, options: GenerateOptions = {}): GeneratedPrompt {
  const depth = options.depth ?? "standard";
  const idea = str(answers, "idea");
  const problem = str(answers, "problem");
  const audience = str(answers, "audience");
  const competitor = str(answers, "competitor");
  const primaryColor = normalizeHex(str(answers, "primaryColor") || "#7C5CFF");
  const modeChoice = str(answers, "mode") || "dark";
  const mode: "dark" | "light" = modeChoice === "light" ? "light" : "dark";
  const visualStyle = str(answers, "visualStyle") || "minimal";
  const imageStyle = str(answers, "imageStyle") || "abstract";
  const typography = str(answers, "typography") || "modern-sans";
  const timeline = str(answers, "timeline") || "1m";
  const skill = str(answers, "skill") || "intermediate";
  const ai = str(answers, "ai") || "none";
  const auth = str(answers, "auth") || "email-password";
  const payments = str(answers, "payments") || "stripe";
  const language = str(answers, "language") || "fr";
  const tone = str(answers, "tone") || "direct";
  let stack = str(answers, "stack") || "next-postgres";
  if (stack === "auto") stack = skill === "beginner" ? "next-supabase" : "next-postgres";

  const palette = buildPalette(primaryColor, mode);
  const math = computeMath(answers);
  const productName = buildName(idea);
  const audienceLabel = labelOf("audience", audience);
  const ctx = AUDIENCE_CONTEXT[audience] ?? AUDIENCE_CONTEXT["b2b-smb"];
  const blueprint = STACK_BLUEPRINT[stack] ?? STACK_BLUEPRINT["next-postgres"];
  const tl = TIMELINE_SPEC[timeline] ?? TIMELINE_SPEC["1m"];
  const img = IMAGE_STYLE_SPEC[imageStyle] ?? IMAGE_STYLE_SPEC.abstract;

  const selectedFeatures = deriveFeatures(answers);
  const connections = connectionChecklist(answers);
  const featureTables = selectedFeatures.flatMap((f) => FEATURE_SPEC[f]?.tables ?? []);
  const backlog = Object.keys(FEATURE_SPEC).filter((f) => !selectedFeatures.includes(f));

  const tagline = problem.split(/[.!?]/)[0].trim().slice(0, 110) || idea.slice(0, 110);

  const L: string[] = [];
  const p = (...lines: string[]) => L.push(...lines);

  /* --- Header ---------------------------------------------------- */
  p(
    `# Brief de construction : ${productName}`,
    "",
    "> Brief généré par RepositSaaS. Colle-le tel quel dans Claude Code, à la racine d'un dossier vide.",
    "",
    "---",
    "",
    "## 0. Ton rôle",
    "",
    "Tu es un développeur produit senior. Tu construis un SaaS complet et déployable, pas une maquette.",
    `Niveau de l'utilisateur : **${labelOf("skill", skill)}**. ${SKILL_SPEC[skill]}`,
    "",
    "Règles non négociables :",
    "",
    "1. Tout ce que tu écris doit compiler et tourner. Tu lances le build avant de dire que c'est fini.",
    "2. Aucune donnée inventée dans l'interface : si une métrique n'existe pas encore, affiche un état vide explicite.",
    "3. Aucun secret en dur dans le code. Tout passe par des variables d'environnement, avec un `.env.example` à jour.",
    "4. Si une instruction de ce brief te paraît techniquement mauvaise, dis-le et propose l'alternative avant de l'appliquer.",
    "",
    "---",
    "",
  );

  /* --- Product ---------------------------------------------------- */
  p(
    "## 1. Le produit",
    "",
    `**Idée :** ${idea}`,
    "",
    `**Problème résolu :** ${problem}`,
    "",
    `**Cible :** ${audienceLabel}.`,
    `- Où elle se trouve : ${ctx.where}`,
    `- Objection principale à l'achat : ${ctx.objection}`,
    `- Cycle de décision : ${ctx.cycle}`,
    "",
  );

  if (competitor) {
    p(
      `**Alternative actuelle :** ${competitor}.`,
      "",
      `Conséquence directe : la landing doit répondre en une phrase à « pourquoi pas ${competitor} ? ». Place cette réponse au-dessus de la ligne de flottaison, pas dans une FAQ en bas de page.`,
      "",
    );
  } else {
    p(
      "**Alternative actuelle :** non renseignée.",
      "",
      "Attention : personne ne part de zéro. Les gens résolvent déjà ce problème d'une manière ou d'une autre, même mal — un tableur, du copier-coller, un prestataire, ou ne rien faire. Identifie cette alternative avant d'écrire une ligne de copy, sinon le positionnement sera creux.",
      "",
    );
  }

  p(
    `**Nom proposé :** ${productName}. Vérifie la disponibilité du .com et du handle avant de l'imprimer partout.`,
    "",
    `**Promesse (à retravailler) :** ${tagline}`,
    "",
    "---",
    "",
  );

  /* --- Scope ------------------------------------------------------ */
  p(
    "## 2. Périmètre de la v1",
    "",
    `Délai visé : **${tl.label}**. ${tl.rule}`,
    "",
    `Ce périmètre est déduit de la cible (${audienceLabel}), du modèle de revenus et du délai. Il tient dans le délai annoncé — c'est sa seule raison d'être aussi court.`,
    "",
    "### Dans le périmètre",
    "",
  );
  for (const f of selectedFeatures) {
    const spec = FEATURE_SPEC[f];
    if (spec) p(`- **${spec.label}** — ${spec.work}`);
  }
  p(
    "",
    "### Hors périmètre (v2, documenté dans le README, pas construit)",
    "",
    `${backlog.map((f) => FEATURE_SPEC[f]?.label ?? f).join(", ")}.`,
    "",
    "Si une de ces fonctionnalités te semble indispensable à la v1, écris pourquoi dans le README au lieu de la coder.",
    "",
    "---",
    "",
  );

  /* --- Design system ---------------------------------------------- */
  p(
    "## 3. Design system",
    "",
    `Ambiance : **${labelOf("mode", modeChoice)}**. Style : **${labelOf("visualStyle", visualStyle)}**.`,
    "",
    VISUAL_STYLE_SPEC[visualStyle] ?? VISUAL_STYLE_SPEC.minimal,
    "",
    "### Tokens (à placer dans le CSS global, jamais en dur dans les composants)",
    "",
    "```css",
    ":root {",
    `  --color-bg: ${palette.bg};`,
    `  --color-surface: ${palette.surface};`,
    `  --color-surface-raised: ${palette.surfaceRaised};`,
    `  --color-border: ${palette.border};`,
    `  --color-text: ${palette.textPrimary};`,
    `  --color-text-muted: ${palette.textMuted};`,
    `  --color-primary: ${palette.primary};`,
    `  --color-primary-hover: ${palette.primaryHover};`,
    `  --color-primary-active: ${palette.primaryActive};`,
    `  --color-primary-soft: ${palette.primarySoft};`,
    `  --color-on-primary: ${palette.onPrimary};`,
    `  --color-accent: ${palette.accent};`,
    `  --color-ring: ${palette.ring};`,
    `  --color-success: ${palette.success};`,
    `  --color-warning: ${palette.warning};`,
    `  --color-danger: ${palette.danger};`,
    "",
    "  --radius-sm: 6px;",
    "  --radius-md: 10px;",
    "  --radius-lg: 16px;",
    "  --space-unit: 4px;",
    "}",
    "```",
    "",
    `Contraste du texte sur le bouton principal : **${palette.contrastOnPrimary}:1** (seuil WCAG AA : 4.5:1 pour du texte normal).`,
  );
  if (palette.contrastOnPrimary < 4.5) {
    p(
      "",
      `> Ce ratio est sous le seuil AA. Sur les boutons pleins, utilise \`${palette.primaryActive}\` comme fond, ou réserve \`${palette.primary}\` aux bordures, aux icônes et aux aplats décoratifs.`,
    );
  }
  p(
    "",
    "### Typographie",
    "",
    TYPO_SPEC[typography] ?? TYPO_SPEC["modern-sans"],
    "",
    "Échelle : 12 / 14 / 16 / 20 / 24 / 32 / 48 / 64px. Corps de texte à 16px minimum, largeur de ligne limitée à 68 caractères.",
    "",
    "### Composants à construire une fois et à réutiliser",
    "",
    "`Button` (variantes primary / ghost / danger, états hover, focus-visible, disabled, loading), `Input`, `Select`, `Card`, `Badge`, `Modal`, `Toast`, `EmptyState`, `Skeleton`.",
    "",
    "Chaque élément interactif doit avoir un `:focus-visible` visible au clavier et une cible tactile d'au moins 44px de haut sur mobile.",
    "",
    "---",
    "",
  );

  /* --- Imagery ----------------------------------------------------- */
  p(
    "## 4. Direction artistique des images",
    "",
    `Style retenu : **${labelOf("imageStyle", imageStyle)}**.`,
    "",
    img.spec,
    "",
  );
  if (imageStyle !== "none" && imageStyle !== "screenshots") {
    p(
      "Prompt d'image réutilisable (remplace `[SUJET]` à chaque usage) :",
      "",
      "```text",
      img.prompt
        .replace(/\{PRIMARY\}/g, palette.primary)
        .replace(/\{MODE\}/g, mode === "dark" ? "sombre" : "clair"),
      "```",
      "",
      "Trois sujets à produire : le visuel héros de la landing, une illustration pour la section fonctionnalités, une image d'ouverture pour le blog.",
      "",
      'Contraintes techniques : format WebP, largeur maximale 1600px, `loading="lazy"` sauf pour le visuel héros, attribut `alt` descriptif systématique.',
      "",
    );
  }
  if (imageStyle === "anime" && (audience.startsWith("b2b") || audience === "ecommerce")) {
    p(
      `> Signal contradictoire : un style anime sur une cible ${audienceLabel} fait chuter la crédibilité perçue. Si tu gardes ce style, cantonne-le aux états vides et à la page 404, et garde des captures produit sur la landing.`,
      "",
    );
  }
  p("---", "");

  /* --- Architecture ------------------------------------------------ */
  p(
    "## 5. Architecture technique",
    "",
    `Stack : **${blueprint.label}**`,
    "",
    blueprint.detail,
    "",
    "Fichiers structurants :",
    "",
    "```text",
    ...blueprint.files,
    "```",
    "",
    `**Authentification :** ${labelOf("auth", auth)}.`,
  );
  if (auth === "email-password") {
    p(
      "Hachage avec scrypt ou argon2 (jamais SHA-256 seul), sel unique par utilisateur, session en cookie `httpOnly` + `Secure` + `SameSite=Lax`, durée 30 jours, invalidation à la déconnexion.",
    );
  } else if (auth === "magic-link") {
    p(
      "Jeton à usage unique, haché en base, expiration en 15 minutes, invalidé après usage. Prévois le cas du lien ouvert sur un autre appareil.",
    );
  } else if (auth === "oauth") {
    p(
      "Vérifie le `state` à chaque callback. Stocke les jetons chiffrés. Gère le cas d'un email déjà existant avec un autre fournisseur.",
    );
  } else {
    p(
      "Service géré : tu délègues la sécurité mais tu crées une dépendance et un coût par utilisateur actif. Vérifie le palier de prix avant de t'engager.",
    );
  }

  p(
    "",
    `**Paiement :** ${labelOf("payments", payments)}.`,
    "Règle absolue : l'accès payant est accordé par le webhook serveur, jamais par la redirection de retour côté client. Vérifie la signature du webhook. Rends le traitement idempotent — un même événement reçu deux fois ne doit rien dupliquer.",
    "",
    `**IA dans le produit :** ${labelOf("ai", ai)}.`,
  );
  if (ai === "claude" || ai === "openai") {
    p(
      "Appels côté serveur uniquement, clé jamais exposée au navigateur. Mets en place dès le départ : un compteur de tokens par utilisateur, une limite d'usage par plan, un cache sur les entrées identiques et un timeout. Sans ça, un seul utilisateur peut faire exploser ta marge.",
    );
  } else {
    p(
      "Aucun appel à un modèle. Toute la logique est déterministe : coût marginal nul, pas de latence, pas de dépendance à un fournisseur.",
    );
  }

  p(
    "",
    "### Modèle de données minimal",
    "",
    "```sql",
    "users (id, email unique, password_hash, created_at)",
    "sessions (id, user_id, expires_at)",
    "subscriptions (id, user_id, plan, status, provider_customer_id, current_period_end)",
    ...featureTables,
    "```",
    "",
    "Index sur toutes les clés étrangères et sur `users.email`. Migrations versionnées dans le dépôt, jamais de modification manuelle en production.",
    "",
    "---",
    "",
  );

  /* --- Routes ------------------------------------------------------ */
  p(
    "## 6. Parcours et routes",
    "",
    "| Route | Accès | Rôle |",
    "| --- | --- | --- |",
    "| `/` | public | Landing : promesse, preuve, tarifs, CTA |",
    "| `/pricing` | public | Comparatif des plans et FAQ objections |",
    "| `/signup` `/login` | public | Création de compte et connexion |",
    "| `/dashboard` | connecté | Cœur du produit |",
    "| `/settings` | connecté | Compte, abonnement, suppression de compte |",
    "| `/legal/terms` `/legal/privacy` | public | Obligatoire avant d'encaisser |",
    "",
    "Le chemin critique à optimiser : arrivée sur `/` → inscription → **premier moment de valeur**. Définis explicitement ce moment de valeur pour ce produit, puis mesure le pourcentage d'utilisateurs qui l'atteignent en moins de 10 minutes. C'est la seule métrique qui compte les premières semaines.",
    "",
    "---",
    "",
  );

  /* --- Monetisation ------------------------------------------------ */
  p(
    "## 7. Monétisation et objectif chiffré",
    "",
    `Objectif déclaré : **${math.mrrTarget.toLocaleString("fr-FR")} € de MRR**, ARPU visé **${math.arpu} €**.`,
    "",
    "| Indicateur | Valeur | Comment c'est calculé |",
    "| --- | --- | --- |",
    `| Clients payants nécessaires | **${math.customersNeeded}** | MRR cible ÷ ARPU |`,
    `| Churn mensuel attendu | ~${math.monthlyChurnPct}% | Référence du secteur pour ${audienceLabel} |`,
    `| LTV | ~${math.ltv.toLocaleString("fr-FR")} € | ARPU ÷ churn mensuel |`,
    `| CAC maximum soutenable | ~${math.cacCeiling.toLocaleString("fr-FR")} € | LTV ÷ 3 |`,
    `| Nouveaux clients par mois | ~${math.newCustomersPerMonth} | Objectif sur 12 mois + remplacement du churn |`,
    `| Visiteurs par mois nécessaires | ~${math.monthlyVisitorsNeeded.toLocaleString("fr-FR")} | 2,5% visiteur → inscription, ${math.tiers[0]?.price === 0 ? "3" : "6"}% inscription → payant |`,
    "",
    "Ces chiffres reposent sur des moyennes de marché, pas sur tes données. Remplace-les par tes chiffres réels dès que tu as 30 inscriptions.",
    "",
    "### Grille tarifaire à implémenter",
    "",
    "| Plan | Prix | Pour qui | Limite |",
    "| --- | --- | --- | --- |",
    ...math.tiers.map(
      (t) => `| ${t.name} | ${t.price === 0 ? "0 €" : `${t.price} €/mois`} | ${t.pitch} | ${t.limits} |`,
    ),
    "",
    "La limite doit porter sur l'unité de valeur du produit — ce que le client vient réellement consommer — et non sur le nombre de sièges, sinon les gens partagent un compte.",
    "",
  );

  if (math.warnings.length > 0) {
    p("### Ce qui ne tient pas dans ces hypothèses", "");
    for (const w of math.warnings) p(`- ${w}`);
    p("");
  }

  p("---", "");

  /* --- Copy -------------------------------------------------------- */
  p(
    "## 8. Copywriting",
    "",
    `Langue : **${labelOf("language", language)}**. Ton : **${labelOf("tone", tone)}**. ${TONE_SPEC[tone]}`,
    "",
    "Structure de la landing, dans cet ordre :",
    "",
    "1. **Titre** — le résultat obtenu, pas la fonctionnalité. Dix mots maximum.",
    `2. **Sous-titre** — pour qui, et en combien de temps. Une phrase. Mentionne ${audienceLabel} explicitement.`,
    "3. **CTA principal** — un verbe et un bénéfice. Jamais « En savoir plus ».",
    "4. **Preuve** — capture réelle du produit, ou démo de 20 secondes. Avant les témoignages.",
    "5. **Trois bénéfices** — chacun avec un élément concret : un chiffre, un avant/après, une capture.",
    `6. **Objection** — réponse directe à : ${ctx.objection}.`,
    "7. **Tarifs** — visibles sans clic supplémentaire, avec le plan recommandé mis en avant.",
    "8. **FAQ** — cinq questions qui traitent les vraies objections, pas des questions de confort.",
    "",
    "Interdits : « révolutionnaire », « la solution ultime », « propulsé par l'IA » sans dire ce que ça change, et tout témoignage inventé. Une page sans témoignage reste crédible. Un faux témoignage découvert ne l'est plus jamais.",
    "",
    "---",
    "",
  );

  /* --- Execution plan ---------------------------------------------- */
  p("## 9. Plan d'exécution", "");

  const plan: string[][] = [
    [
      "Fondations",
      "Initialise le projet, le design system (les tokens ci-dessus), le layout, la connexion à la base et les migrations. Déploie une page blanche en production dès le premier jour : un projet non déployé n'existe pas.",
    ],
    [
      "Authentification",
      `Inscription, connexion, déconnexion, protection des routes. ${labelOf("auth", auth)}. Teste le parcours complet dans une fenêtre privée avant de continuer.`,
    ],
    [
      "Cœur du produit",
      `Construis uniquement ${FEATURE_SPEC[selectedFeatures[0]]?.label ?? "la fonctionnalité principale"} et la boucle de valeur associée. Pas de réglages, pas de personnalisation, pas de thème. Un utilisateur doit pouvoir obtenir le résultat promis.`,
    ],
    [
      "Paiement et limites",
      payments === "none"
        ? "Pas de paiement intégré : place un lien de précommande ou une liste d'attente, et mesure combien de personnes cliquent. C'est ton vrai test de prix."
        : `Intégration ${labelOf("payments", payments)}, webhook signé et idempotent, application des limites par plan côté serveur, page de gestion de l'abonnement.`,
    ],
    [
      "Landing et mise en ligne",
      "Landing complète avec la structure de la section 8, mentions légales, domaine, analytics. Puis mise en ligne réelle et dix conversations avec des utilisateurs cibles.",
    ],
  ];

  const weekFor = (i: number) => {
    if (tl.weeks <= 1) return `Jour ${i + 1}-${i + 2}`;
    const start = Math.floor((i * tl.weeks) / plan.length) + 1;
    return `Semaine ${start}`;
  };

  plan.forEach(([title, body], i) => {
    p(`### Étape ${i + 1} — ${title} (${weekFor(i)})`, "", body, "");
  });

  p(
    "Après chaque étape : lance le build, corrige les erreurs, commit avec un message clair, déploie. Ne passe jamais à l'étape suivante sur une base cassée.",
    "",
    "---",
    "",
  );

  /* --- Definition of done ------------------------------------------ */
  p(
    "## 10. Definition of done",
    "",
    "La v1 est terminée quand tout ceci est vrai :",
    "",
    "- [ ] Le build passe sans erreur ni avertissement TypeScript.",
    "- [ ] Un visiteur peut s'inscrire, obtenir le résultat promis et payer, sans intervention manuelle.",
    "- [ ] Les limites de plan sont appliquées côté serveur, pas seulement masquées dans l'interface.",
    "- [ ] Toutes les routes protégées redirigent un visiteur non connecté.",
    "- [ ] Aucun secret dans le dépôt, et un `.env.example` complet.",
    "- [ ] L'interface est utilisable à 375px de large.",
    "- [ ] Chaque liste a un état vide, un état de chargement et un état d'erreur.",
    "- [ ] Mentions légales et politique de confidentialité en ligne.",
    "- [ ] L'application est déployée sur une URL publique.",
    "",
    "---",
    "",
    "## 11. Garde-fous",
    "",
    "- Ne construis aucune fonctionnalité absente de la section 2, même si elle paraît évidente.",
    "- N'ajoute pas de dépendance pour quelque chose que trente lignes résolvent.",
    "- Ne mets aucun chiffre inventé dans l'interface : nombre d'utilisateurs, note moyenne, témoignage.",
    "- N'accorde jamais un accès payant depuis le client.",
    "- Si tu bloques deux fois sur le même point, arrête-toi et explique le blocage au lieu de contourner.",
    "",
    "---",
    "",
  );

  /* --- Pro deep dives ---------------------------------------------- */
  let section = 12;

  if (depth === "pro") {
    p(
      `## ${section}. Analyse concurrentielle et différenciation`,
      "",
      competitor
        ? `L'alternative nommée est **${competitor}**. Avant d'écrire la moindre ligne de copy, remplis ce tableau avec des faits vérifiables, pas des impressions.`
        : "Aucune alternative n'a été nommée, ce qui est en soi un signal d'alerte. Commence par en identifier trois : deux outils concurrents et la méthode manuelle que les gens utilisent aujourd'hui.",
      "",
      "| | Alternative 1 | Alternative 2 | Ne rien faire |",
      "| --- | --- | --- | --- |",
      "| Prix affiché | | | 0 € |",
      "| Ce qu'ils font mieux | | | rien à installer |",
      "| Ce qu'ils font mal | | | le problème persiste |",
      "| Pour qui ils sont surdimensionnés | | | — |",
      "",
      "Ensuite, choisis **un seul** axe de différenciation et tiens-le partout :",
      "",
      "1. **Plus étroit** — tu fais une seule chose, pour une seule cible, mieux que quiconque.",
      "2. **Plus rapide** — le même résultat en dix fois moins de temps ou d'étapes.",
      "3. **Moins cher structurellement** — ton coût marginal est plus bas, pas ta marge.",
      "4. **Intégré là où ils ne sont pas** — tu vis dans l'outil que la cible utilise déjà.",
      "",
      "Un produit qui coche « un peu de tout » ne se retient pas. Écris ton axe en une phrase et relis chaque page de ton site en te demandant si elle le sert.",
      "",
      "> Interdit : prétendre être meilleur sur tous les axes. Nomme explicitement ce que tu fais moins bien que les concurrents — c'est ce qui rend le reste crédible.",
      "",
      "---",
      "",
    );
    section += 1;

    p(
      `## ${section}. Plan d'acquisition, 90 premiers jours`,
      "",
      `Cible : ${audienceLabel}. Canaux où elle se trouve réellement : ${ctx.where}.`,
      "",
      `Il te faut environ **${math.monthlyVisitorsNeeded.toLocaleString("fr-FR")} visiteurs par mois** pour tenir ton objectif. Ne lance pas quatre canaux en même temps : tu n'auras assez de données sur aucun.`,
      "",
      "| Phase | Objectif | Ce que tu fais | Comment tu sais que ça marche |",
      "| --- | --- | --- | --- |",
      "| Jours 1-30 | 10 conversations | Contact direct, un par un, sans automatisation | 3 personnes disent « je le prendrais aujourd'hui » |",
      "| Jours 31-60 | 100 visiteurs qualifiés | **Un seul** canal, celui où la cible est la plus dense | 2,5% s'inscrivent |",
      "| Jours 61-90 | Premiers payants | Optimiser le parcours inscription → valeur | 5% des inscrits paient |",
      "",
      `Ton CAC ne doit jamais dépasser **${math.cacCeiling.toLocaleString("fr-FR")} €** (LTV ÷ 3). Si un canal coûte plus, coupe-le, même s'il amène du volume.`,
      "",
      "Deux règles qui évitent les mois perdus :",
      "",
      "- Un canal ne se juge pas avant 30 jours ni après 60. Avant, c'est du bruit ; après, c'est de l'entêtement.",
      "- Si les dix premières conversations ne produisent aucun « je paierais pour ça », le problème est le produit, pas l'acquisition. Reviens à la section 1.",
      "",
      "---",
      "",
    );
    section += 1;

    p(
      `## ${section}. Instrumentation : ce qu'il faut mesurer`,
      "",
      "Sans ces événements, tu pilotes à l'aveugle et tu optimiseras au hasard. Implémente-les dès la mise en ligne, pas après.",
      "",
      "```text",
      "signup_completed        { source }",
      "activation_reached      { seconds_since_signup }   ← le moment de valeur défini en section 6",
      "pricing_viewed          { plan_highlighted }",
      "checkout_started        { plan }",
      "payment_confirmed       { plan, amount }",
      "subscription_cancelled  { plan, days_active }",
      "```",
      "",
      "Les quatre chiffres à regarder chaque semaine, et aucun autre au début :",
      "",
      "| Métrique | Calcul | Seuil d'alerte |",
      "| --- | --- | --- |",
      "| Taux d'activation | activation / signup | sous 40%, ton onboarding est cassé |",
      "| Visiteur → inscription | signup / visiteurs | sous 1,5%, ta landing ne convainc pas |",
      "| Inscription → payant | payment / signup | sous 2%, ton prix ou ta valeur perçue est à revoir |",
      `| Churn mensuel | annulations / payants | au-dessus de ${math.monthlyChurnPct}%, la rétention passe avant l'acquisition |`,
      "",
      "Ne construis pas de dashboard maison avant d'avoir 100 utilisateurs. Un outil externe et une requête SQL suffisent.",
      "",
      "---",
      "",
    );
    section += 1;

    p(
      `## ${section}. Risques d'exécution et points de décision`,
      "",
      "Ce qui tue le plus souvent un projet à ce stade, dans l'ordre de probabilité :",
      "",
      "1. **Le périmètre gonfle.** Tu ajoutes des fonctionnalités au lieu de parler à des clients. Signal : la v1 n'est toujours pas en ligne après le délai prévu. Réaction : coupe tout sauf la boucle de valeur principale et publie dans la semaine.",
      "2. **Personne n'active.** Les gens s'inscrivent et ne reviennent jamais. Signal : taux d'activation sous 40%. Réaction : regarde cinq sessions réelles, corrige le point exact où ils décrochent.",
      "3. **Le prix ne tient pas.** Les gens trouvent l'outil bien mais ne paient pas. Signal : beaucoup d'inscrits, presque aucun payant. Réaction : ce n'est presque jamais « trop cher », c'est « pas assez utile » — remonte à la section 1.",
      "4. **Tu construis seul trop longtemps.** Signal : plus de trois semaines sans parler à un utilisateur. Réaction : dix conversations cette semaine, avant toute nouvelle ligne de code.",
      "",
      "### Points de décision datés",
      "",
      "| Quand | Question | Si la réponse est non |",
      "| --- | --- | --- |",
      "| Fin du mois 1 | La v1 est-elle en ligne ? | Réduis le périmètre, pas le délai |",
      "| Fin du mois 3 | As-tu un client payant ? | Le problème est le positionnement, pas le produit |",
      `| Fin du mois 6 | As-tu ${Math.max(5, Math.round(math.customersNeeded * 0.05))} clients payants ? | Arrête ou change de cible — continuer à l'identique ne changera rien |`,
      "",
      "Écris ces dates dans ton agenda maintenant. Un point de décision qu'on repousse n'est pas un point de décision.",
      "",
      "---",
      "",
    );
    section += 1;
  }

  p(
    `## ${section}. Première action : la liste des branchements`,
    "",
    "**Avant d'écrire la moindre ligne de code**, produis ta réponse dans cet ordre, et arrête-toi à la fin du point 3.",
    "",
    "### 1. Ce qui reste à connecter",
    "",
    `Affiche exactement ce tableau, en gardant les noms de variables tels quels. C'est la liste des comptes à créer et des clés à récupérer pour que ${productName} tourne vraiment en ligne, pas seulement sur la machine.`,
    "",
    "| Service | Pourquoi | Variables d'environnement | Où le faire |",
    "| --- | --- | --- | --- |",
  );

  for (const item of connections) {
    // Space-joined, not <br>: the on-site renderer escapes HTML before parsing.
    const env = item.env.length > 0 ? item.env.map((e) => `\`${e}\``).join(" ") : "—";
    p(`| **${item.service}** | ${item.why} | ${env} | ${item.where} |`);
  }

  p(
    "",
    `Puis résume en une phrase : « Il reste ${connections.length} services à connecter, dont ${connections.filter((c) => c.env.length > 0).length} qui demandent une clé. »`,
    "",
    "### 2. Ce que tu peux construire sans rien attendre",
    "",
    "Dis clairement ce qui avance dès maintenant sans aucune clé : structure du projet, design system, pages statiques, composants, schéma de base de données, formulaires en local. Et dis ce qui est bloqué tant que les clés manquent : déploiement réel, paiement, emails, IA.",
    "",
    "### 3. Les trois risques",
    "",
    `Relis ce brief et nomme les trois points les plus risqués ou les plus flous pour ${productName}. Sois précis : « le prix de ${math.arpu} € par mois n'est validé par personne » vaut mieux que « attention au marché ».`,
    "",
    "### Ensuite",
    "",
    "Demande : « Je commence par la partie qui ne dépend d'aucune clé, ou tu crées d'abord les comptes ? » Puis attends la réponse.",
    "",
    "Pendant toute la construction : crée un fichier `BRANCHEMENTS.md` à la racine avec ce tableau, et coche chaque ligne au fur et à mesure. À chaque fois qu'une clé manquante t'empêche d'avancer, écris-le dans ce fichier au lieu de mettre une valeur bidon dans le code.",
    "",
  );

  const markdown = L.join("\n");

  // Free teaser: sections 0 to 2 included, paywall after.
  const cutMarker = "## 3. Design system";
  const cutIndex = markdown.indexOf(cutMarker);
  const preview = cutIndex > 0 ? markdown.slice(0, cutIndex).trimEnd() : markdown.slice(0, 1400);

  return {
    productName,
    tagline,
    summary: idea.slice(0, 220),
    palette,
    math,
    markdown,
    preview,
    wordCount: markdown.split(/\s+/).length,
    depth,
    sectionCount: section + 1,
  };
}
