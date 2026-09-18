# RepositSaaS

Générateur de sites SaaS. L'utilisateur décrit son idée, répond à un questionnaire de
20 questions, voit une maquette de son site, puis récupère le prompt Markdown à coller
dans Claude Code pour le construire.

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
à l'affichage — à la profondeur que le plan de l'utilisateur autorise. La maquette
(`src/lib/site-preview.ts`) sort du même jeu de réponses et des mêmes règles de palette.

### Le périmètre fonctionnel est déduit, pas demandé

Le questionnaire ne demande plus de cocher cinq fonctionnalités. `deriveFeatures()`
les déduit de la cible, du modèle de revenus, du mode d'authentification et du délai,
puis **plafonne la liste par le délai choisi** : une par semaine, trois pour un mois,
cinq pour trois mois. L'ancien formulaire laissait cocher cinq fonctionnalités avec un
délai d'une semaine, ce que le brief lui-même déclarait ensuite impossible.

### Ce que le prompt fait faire à Claude Code en premier

La dernière section du document impose un ordre : avant toute ligne de code, Claude Code
doit afficher le tableau des services à connecter (GitHub, Vercel, base, paiement, emails,
IA, domaine) avec les noms exacts des variables d'environnement, dire ce qui avance sans
aucune clé, nommer les trois risques du projet, puis s'arrêter et attendre. Le tableau est
recopié dans un `BRANCHEMENTS.md` tenu à jour pendant toute la construction.

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

Le compte gratuit peut générer : il voit la forme de sa maquette, le titre, la longueur
exacte et la liste des sections de son brief, mais **aucune ligne de contenu n'est envoyée
au navigateur** — le branchement a lieu côté serveur, le markdown n'est jamais sérialisé
dans cette branche.

La maquette verrouillée n'est pas un flou CSS posé sur du vrai texte : `redactModel()`
remplace chaque chaîne générée par une barre de la même longueur **avant** que le modèle
n'atteigne le moindre composant. C'est nécessaire, pas décoratif : React sérialise les
props d'un composant serveur passé à un composant client dans la charge utile RSC, donc
un composant qui se contenterait de ne pas afficher la chaîne l'enverrait quand même.
Le flou par-dessus n'est que le signal visuel.

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
| `WHOP_API_KEY` | **fortement conseillé** | Alimente les deux filets de sécurité : le bouton « J'ai déjà payé » et la réconciliation quotidienne. Sans elle, un webhook perdu = un client qui a payé et reste bloqué. |
| `CRON_SECRET` | pour la réconciliation | Envoyé par Vercel en `Authorization: Bearer`. Absent, la tâche planifiée refuse de s'exécuter. |
| `WHOP_API_URL` | non | Bascule l'API Whop vers un bouchon local. Ne sert qu'aux tests. |

---

## Déploiement sur Vercel

1. Pousser le dépôt sur GitHub, puis importer le projet dans Vercel.
2. Créer une base et copier son URL dans `DATABASE_URL` (voir la section Supabase ci-dessous).
3. Renseigner `AUTH_SECRET` et `NEXT_PUBLIC_SITE_URL`.
4. Déployer, puis ouvrir `https://<domaine>/api/health` pour vérifier qu'il ne reste
   aucun avertissement.
5. Côté Whop : pointer le webhook sur `https://<domaine>/api/webhooks/whop` et
   renseigner `WHOP_WEBHOOK_SECRET`. Les plans sont déjà câblés.
6. Renseigner `WHOP_API_KEY` et `CRON_SECRET`, puis **redéployer** : une variable
   ajoutée ne s'applique pas au déploiement déjà en ligne.

`/api/health` expose `billingPaths` : les trois chemins d'octroi et lesquels sont
réellement câblés.

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

Le paiement s'ouvre **dans une modale par-dessus le site** (`WhopCheckout`), pas sur
whop.com : le script `js.whop.com/static/checkout/loader.js` est injecté une fois dans
le `<head>`, au moment où quelqu'un ouvre réellement un checkout, et remplit une div
portant `data-whop-checkout-plan-id`. L'identifiant du plan est extrait des liens de
checkout du projet (`whopPlanIdFromUrl`), jamais retapé ailleurs.

