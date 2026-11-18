/**
 * The five businesses ScaleBiz proposes.
 *
 * The five businesses: Clipping (the only one in Starter), ebook creation,
 * Vinted reselling, website creation and TikTok rewards (Pro). Editing one
 * here is all it takes. The numeric fields drive the matching score, so set
 * them honestly.
 *
 * Locked businesses never leave the server: the result page only serialises
 * `rank` and `fit` for them, not a single word of this content.
 */

import type { Answers } from "./questions";
import { computeProfile } from "./profile";

export type Business = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Minimum hours a day for it to work at all. */
  minHoursPerDay: number;
  /** Realistic net monthly income once running, in euros. */
  revenueRange: [number, number];
  /** Money needed to start, in euros. */
  startBudget: number;
  /** 18 when it needs a legal status, contracts or payouts in your own name. */
  minAge: number;
  /** Years of business experience it realistically needs. 0 = beginner-friendly. */
  minExperience: number;
  /** Launch plan without automation, in order. */
  steps: string[];
  /**
   * The done-for-you version. `available: false` shows "bientôt disponible"
   * until it exists — never promise an automation that is not built.
   */
  automation: { available: boolean; summary: string };
};

/** Business n°1 — the smallest start: least money, least time. */
const CLIPPING: Business = {
  id: "clipping",
  name: "Clipping",
  tagline: "Découpe les vidéos des créateurs en clips courts, et fais-toi payer.",
  description:
    "Les créateurs (YouTubeurs, podcasteurs, streamers, sites et marques qui font des vidéos) n'ont pas le temps " +
    "de transformer leurs longues vidéos en clips TikTok. Tu le fais pour eux : tu découpes les meilleurs moments, " +
    "tu les publies, et ils te paient au clip ou au mois.",
  minHoursPerDay: 1,
  revenueRange: [300, 1500],
  startBudget: 0,
  minAge: 16,
  minExperience: 0,
  steps: [
    "Crée un compte TikTok dédié au clipping, sur une niche claire (podcasts, business, gaming…).",
    "Publie 5 à 10 clips d'exemple pour montrer ton niveau (montage gratuit sur CapCut).",
    "Fais la liste des créateurs et des sites qui publient des vidéos longues sans clips courts.",
    "Envoie-leur un message : propose 3 clips gratuits pour tester.",
    "Livre les clips en 48 h, puis propose un forfait au mois.",
    "Garde les clients qui paient le mieux et monte tes prix.",
  ],
  automation: {
    available: false,
    summary: "Recherche des créateurs, messages et découpe des clips faits à ta place.",
  },
};

/** Business n°2 — Pro only. */
const EBOOK: Business = {
  id: "ebook",
  name: "Création d'ebook",
  tagline: "Écris un ebook sur une niche précise et vends-le grâce à TikTok.",
  description:
    "Tu choisis une niche où les gens ont un problème clair, tu écris un ebook court qui le résout, et tu le " +
    "vends en ligne. TikTok t'amène les acheteurs : tu postes des conseils tirés de l'ebook avec le lien en bio. " +
    "Un ebook se vend à l'infini, sans stock.",
  minHoursPerDay: 1,
  revenueRange: [300, 3000],
  startBudget: 0,
  minAge: 18,
  minExperience: 0,
  steps: [
    "Choisis une niche précise avec un problème clair (budget étudiant, perte de poids après grossesse, apprendre Excel…).",
    "Vérifie la demande sur TikTok : les vidéos de la niche qui font des vues et les questions dans les commentaires.",
    "Écris l'ebook : 20 à 40 pages qui résolvent un seul problème, pas à pas (Claude peut t'aider pour le plan et la relecture).",
    "Mets-le en page sur Canva, avec une couverture soignée.",
    "Mets-le en vente sur une plateforme de produits digitaux (Gumroad, Payhip, Stan…) avec un lien de paiement.",
    "Crée un compte TikTok sur la niche : poste des conseils tirés de l'ebook, avec le lien en bio.",
    "Publie chaque jour, garde les formats qui vendent, puis crée un 2e ebook pour les mêmes clients.",
  ],
  automation: {
    available: false,
    summary: "Choix de la niche, rédaction de l'ebook et publication des vidéos faits à ta place.",
  },
};

