# ScaleBiz

Trouve le business fait pour toi. Le visiteur répond à 3 questions, la génération
s'arrête au moment où il doit créer son compte, puis son résultat s'affiche avec
ses 5 business verrouillés et les offres pour les débloquer.

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Postgres.

---

## Le parcours

1. **`/` : le questionnaire, directement sur l'accueil.** Âge, heures par jour,
   objectif par mois. Les réponses sont gardées en `sessionStorage` : un
   rafraîchissement ou un passage par la page de connexion ne fait rien perdre.
2. **La génération démarre, puis se met en pause à 64 %.** Un cadenas apparaît
   avec le formulaire de création de compte (email + mot de passe), dans la même
   carte. Le visiteur ne quitte jamais la page.
3. **Le compte est créé → la génération reprend** (`POST /api/generate`, qui
   refuse tout appel sans session) puis redirige vers `/result/[id]`.
4. **`/result/[id]` :**
   - gratuit : le profil chiffré (heures par mois, taux horaire à atteindre,
     niveau d'ambition) ;
   - verrouillé : les 5 business, classés, avec un cadenas et l'offre qui les débloque ;
   - les offres, avec leur prix mensuel.
5. **`/dashboard`** garde tous les plans générés.

Un visiteur déjà connecté passe la pause sans s'arrêter.

## Les offres (`src/lib/plans.ts`)

| | Starter | Pro |
| --- | --- | --- |
| Prix | 23 € / mois | 42 € / mois |
| Prix de lancement (1er mois, 5 min après le questionnaire) | 17,99 € | 34,99 € |
| Annuel (sélecteur, mensuel par défaut) | 230 € / an | 420 € / an |
| Business | 1 : toujours le Clipping | tous |
| Questionnaires | 1 (vérifié côté serveur) | illimités |
| Automatisations | non | faites à ta place |
| Guides | le plan et son guide | plus complets, plus de pages |

Chaque carte liste les mêmes lignes (`FEATURES`) : Automatisation incluse, le plan complet
et son guide, tous les guides et tous les plans. ✅ en gras ce qui est inclus, 🚫 grisé ce
qui ne l'est pas — sauf sur l'offre recommandée après le questionnaire, qui n'affiche que
ses ✅. Le nom du business (Clipping pour Starter) n'apparaît pas dans les offres. L'annuel vaut 10 mois (« 2 mois offerts ») ; le prix de lancement ne
s'applique qu'au mensuel.

**Sans offre, rien n'est visible** : la page résultat ne montre qu'un cadenas et l'offre.

**Après la génération, une seule offre est proposée** (`recommendedOffer`). **Pro est
l'offre par défaut**, mise en avant comme « la plus avantageuse » (`BEST_VALUE`).
Starter n'est proposé que si la personne fait tout elle-même **et** vise un petit
objectif (≤ 1 500 €/mois, atteignable avec son temps). La raison affichée suit le
profil. Déterministe : mêmes réponses, même offre. Le bouton « Découvrir les autres
offres » montre l'autre.

**Prix de lancement** (`PROMO`) : pendant 5 minutes après la génération, le premier
mois est à `launchPrice`. Le compte à rebours est réel (calculé par le serveur, il ne
repart pas au rafraîchissement) ; ensuite, le premier mois est au prix normal. La page
Offres affiche les prix normaux et précise que le prix de lancement s'obtient après le
questionnaire — sinon le compte à rebours mentirait. Quand le paiement sera branché, il
doit facturer `launchPrice` uniquement tant que `promoActive()` est vrai.

Les comptes réglés sur l'ancienne offre « elite » sont lus comme Pro.

**Le paiement n'est pas branché.** En attendant, une offre s'accorde à la main depuis
**`/admin`** (colonne « Offre »).

## Les 5 business (`src/lib/businesses.ts`)

| # | Business | Offre | Temps mini | Revenu réaliste | Budget | Âge |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Clipping | Starter et Pro | 1 h / jour | 300 – 1 500 € | 0 € | 16 |
| 2 | Création d'ebook (vente via TikTok) | Pro | 1 h / jour | 300 – 3 000 € | 0 € | 18 |
| 3 | Achat-revente sur Vinted (grossistes) | Pro | 2 h / jour | 500 – 3 000 € | 200 € | 18 |
| 4 | Création de sites web (prompts Claude, prospection au téléphone) | Pro | 3 h / jour | 1 000 – 6 000 € | 20 € | 18 |
| 5 | Rémunération TikTok (chauffe du compte, montage, niche) | Pro | 2 h / jour | 100 – 2 000 € | 0 € | 18 |

Chaque business a son guide pas à pas (`steps`, la méthode sans automatisation) et un
statut d'automatisation (`automation.available`) : **toutes sont « bientôt
disponibles »** pour l'instant. Passer `available` à `true` suffit à l'afficher comme
disponible.

Starter ouvre toujours le Clipping (`rankForPlan`), quel que soit le profil. Pro ouvre les
5, classés par compatibilité : temps, objectif, âge, expérience (`rankBusinesses`).

**Les business ne quittent jamais le serveur tant qu'ils sont verrouillés** : la carte
verrouillée ne reçoit que son rang et son score, ni le nom ni le contenu.

## Ajouter une question

`src/lib/questions.ts` : l'ajouter à `QUESTIONS`, au type `Answers` et au schéma zod.
Le questionnaire et la validation serveur lisent tous les deux ce fichier.

---

## Démarrer en local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Sans `DATABASE_URL`, l'application tourne en mémoire : tout fonctionne, mais les
données disparaissent à chaque redémarrage. Mets ton email dans `ADMIN_EMAILS` pour
ouvrir `/admin`.

## Variables d'environnement

| Variable | Requis | Rôle |
| --- | --- | --- |
| `AUTH_SECRET` | **oui en prod** | Signature des sessions. 32 caractères minimum (`openssl rand -base64 48`). |
| `DATABASE_URL` | **oui en prod** | Postgres (Supabase, Neon, Vercel Postgres…). Tables créées au premier appel, préfixées `sb_`. Sur Supabase, prendre la chaîne « Transaction pooler » (port 6543). |
| `ADMIN_EMAILS` | pour `/admin` | Emails autorisés, séparés par des virgules. |
| `NEXT_PUBLIC_SITE_URL` | recommandé | Métadonnées, sitemap, robots.txt. |

**Sans passer par Vercel :** `ADMIN_EMAILS` peut aussi être rangée dans la table privée `sb_settings` de la base (colonnes `key`,
`value`, protégée par RLS). Une variable d'environnement, si elle existe, l'emporte.
Prise en compte en moins d'une minute, sans redéploiement.

En production, sans `AUTH_SECRET` ou sans base, l'inscription est refusée avec un
message explicite plutôt que de créer des comptes qui disparaîtraient.
`GET /api/health` dit ce qui manque.

## Structure

```
src/
├── app/
│   ├── page.tsx              accueil + questionnaire
│   ├── result/[id]/          résultat : profil gratuit, business verrouillés, offres
│   ├── dashboard/            mes plans
│   ├── pricing/  faq/  legal/
│   ├── admin/                inscrits + changement d'offre manuel
│   └── api/                  auth, generate, admin/plan, health
├── components/
│   ├── Onboarding.tsx        questions → génération → pause + compte → résultat
│   ├── BusinessCard.tsx      carte débloquée / verrouillée
│   ├── PricingCards.tsx  PlanButton.tsx
│   └── Logo.tsx …
└── lib/
    ├── questions.ts          les questions + validation
    ├── profile.ts            heures/mois, taux horaire, niveau d'ambition
    ├── businesses.ts         les 5 business + classement  ← à remplir
    ├── plans.ts              les offres                   ← prix provisoires
    ├── db.ts  auth.ts  rate-limit.ts  setup.ts  admin.ts
```

## Sécurité

- Mots de passe hachés en scrypt, session JWT en cookie `httpOnly`.
- Réponses validées côté serveur ; un résultat appartenant à un autre compte répond 404.
- Changement d'offre réservé aux emails de `ADMIN_EMAILS`, revérifié par la route.

## Reste à faire

- [ ] Rédiger les 5 business
- [ ] Brancher le paiement (abonnement mensuel)
- [ ] Définir précisément ce que chaque offre débloque en plus des business
- [ ] Compléter les pages légales (éditeur, contact, juridiction)