Le script vient d'un domaine tiers et peut ne jamais répondre. Un `MutationObserver`
surveille la div : tant qu'aucun iframe n'est apparu, la modale affiche un état
d'attente, et au bout de 5 secondes un lien de repli vers Whop — qui **disparaît** dès
que le formulaire s'affiche, parce que proposer une sortie à côté d'un paiement qui
marche ne fait que tenter le client de partir.

### Le piège de l'email

Whop pré-remplit l'adresse du compte **Whop** du client, qui n'est souvent pas celle de
son compte ici. Or c'est l'email qui rattache un paiement à un compte. La modale affiche
donc l'avertissement **au-dessus** du formulaire (en dessous, il est lu après avoir
rempli), et la colonne `users.billing_email` rattrape ceux qui ont payé avec une autre
adresse.

### Trois chemins d'octroi, un seul journal

L'accès payant est accordé **uniquement côté serveur**, par trois chemins qui passent
tous par `grantFromMembership()` :

1. **Webhook** (`/api/webhooks/whop`) — la source de vérité. Signature HMAC-SHA256
   vérifiée en temps constant, traitement idempotent par identifiant de livraison.
   Le compte est retrouvé via `metadata[user_id]`, avec repli sur l'email de compte
   **et** l'email de facturation.
2. **« J'ai déjà payé »** (`/api/billing/recover`) — interroge l'API Whop pour les
   adresses du compte. Si rien n'est trouvé, la page demande l'adresse utilisée pour
   payer, l'enregistre, et retente. Un webhook est un point de panne unique : sans ce
   bouton, un client qui a payé reste bloqué sans que personne le sache.
3. **Réconciliation quotidienne** (`/api/cron/reconcile-billing`, `vercel.json`) —
   confronte tous les abonnements valides aux comptes. C'est le seul chemin qui ne
   dépend de rien : ni d'une livraison qui arrive, ni d'un client qui pense à cliquer.
   Protégé par `CRON_SECRET`, comparé en temps constant ; sans secret, la route refuse.

Une **clé de licence** (`/billing/verify`) reste disponible en dernier recours.

Règles tenues sur les trois chemins :

- c'est la réponse de Whop qui accorde l'accès, jamais une déclaration du client ;
- la route agit sur le compte de la session — un identifiant reçu dans la requête
  laisserait n'importe qui débloquer le compte d'un autre ;
- chaque octroi passe par le journal `plan_grants`, dont la clé unique est
  `membership_id:date_de_renouvellement`. Revenir sur la page ne crédite pas deux fois,
  un renouvellement crédite bien à nouveau, et une adhésion déjà créditée à un compte
  **ne peut pas** être réclamée par un autre.

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
│   ├── result/[id]/             maquette du site, puis prompt + paywall
│   ├── pricing/  faq/  legal/   pages publiques
│   ├── dashboard/               espace connecté
│   ├── admin/                   back-office : liste des inscrits
│   ├── ideas/                   catalogue d'idées (Pro)
│   ├── guide/                   guide brief → site en ligne (Pro)
│   ├── billing/verify/          récupération de licence
│   ├── api/billing/recover/     « J'ai déjà payé » : interroge Whop
│   ├── api/cron/reconcile-billing/  rattrapage quotidien
│   └── api/                     auth, generate, reviews, billing, webhooks, health
├── components/                  UI (serveur + client)
├── lib/
│   ├── prompt-engine.ts         le moteur : questions → brief, périmètre, branchements
│   ├── site-preview.ts          le moteur visuel : questions → maquette (+ redactModel)
│   ├── questions.ts             schéma du questionnaire + validation serveur
│   ├── color.ts                 dérivation de palette, contraste WCAG
│   ├── markdown.ts              rendu Markdown (échappement avant transformation)
│   ├── db.ts                    stockage : Postgres (postgres.js) ou mémoire
│   ├── auth.ts                  scrypt + sessions JWT
│   ├── plans.ts                 capacités et quotas par plan
│   ├── ideas.ts                 catalogue d'idées (vide par défaut)
│   ├── whop.ts                  catalogue de plans, webhook, licences, adhésions
│   ├── billing.ts               octroi d'accès idempotent, partagé par les 3 chemins
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