/** Business n°3 — Pro only. */
const VINTED: Business = {
  id: "vinted",
  name: "Achat-revente sur Vinted",
  tagline: "Achète en lot chez des grossistes, revends à l'unité sur Vinted.",
  description:
    "Tu trouves des grossistes et des lots à bas prix (vêtements de marque, sneakers, jeux…), puis tu revends " +
    "chaque article sur Vinted avec une marge. Tu réinvestis tes bénéfices dans des lots plus gros pour " +
    "grandir petit à petit.",
  minHoursPerDay: 2,
  revenueRange: [500, 3000],
  startBudget: 200,
  minAge: 18,
  minExperience: 0,
  steps: [
    "Choisis une catégorie qui se vend vite : sneakers, vêtements de marque, jeux vidéo…",
    "Étudie les prix : regarde les articles déjà vendus (pas seulement en vente) pour connaître le vrai prix de revente.",
    "Trouve un grossiste ou des lots : grossistes en ligne, déstockage, lots sur Vinted et Leboncoin, friperies au kilo.",
    "Commence petit : un premier lot que tu peux revendre avec au moins deux fois ta mise.",
    "Soigne tes annonces : photos à la lumière du jour, titre avec la marque et la taille, prix juste.",
    "Réinvestis tes bénéfices dans des lots plus gros et note tous tes achats et ventes dans un tableau.",
    "Dès que tu revends régulièrement pour faire du bénéfice, c'est une activité pro : déclare-toi (micro-entreprise) et passe en compte pro sur Vinted.",
  ],
  automation: {
    available: false,
    summary: "Recherche des lots rentables et publication des annonces faites à ta place.",
  },
};

/** Business n°4 — Pro only. */
const WEBSITES: Business = {
  id: "sites-web",
  name: "Création de sites web",
  tagline: "Crée des sites pour les petites entreprises avec l'IA, et vends-les par téléphone.",
  description:
    "Beaucoup d'artisans, de restaurants et de coachs n'ont pas de site, ou un site dépassé. Tu apprends à en " +
    "créer avec Claude grâce à de bons prompts, tu les démarches par téléphone, et tu vends la création puis " +
    "la maintenance au mois.",
  minHoursPerDay: 3,
  revenueRange: [1000, 6000],
  startBudget: 20,
  minAge: 18,
  minExperience: 0,
  steps: [
    "Choisis ta cible : artisans, restaurants, coachs… les petites entreprises sans site ou avec un site dépassé.",
    "Apprends à créer un site avec Claude : des prompts précis pour les pages, les textes et le design, puis la mise en ligne.",
    "Crée 2 ou 3 sites de démonstration pour ton portfolio.",
    "Prépare ton appel : un script court (qui tu es, leur problème, ton offre, ton prix) et entraîne-toi à voix haute.",
    "Appelle 20 entreprises par jour : le téléphone fait peur au début, ça passe après les 10 premiers appels.",
    "Propose un prix simple (création + maintenance au mois) et livre vite.",
    "Demande un avis et des recommandations à chaque client content.",
  ],
  automation: {
    available: false,
    summary: "Création des sites et prospection des clients faites à ta place.",
  },
};

