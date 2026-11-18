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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://scalebiz.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ScaleBiz — Trouve le business fait pour toi",
    template: "%s · ScaleBiz",
  },
  description:
    "Réponds à 3 questions — ton âge, ton temps disponible, ton objectif par mois — et ScaleBiz te propose 5 business classés selon ton profil.",
  keywords: ["business", "idée de business", "revenu en ligne", "entrepreneur", "side business"],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "ScaleBiz",
    title: "ScaleBiz — Trouve le business fait pour toi",
    description: "3 questions, 5 business classés selon ton temps et ton objectif de revenu.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScaleBiz",
    description: "3 questions, 5 business classés selon ton temps et ton objectif de revenu.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#060807",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <body className="bg-aurora min-h-screen antialiased">{children}</body>
    </html>
  );
}
