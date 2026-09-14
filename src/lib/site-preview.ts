/**
 * The visual preview model.
 *
 * Same contract as the prompt engine: deterministic, no model call. The preview
 * is not a screenshot of a finished product — it is the design system and the
 * page structure the brief describes, rendered so the user can see the colour,
 * the typography and the layout before pasting anything into Claude Code.
 *
 * Deliberately empty of invented data: no fake user count, no fake rating, no
 * fake testimonial. The brief forbids them in the generated product, so the
 * preview of that product does not show them either.
 */

import { buildPalette, hexToHsl, normalizeHex, type Palette } from "./color";
import { buildName, computeMath, deriveFeatures, featureLabel, slugify } from "./prompt-engine";
import { labelOf, str, type Answers } from "./questions";

export type PreviewStyle = {
  key: string;
  label: string;
  /** Corner radius in px, applied to cards and buttons. */
  radius: number;
  /** Border width in px. */
  borderWidth: number;
  /** Extra background treatment behind the hero. */
  glow: boolean;
  blurPanels: boolean;
  uppercaseNav: boolean;
  shadow: string;
};

export type PreviewFonts = { display: string; body: string; tracking: string; weight: number };

export type SitePreviewModel = {
  productName: string;
  domain: string;
  navItems: string[];
  badge: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  media: { label: string; description: string; kind: string };
  featureCards: { title: string; body: string }[];
  stats: { label: string }[];
  pricing: { name: string; price: number; period: string; lines: string[]; highlight: boolean }[];
  footerNote: string;
  palette: Palette;
  style: PreviewStyle;
  fonts: PreviewFonts;
  mode: "dark" | "light";
  language: string;
};

const STYLES: Record<string, PreviewStyle> = {
  minimal: {
    key: "minimal",
    label: "Minimal",
    radius: 12,
    borderWidth: 1,
    glow: false,
    blurPanels: false,
    uppercaseNav: false,
    shadow: "none",
  },
  glass: {
    key: "glass",
    label: "Glassmorphism",
    radius: 18,
    borderWidth: 1,
    glow: true,
    blurPanels: true,
    uppercaseNav: false,
    shadow: "0 18px 40px -22px rgba(0,0,0,0.75)",
  },
  brutalist: {
    key: "brutalist",
    label: "Brutalist",
    radius: 0,
    borderWidth: 2,
    glow: false,
    blurPanels: false,
    uppercaseNav: true,
    shadow: "4px 4px 0 currentColor",
  },
  "neo-retro": {
    key: "neo-retro",
    label: "Néo-rétro",
    radius: 6,
    borderWidth: 1,
    glow: true,
    blurPanels: false,
    uppercaseNav: true,
    shadow: "0 0 24px -6px currentColor",
  },
  corporate: {
    key: "corporate",
    label: "Corporate clean",
    radius: 8,
    borderWidth: 1,
    glow: false,
    blurPanels: false,
    uppercaseNav: false,
    shadow: "0 10px 28px -20px rgba(0,0,0,0.6)",
  },
};

const FONTS: Record<string, PreviewFonts> = {
  "modern-sans": {
    display: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    body: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    tracking: "-0.03em",
    weight: 600,
  },
  grotesk: {
    display: "var(--font-display), var(--font-inter), ui-sans-serif, sans-serif",
    body: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    tracking: "-0.035em",
    weight: 600,
  },
  serif: {
    display: "Georgia, 'Times New Roman', serif",
    body: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    tracking: "-0.015em",
    weight: 500,
  },
  mono: {
    display: "var(--font-mono), ui-monospace, monospace",
    body: "var(--font-mono), ui-monospace, monospace",
    tracking: "-0.02em",
    weight: 500,
  },
};

const MEDIA: Record<string, { label: string; description: string }> = {
  realistic: { label: "Photo réaliste", description: "Photo de la cible en situation, lumière naturelle" },
  "3d": { label: "Rendu 3D", description: "Objet 3D isométrique, matériau mat, ombre douce" },
  anime: { label: "Anime / manga", description: "Illustration cel-shading, traits nets, couleurs franches" },
  flat: { label: "Illustration flat", description: "Formes pleines, deux teintes de la palette" },
  abstract: { label: "Abstrait / dégradés", description: "Dégradé de la couleur principale, formes floues" },
  screenshots: { label: "Capture produit", description: "L'interface réelle, pas une illustration" },
  none: { label: "Sans image", description: "Typographie et couleur seulement" },
};

const NAV_BY_LANGUAGE: Record<string, string[]> = {
  fr: ["Produit", "Tarifs", "FAQ"],
  en: ["Product", "Pricing", "FAQ"],
  both: ["Produit", "Tarifs", "FAQ"],
};

const CTA: Record<string, { primary: string; secondary: string }> = {
  fr: { primary: "Commencer", secondary: "Voir une démo" },
  en: { primary: "Get started", secondary: "See a demo" },
  both: { primary: "Commencer", secondary: "Voir une démo" },
};