/** Business n°5 — Pro only. */
const TIKTOK_REWARDS: Business = {
  id: "remuneration-tiktok",
  name: "Rémunération TikTok",
  tagline: "Fais grandir un compte TikTok et sois payé par la plateforme pour tes vues.",
  description:
    "Tu choisis une niche, tu chauffes ton compte, tu apprends à monter des vidéos qui retiennent les gens, et " +
    "tu publies chaque jour jusqu'à remplir les conditions du programme de rémunération de TikTok. Ensuite, " +
    "tes vues te rapportent de l'argent, en plus des partenariats.",
  minHoursPerDay: 2,
  revenueRange: [100, 2000],
  startBudget: 0,
  minAge: 18,
  minExperience: 0,
  steps: [
    "Choisis une niche où tu peux poster tous les jours : histoires, faits divers, humour, conseils…",
    "Chauffe ton compte : les premiers jours, utilise TikTok comme un vrai utilisateur de ta niche (regarde, like, commente) avant de publier.",
    "Apprends le montage sur CapCut : une accroche dans les 2 premières secondes, des sous-titres, un rythme rapide.",
    "Publie 1 à 3 vidéos par jour de plus d'une minute, et regarde lesquelles retiennent le plus les gens.",
    "Vise les conditions du programme de rémunération : 18 ans, 10 000 abonnés et 100 000 vues sur 30 jours (vérifie-les dans l'appli, elles changent).",
    "Une fois éligible, active la rémunération et garde les formats qui marchent.",
    "Ajoute d'autres revenus : partenariats avec des marques et affiliation.",
  ],
  automation: {
    available: false,
    summary: "Montage et publication des vidéos faits à ta place.",
  },
};

/** The 5 businesses. Starter opens only Clipping; Pro opens all of them. */
export const BUSINESSES: Business[] = [CLIPPING, EBOOK, VINTED, WEBSITES, TIKTOK_REWARDS];

export type RankedBusiness = {
  business: Business;
  rank: number;
  /** 0–100: how well it fits the answers. */
  fit: number;
};

/**
 * Scores each business against the answers, best first.
 *
 * Four criteria: is there enough time, can it reach the target, is the
 * person old enough, and do they have the experience it needs. Deterministic — same answers, same order.
 */
export function rankBusinesses(a: Answers, list: Business[] = BUSINESSES): RankedBusiness[] {
  const profile = computeProfile(a);

  const scored = list.map((business, index) => {
    let fit = 100;

    // Not enough time: heavy penalty, proportional to the gap.
    if (a.hoursPerDay < business.minHoursPerDay) {
      fit -= Math.min(50, ((business.minHoursPerDay - a.hoursPerDay) / business.minHoursPerDay) * 60);
    }

    // Target above what this business realistically makes.
    const [low, high] = business.revenueRange;
    if (a.monthlyTarget > high) {
      fit -= Math.min(35, ((a.monthlyTarget - high) / a.monthlyTarget) * 50);
    } else if (a.monthlyTarget < low) {
      // Overkill for a small target is a mild mismatch, not a blocker.
      fit -= 8;
    }

    if (!profile.isAdult && business.minAge >= 18) fit -= 30;

    // Not experienced enough: moderate penalty, it can be learned.
    const experience = a.experience ?? 0;
    if (experience < business.minExperience) {
      fit -= Math.min(25, (business.minExperience - experience) * 8);
    }

    return { business, index, fit: Math.max(5, Math.round(fit)) };
  });

  scored.sort((x, y) => y.fit - x.fit || x.index - y.index);
  return scored.map((s, i) => ({ business: s.business, rank: i + 1, fit: s.fit }));
}

/** The business every Starter plan opens, whatever the answers. */
export const STARTER_BUSINESS_ID = "clipping";

/**
 * Ranking as shown to an account on `plan`. Starter always opens Clipping:
 * it is moved to the top; the others keep their order behind it.
 */
export function rankForPlan(a: Answers, plan: string, list: Business[] = BUSINESSES): RankedBusiness[] {
  const ranked = rankBusinesses(a, list);
  if (plan !== "starter") return ranked;
  const starter = ranked.find((r) => r.business.id === STARTER_BUSINESS_ID);
  if (!starter) return ranked;
  const rest = ranked.filter((r) => r !== starter);
  return [starter, ...rest].map((r, i) => ({ ...r, rank: i + 1 }));
}
