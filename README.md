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
   avec le formulaire de création de compte, dans la même carte. Le visiteur ne
   quitte jamais la page. Lien « Se connecter » s'il a déjà un compte.
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

| | Gratuit | Starter | Pro | Elite |
| --- | --- | --- | --- | --- |
| Prix | 0 € | 19 € / mois | 39 € / mois | 79 € / mois |
| Business débloqués | 0 | 1 | 3 | 5 |

Les prix et les avantages sont **provisoires** : une ligne à changer dans
`src/lib/plans.ts`. Les business les mieux classés pour la personne sont toujours
débloqués en premier.

**Le paiement n'est pas branché.** Le bouton « Choisir » le dit clairement au lieu de
faire semblant. En attendant, une offre s'accorde à la main depuis **`/admin`**
(colonne « Offre »), ce qui permet de tester les déblocages. Le seul composant à
changer quand le paiement arrivera : `src/components/PlanButton.tsx`.

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
- [ ] Réinitialisation de mot de passe, vérification d'email
- [ ] Compléter les pages légales (éditeur, contact, juridiction)