/** First sentence of the problem, turned into a hero subtitle. */
function subtitleFrom(problem: string, idea: string): string {
  const sentence = problem.split(/[.!?]/)[0].trim();
  const base = sentence.length >= 20 ? sentence : idea.trim();
  return base.length > 150 ? `${base.slice(0, 147)}…` : base;
}

function heroTitleFrom(idea: string, tone: string): string {
  const cleaned = idea.trim().replace(/^je veux (construire|créer|faire)\s*/i, "");
  const sentence = cleaned.split(/[.!?]/)[0].trim();
  const short = sentence.length > 74 ? `${sentence.slice(0, 71)}…` : sentence;
  const capped = short.charAt(0).toUpperCase() + short.slice(1);
  if (tone === "bold" && !capped.endsWith(".")) return `${capped}.`;
  return capped;
}

export function buildSitePreview(answers: Answers): SitePreviewModel {
  const idea = str(answers, "idea");
  const problem = str(answers, "problem");
  const modeChoice = str(answers, "mode") || "dark";
  const mode: "dark" | "light" = modeChoice === "light" ? "light" : "dark";
  const primaryColor = normalizeHex(str(answers, "primaryColor") || "#7C5CFF");
  const visualStyle = str(answers, "visualStyle") || "minimal";
  const imageStyle = str(answers, "imageStyle") || "abstract";
  const typography = str(answers, "typography") || "modern-sans";
  const language = str(answers, "language") || "fr";
  const tone = str(answers, "tone") || "direct";
  const audience = str(answers, "audience");

  const productName = buildName(idea);
  const math = computeMath(answers);
  const features = deriveFeatures(answers);

  const style = STYLES[visualStyle] ?? STYLES.minimal;
  const fonts = FONTS[typography] ?? FONTS["modern-sans"];
  const media = MEDIA[imageStyle] ?? MEDIA.abstract;
  const cta = CTA[language] ?? CTA.fr;

  return {
    productName,
    domain: `${slugify(productName) || "monsaas"}.com`,
    navItems: NAV_BY_LANGUAGE[language] ?? NAV_BY_LANGUAGE.fr,
    badge: labelOf("audience", audience),
    heroTitle: heroTitleFrom(idea, tone),
    heroSubtitle: subtitleFrom(problem, idea),
    ctaPrimary: cta.primary,
    ctaSecondary: cta.secondary,
    media: { ...media, kind: imageStyle },
    featureCards: features.slice(0, 3).map((f) => ({
      title: featureLabel(f),
      body: "Bloc à remplir avec le bénéfice réel, pas la description technique.",
    })),
    // Empty by design: a mockup that ships fake metrics teaches the wrong habit.
    stats: [{ label: "Métrique 1" }, { label: "Métrique 2" }, { label: "Métrique 3" }],
    pricing: math.tiers.map((t, i) => ({
      name: t.name,
      price: t.price,
      period: "/ mois",
      lines: [t.pitch, t.limits],
      highlight: i === 1,
    })),
    footerNote: `© ${productName} — mentions légales, confidentialité, contact`,
    palette: buildPalette(primaryColor, mode),
    style,
    fonts,
    mode,
    language,
  };
}

/** Hue of the brand colour, used for the ambient glow behind the mockup. */
export function brandHue(hex: string): number {
  return Math.round(hexToHsl(normalizeHex(hex)).h);
}

/**
 * The locked model.
 *
 * Passing the real model to a server component that "only renders skeleton
 * bars" is not enough: React serialises the props of that element into the RSC
 * payload, so the strings ship to the browser anyway. So the redaction happens
 * on the model itself, before it is handed to any component — what leaves the
 * server is a dot of the right length and nothing else.
 */
export function redactModel(model: SitePreviewModel): SitePreviewModel {
  const bar = (s: string) => "•".repeat(Math.max(3, Math.min(120, s.length)));

  return {
    ...model,
    productName: bar(model.productName),
    domain: bar(model.domain),
    navItems: model.navItems.map(bar),
    badge: bar(model.badge),
    heroTitle: bar(model.heroTitle),
    heroSubtitle: bar(model.heroSubtitle),
    ctaPrimary: bar(model.ctaPrimary),
    ctaSecondary: bar(model.ctaSecondary),
    media: { label: bar(model.media.label), description: bar(model.media.description), kind: model.media.kind === "none" ? "none" : "locked" },
    featureCards: model.featureCards.map((f) => ({ title: bar(f.title), body: bar(f.body) })),
    stats: model.stats.map((s) => ({ label: bar(s.label) })),
    pricing: model.pricing.map((t) => ({
      name: bar(t.name),
      price: 0,
      period: "",
      lines: t.lines.map(bar),
      highlight: t.highlight,
    })),
    footerNote: bar(model.footerNote),
  };
}
