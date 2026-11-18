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
2. **La génération démarre, puis se met en pause à 64 %.** Un cadenas apparaît :
   « Entre ton email pour finir la génération ». Le visiteur ne quitte jamais la page.
3. **Il reçoit un code à 6 chiffres par email, le tape → compte créé, la génération
   reprend** (`POST /api/generate`, qui
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

## Connexion sans mot de passe

Email → code à 6 chiffres → connecté. Inscription et connexion sont **un seul
parcours** : le compte est créé à la première vérification de code. Plus de mot de
passe, donc plus de « mot de passe oublié ».

- Code valable 10 minutes, utilisable une seule fois, mort après 5 erreurs.
- Stocké uniquement sous forme d'empreinte HMAC (clé `AUTH_SECRET`, liée à l'email).
- Limites : 4 codes par email et 10 par réseau toutes les 10 minutes.
- Réponse identique que le compte existe ou non.
- Envoi par **Resend** (`src/lib/email.ts`, appel HTTP direct). En local sans
  `RESEND_API_KEY`, le code s'affiche dans le formulaire et la console.

**Resend en test :** sans domaine vérifié, l'expéditeur `onboarding@resend.dev`
n'envoie **qu'à l'email de ton compte Resend**. Pour envoyer à tout le monde, vérifie
ton domaine dans Resend et renseigne `EMAIL_FROM`.

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
| `RESEND_API_KEY` | **oui en prod** | Envoi des codes de connexion (resend.com). Sans elle, personne ne peut se connecter. |
| `EMAIL_FROM` | recommandé | Expéditeur, ex. `ScaleBiz <code@ton-domaine.fr>` (domaine vérifié dans Resend). |
| `ADMIN_EMAILS` | pour `/admin` | Emails autorisés, séparés par des virgules. |
| `NEXT_PUBLIC_SITE_URL` | recommandé | Métadonnées, sitemap, robots.txt. |

**Sans passer par Vercel :** `RESEND_API_KEY`, `EMAIL_FROM` et `ADMIN_EMAILS` peuvent
aussi être rangées dans la table privée `sb_settings` de la base (colonnes `key`,
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
│   └── api/                  auth (request-code, verify-code), generate, admin/plan, health
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
    ├── email.ts              envoi des codes (Resend)
    ├── db.ts  auth.ts  rate-limit.ts  setup.ts  admin.ts
```

## Sécurité

- Aucun mot de passe : codes à usage unique hachés, session JWT en cookie `httpOnly`.
- Réponses validées côté serveur ; un résultat appartenant à un autre compte répond 404.
- Changement d'offre réservé aux emails de `ADMIN_EMAILS`, revérifié par la route.

## Reste à faire

- [ ] Rédiger les 5 business
- [ ] Brancher le paiement (abonnement mensuel)
- [ ] Définir précisément ce que chaque offre débloque en plus des business
- [x] Connexion par code email (remplace les mots de passe)
- [ ] Compléter les pages légales (éditeur, contact, juridiction)
