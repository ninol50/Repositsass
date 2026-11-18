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

| | Starter | Pro | Elite |
| --- | --- | --- | --- |
| Prix | 19 € / mois | 39 € / mois | 79 € / mois |
| Plans de business | 1 | 3 | tous (5) |
| Guides | 3 / mois | 10 / mois | 20 complets par business |
| Automatisation | 1, avec son guide | faite à ta place | tout, à ta place |
| Outils | pour la mise en place | idem | tous les meilleurs |

**Sans offre, rien n'est visible** : la page résultat ne montre qu'un cadenas et l'offre.

**Après la génération, une seule offre est proposée**, celle qui correspond au plan
(`recommendedOffer`) : automatisation voulue + objectif très élevé → Elite ;
automatisation voulue → Pro ; objectif très élevé sans automatisation → Pro ; sinon
Starter. Le bouton « Découvrir les autres offres » montre les deux autres.

**Offre de lancement** (`PROMO`) : -30 % le premier mois pendant 5 minutes après la
génération. Le compte à rebours est réel (calculé par le serveur, il ne repart pas au
rafraîchissement) : un faux minuteur est une pratique commerciale trompeuse. Quand
le paiement sera branché, il doit appliquer la remise uniquement tant que
`promoActive()` est vrai.

**Le paiement n'est pas branché.** En attendant, une offre s'accorde à la main depuis
**`/admin`** (colonne « Offre »).

## Les 5 business (`src/lib/businesses.ts`)

**À remplir.** Les 5 emplacements existent, avec des contenus « à rédiger ». Pour
chaque business : nom, accroche, description, étapes, et trois chiffres qui
pilotent le classement :

- `minHoursPerDay` : en dessous, le business est pénalisé ;
- `revenueRange` : un objectif au-dessus du maximum est pénalisé ;
- `minAge` : 18 si le business demande un statut ou des paiements à son nom.

Rien d'autre dans l'application n'a besoin de changer.

**Un business verrouillé ne quitte jamais le serveur.** La carte verrouillée ne reçoit
que son rang et son score : ni le nom ni le contenu ne sont dans le HTML ni dans la
charge utile React. Le flou n'est que le signal visuel.

## Connexion : email + mot de passe, retenus par le téléphone

Pas de « mot de passe oublié » à gérer : le formulaire est construit pour que le
gestionnaire de mots de passe fasse le travail.

- Inscription : `autocomplete="new-password"` + `passwordrules` → l'iPhone (trousseau
  iCloud) et Chrome proposent un mot de passe fort conforme aux règles, et l'enregistrent.
- Connexion : `autocomplete="current-password"` → ils le remplissent tout seuls.
- Chrome/Android : `navigator.credentials.store()` après une connexion réussie pour
  demander explicitement l'enregistrement.
- Session de 30 jours : on reste connecté sans rien retaper.

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
