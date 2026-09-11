import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://repositsaas.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RepositSaaS — Transforme ton idée en brief prêt pour Claude Code",
    template: "%s · RepositSaaS",
  },
  description:
    "Réponds à une vingtaine de questions sur ton idée de SaaS, ton design et ton objectif de revenus. RepositSaaS génère un brief de construction complet, à coller dans Claude Code.",
  keywords: ["SaaS", "générateur d'idées", "Claude Code", "prompt", "MVP", "indie hacker"],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "RepositSaaS",
    title: "RepositSaaS — Ton idée de SaaS, transformée en brief de construction",
    description:
      "Un questionnaire guidé, un brief complet : positionnement, design system, architecture, pricing chiffré et plan d'exécution.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RepositSaaS",
    description: "Ton idée de SaaS, transformée en brief prêt pour Claude Code.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#07070b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <body className="bg-aurora min-h-screen antialiased">{children}</body>
    </html>
  );
}
