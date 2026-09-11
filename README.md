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
à l'affichage.

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
| `DATABASE_URL` | oui en prod | Postgres (Neon, Vercel Postgres, Supabase). Les tables sont créées au premier appel. |
| `NEXT_PUBLIC_SITE_URL` | recommandé | Métadonnées, sitemap, robots.txt. |
| `WHOP_PLAN_STARTER_ID` / `_PRO_ID` / `_LIFETIME_ID` | pour vendre | Construit les liens de checkout. |
| `WHOP_PLAN_*_URL` | optionnel | URL de checkout complètes, prioritaires sur les ID. |
| `WHOP_WEBHOOK_SECRET` | pour vendre | Sans lui, **tous** les webhooks sont rejetés et aucun accès n'est accordé. |
| `WHOP_API_KEY` | optionnel | Active la vérification manuelle de licence sur `/billing/verify`. |

---

## Déploiement sur Vercel

1. Pousser le dépôt sur GitHub, puis importer le projet dans Vercel.
2. Créer une base : **Storage → Postgres** (ou Neon), et copier l'URL dans `DATABASE_URL`.
3. Renseigner `AUTH_SECRET` et `NEXT_PUBLIC_SITE_URL`.
4. Déployer, puis ouvrir `https://<domaine>/api/health` pour vérifier qu'il ne reste
   aucun avertissement.
5. Côté Whop : créer les plans, coller leurs ID, et pointer le webhook sur
   `https://<domaine>/api/webhooks/whop` avec le secret correspondant.

Aucune commande de migration à lancer : le schéma se crée tout seul au premier appel
à la base (`CREATE TABLE IF NOT EXISTS`).

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
│   ├── billing/verify/          récupération de licence
│   └── api/                     auth, generate, reviews, billing, webhooks, health
├── components/                  UI (serveur + client)
├── lib/
│   ├── prompt-engine.ts         le moteur : questions → brief
│   ├── questions.ts             schéma du questionnaire + validation serveur
│   ├── color.ts                 dérivation de palette, contraste WCAG
│   ├── markdown.ts              rendu Markdown (échappement avant transformation)
│   ├── db.ts                    stockage : driver Postgres ou mémoire
│   ├── auth.ts                  scrypt + sessions JWT
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

## Ce qui reste à faire

- [ ] Réinitialisation de mot de passe et vérification d'email
- [ ] Suppression de compte en self-service
- [ ] Limitation de débit sur un store partagé
- [ ] Page de gestion d'abonnement (aujourd'hui : lien vers Whop)
- [ ] Analytics produit (activation, passage payant, churn)
- [ ] Compléter les pages légales : identité de l'éditeur, juridiction, contact
