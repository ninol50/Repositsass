/**
 * Minimal colour maths used by the prompt engine.
 *
 * The generated prompt hands Claude Code a *concrete* palette (real hex values)
 * instead of "use a nice purple", so we derive a full scale from the single
 * colour the user picked.
 */

export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

export function normalizeHex(input: string, fallback = "#7C5CFF"): string {
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split("")
      .map((c) => c + c)
      .join("")
      .toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return fallback;
}

export function hexToRgb(hex: string): Rgb {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  if (sn === 0) {
    const v = ln * 255;
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const channel = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return {
    r: channel(hn + 1 / 3) * 255,
    g: channel(hn) * 255,
    b: channel(hn - 1 / 3) * 255,
  };
}

export function hexToHsl(hex: string): Hsl {
  return rgbToHsl(hexToRgb(hex));
}

export function hslToHex(hsl: Hsl): string {
  return rgbToHex(hslToRgb(hsl));
}

/** Relative luminance, WCAG 2.1. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two hex colours (1 → 21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Pick black or white text for a given background, whichever reads better. */
export function readableTextOn(bg: string): string {
  return contrastRatio(bg, "#FFFFFF") >= contrastRatio(bg, "#0A0A0F")
    ? "#FFFFFF"
    : "#0A0A0F";
}

export type Palette = {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  ring: string;
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  contrastOnPrimary: number;
};

/**
 * Derive a complete, usable palette from one brand colour + a light/dark mode.
 * Neutrals are tinted with the brand hue so the UI reads as one system.
 */
export function buildPalette(primaryHex: string, mode: "dark" | "light"): Palette {
  const primary = normalizeHex(primaryHex);
  const { h, s, l } = hexToHsl(primary);
  const accentHue = (h + 32) % 360;

  // Keep the brand colour usable as a button fill: clamp very dark / very pale picks.
  const baseL = Math.min(72, Math.max(42, l));
  const usablePrimary = hslToHex({ h, s: Math.max(35, s), l: baseL });

  const dark = mode === "dark";

  return {
    primary: usablePrimary,
    primaryHover: hslToHex({ h, s: Math.max(35, s), l: baseL + (dark ? 7 : -6) }),
    primaryActive: hslToHex({ h, s: Math.max(35, s), l: baseL + (dark ? -6 : -12) }),
    primarySoft: dark
      ? hslToHex({ h, s: Math.min(60, Math.max(25, s)), l: 16 })
      : hslToHex({ h, s: Math.min(85, Math.max(40, s)), l: 95 }),
    onPrimary: readableTextOn(usablePrimary),
    accent: hslToHex({ h: accentHue, s: Math.max(45, Math.min(90, s + 8)), l: dark ? 66 : 52 }),
    ring: hslToHex({ h, s: Math.max(40, s), l: dark ? 60 : 50 }),
    bg: dark ? hslToHex({ h, s: 14, l: 4 }) : hslToHex({ h, s: 20, l: 99 }),
    surface: dark ? hslToHex({ h, s: 12, l: 7 }) : "#FFFFFF",
    surfaceRaised: dark ? hslToHex({ h, s: 11, l: 10 }) : hslToHex({ h, s: 18, l: 97 }),
    border: dark ? hslToHex({ h, s: 10, l: 17 }) : hslToHex({ h, s: 16, l: 89 }),
    textPrimary: dark ? hslToHex({ h, s: 18, l: 97 }) : hslToHex({ h, s: 22, l: 9 }),
    textMuted: dark ? hslToHex({ h, s: 10, l: 64 }) : hslToHex({ h, s: 10, l: 42 }),
    success: dark ? "#3FD68C" : "#12875A",
    warning: dark ? "#F2B441" : "#B27400",
    danger: dark ? "#FF6B6B" : "#C02626",
    contrastOnPrimary:
      Math.round(contrastRatio(usablePrimary, readableTextOn(usablePrimary)) * 100) / 100,
  };
}
