# RepositSaaS

Générateur de briefs de construction pour SaaS. L'utilisateur décrit son idée, répond à
un questionnaire de 21 questions, et récupère un document Markdown structuré en 12 sections
prêt à être collé dans Claude Code.

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Postgres · Whop.

---

## Le principe

Le moteur de génération est **déterministe** : aucun appel à un modèle de langage.
Les réponses entrent dans des règles écrites à la main (dérivation de palette, calcul
de churn et de LTV, sélection d'architecture). Conséquences directes :

- coût marginal nul par génération ;
- réponse instantanée, aucun timeout à gérer ;
- même entrée → même sortie, ce qui rend le produit testable ;
- les idées des utilisateurs ne sont envoyées à aucun fournisseur tiers.

Le brief n'est pas stocké : seules les réponses le sont, et le document est régénéré
à l'affichage — à la profondeur que le plan de l'utilisateur autorise.

## Ce que chaque plan débloque

Source unique : `src/lib/plans.ts`. Le paywall, le quota, la profondeur du document
et la page tarifs lisent tous ce fichier.

| | Gratuit | Basic | Pro | Max |
| --- | --- | --- | --- | --- |
| Briefs par mois | 5 | 10 | 30 | illimité |
| Lire le contenu | non | oui | oui | oui |
| Sections | — | 12 | 16 | 16 |
| Catalogue d'idées | non | non | oui | oui |
| Guide complet (`/guide`) | non | non | oui | oui |
| Pré-remplissage | non | non | oui | oui |

Le compte gratuit peut générer : il voit le titre, la longueur exacte et la liste des
sections de son brief, mais **aucune ligne de contenu n'est envoyée au navigateur** —
le branchement a lieu côté serveur, le markdown n'est jamais sérialisé dans cette
branche.

Les quatre sections Pro (analyse concurrentielle, plan d'acquisition 90 jours,
instrumentation, risques d'exécution) ajoutent environ 48% de contenu au document.

---

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # AUTH_SECRET suffit pour démarrer
npm run dev
```

Sans `DATABASE_URL`, l'application tourne sur un stockage en mémoire : tout fonctionne,
mais les données disparaissent à chaque redémarrage. `GET /api/health` indique le driver
actif et ce qui n'est pas configuré.

---

## Variables d'environnement

| Variable | Requis | Rôle |
| --- | --- | --- |
| `AUTH_SECRET` | **oui en prod** | Signature des sessions JWT. 32 caractères minimum (`openssl rand -base64 48`). L'app refuse de démarrer en production sans. |
| `DATABASE_URL` | oui en prod | Postgres standard : Supabase, Neon, Vercel Postgres, Railway. Les tables sont créées au premier appel. Sur Supabase, **utiliser la chaîne « Transaction pooler » (port 6543)** — voir ci-dessous. |
| `NEXT_PUBLIC_SITE_URL` | recommandé | Métadonnées, sitemap, robots.txt. |
| `ADMIN_EMAILS` | pour voir les inscrits | Emails séparés par des virgules autorisés sur `/admin`. Non renseigné : la page est inaccessible à tout le monde. |
| `WHOP_PLAN_BASIC_ID` / `_PRO_ID` / `_MAX_ID` | non | Les plans en production sont câblés dans `src/lib/whop.ts` (les IDs sont publics, ils figurent dans l'URL de checkout). Ces variables ne servent qu'à les remplacer. |
| `WHOP_PLAN_*_URL` | non | URL de checkout complètes, prioritaires sur les ID. |
| `WHOP_WEBHOOK_SECRET` | pour vendre | Sans lui, **tous** les webhooks sont rejetés et aucun accès n'est accordé. |
| `WHOP_API_KEY` | optionnel | Active la vérification manuelle de licence sur `/billing/verify`. |

---

## Déploiement sur Vercel

1. Pousser le dépôt sur GitHub, puis importer le projet dans Vercel.
2. Créer une base et copier son URL dans `DATABASE_URL` (voir la section Supabase ci-dessous).
3. Renseigner `AUTH_SECRET` et `NEXT_PUBLIC_SITE_URL`.
4. Déployer, puis ouvrir `https://<domaine>/api/health` pour vérifier qu'il ne reste
   aucun avertissement.
5. Côté Whop : pointer le webhook sur `https://<domaine>/api/webhooks/whop` et
   renseigner `WHOP_WEBHOOK_SECRET`. Les plans sont déjà câblés.

Aucune commande de migration à lancer : le schéma se crée tout seul au premier appel
à la base (`CREATE TABLE IF NOT EXISTS`).

### Supabase : le piège à connaître

Supabase propose deux chaînes de connexion. **Une seule fonctionne sur Vercel.**

| Chaîne | Port | Sur Vercel |
| --- | --- | --- |
| Direct connection | 5432 | ❌ IPv6 uniquement, injoignable depuis les fonctions Vercel |
| **Transaction pooler** | **6543** | ✅ celle qu'il faut |

Chemin : **Settings → Database → Connection string → Transaction pooler**.

```
postgresql://postgres.<ref>:<mot-de-passe>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

Le pooler tourne en mode transaction, ce qui interdit les requêtes préparées :
le client est donc configuré avec `prepare: false` (`src/lib/db.ts`). Si tu colles
la mauvaise chaîne, `/api/health` te le dit explicitement au lieu de te laisser
avec un timeout inexpliqué.

Le projet n'utilise ni `supabase-js`, ni Supabase Auth, ni les RLS : uniquement
Postgres. Les sessions restent gérées par l'application (scrypt + JWT).

---

## Modèle de paiement

L'accès payant est accordé **uniquement côté serveur**, par deux chemins :

1. **Webhook** (`/api/webhooks/whop`) — la source de vérité. Signature HMAC-SHA256
   vérifiée en temps constant, traitement idempotent par identifiant de livraison.
   Le compte est retrouvé via `metadata[user_id]` attaché au lien de checkout, avec
   repli sur l'email.
2. **Clé de licence** (`/billing/verify`) — filet de sécurité quand un webhook s'est
   perdu. Appelle l'API Whop et n'accorde l'accès que si la licence est active.

La redirection de retour depuis Whop n'accorde jamais rien.

> **À vérifier avant mise en production commerciale :** le nom exact de l'en-tête de
> signature et le format des événements Whop peuvent évoluer. Le code accepte
> `x-whop-signature`, `whop-signature` et `x-signature`, avec ou sans préfixe `sha256=`.
> Confronte-le à la documentation Whop en cours et rejoue un webhook de test avant
> d'ouvrir les ventes.

---

## Structure

```
src/
├── app/
│   ├── page.tsx                 landing
│   ├── brief/                   questionnaire
│   ├── result/[id]/             brief généré + paywall
│   ├── pricing/  faq/  legal/   pages publiques
│   ├── dashboard/               espace connecté
│   ├── admin/                   back-office : liste des inscrits
│   ├── ideas/                   catalogue d'idées (Pro)
│   ├── guide/                   guide brief → site en ligne (Pro)
│   ├── billing/verify/          récupération de licence
│   └── api/                     auth, generate, reviews, billing, webhooks, health
├── components/                  UI (serveur + client)
├── lib/
│   ├── prompt-engine.ts         le moteur : questions → brief
│   ├── questions.ts             schéma du questionnaire + validation serveur
│   ├── color.ts                 dérivation de palette, contraste WCAG
│   ├── markdown.ts              rendu Markdown (échappement avant transformation)
│   ├── db.ts                    stockage : Postgres (postgres.js) ou mémoire
│   ├── auth.ts                  scrypt + sessions JWT
│   ├── plans.ts                 capacités et quotas par plan
│   ├── ideas.ts                 catalogue d'idées (vide par défaut)
│   ├── whop.ts                  catalogue de plans, webhook, licences
│   └── rate-limit.ts            limitation de débit en mémoire
└── middleware.ts                redirection Edge pour les routes protégées
```

---

## Sécurité

- Mots de passe hachés en scrypt, sel de 16 octets, comparaison en temps constant.
- Session JWT HS256 en cookie `httpOnly` + `SameSite=Lax` + `Secure` en production.
- Validation des réponses côté serveur : le client ne décide de rien.
- Le brief complet n'est jamais envoyé au navigateur d'un compte non payant — le
  découpage a lieu côté serveur, pas par un masque CSS.
- Rendu Markdown avec échappement HTML avant toute transformation.
- En-têtes `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`.

**Limites connues et assumées :**

- La limitation de débit est en mémoire : sur serverless, chaque instance a son propre
  compteur. Ça ralentit l'abus, ça ne l'arrête pas. À remplacer par un store partagé
  (Upstash, Vercel KV) avant que le trafic ne le justifie.
- Pas de réinitialisation de mot de passe. À ajouter avant d'avoir de vrais clients.
- Pas de vérification d'email à l'inscription.
- Pas de suppression de compte en self-service (obligation RGPD traitée à la main
  pour l'instant).

---

## Avis clients

La section avis lit la base et rien d'autre. Tant que personne n'a publié d'avis, elle
affiche un état vide qui le dit explicitement. Un compte ne peut publier qu'un seul avis,
et seulement après avoir généré au moins un brief.

Aucun témoignage n'est écrit en dur dans le code — et il ne faut pas en ajouter.

---

## Guide (`/guide`)

Chaque commande de la page est citée **verbatim depuis la documentation officielle**
de Claude Code (code.claude.com/docs), vérifiée au moment de l'écriture.

Les prix de Claude Code ne sont **volontairement pas reproduits** : ils changent, et
un guide qui affiche un prix périmé se transforme en ticket de support. La page
renvoie vers claude.com/pricing.

Même règle pour les URL de serveurs MCP : seules celles présentes dans la
documentation officielle sont citées. Pour les autres fournisseurs, la page donne la
forme de la commande et dit d'aller chercher l'URL à la source plutôt que de la
deviner.

---

## Ce qui reste à faire

- [ ] Réinitialisation de mot de passe et vérification d'email
- [ ] Suppression de compte en self-service
- [ ] Limitation de débit sur un store partagé
- [ ] Page de gestion d'abonnement (aujourd'hui : lien vers Whop)
- [ ] Analytics produit (activation, passage payant, churn)
- [x] Back-office listant les inscrits (`/admin`, protégé par `ADMIN_EMAILS`)
- [ ] Compléter les pages légales : identité de l'éditeur, juridiction, contact
