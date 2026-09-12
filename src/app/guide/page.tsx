import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { CopyBlock } from "@/components/CopyBlock";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Alert, Badge, ButtonLink, SectionHeading } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { capabilitiesFor } from "@/lib/plans";
import { hasActivePlan } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guide complet",
  description:
    "De ton brief à ton SaaS en ligne : payer Claude Code, l'installer, brancher les connecteurs MCP, coller le prompt et suivre ce qu'il reste à faire.",
};

/**
 * Every command here is quoted verbatim from the official Claude Code docs
 * (code.claude.com/docs). Prices are deliberately not reproduced — they change,
 * and a guide that quotes a stale price becomes a support ticket. We link to
 * the pricing page instead.
 */

export default async function GuidePage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/guide");

  const caps = capabilitiesFor(user.plan, hasActivePlan(user));
  if (!caps.guide) return <Upsell />;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[30px] font-semibold tracking-tight text-white sm:text-[40px]">
            De ton brief au SaaS en ligne
          </h1>
          <Badge>
            <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
            Pro
          </Badge>
        </div>
        <p className="mt-4 text-[15.5px] leading-relaxed text-ink-400">
          Sept étapes, dans l&apos;ordre. Chaque commande est copiable et vient de la documentation
          officielle de Claude Code. Compte environ une heure pour la première fois, dix minutes les
          suivantes.
        </p>

        <nav className="surface-flat mt-10 p-5">
          <p className="text-[12px] uppercase tracking-wider text-ink-500">Les étapes</p>
          <ol className="mt-3 space-y-1.5">
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex gap-3 text-[13.5px] text-ink-300 transition-colors hover:text-white"
                >
                  <span className="font-mono text-[12px] text-ink-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-14 space-y-16">
          {STEPS.map((s, i) => (
            <Step key={s.id} id={s.id} n={i + 1} title={s.title} lead={s.lead}>
              {s.body}
            </Step>
          ))}
        </div>

        <div className="surface mt-16 p-8 text-center">
          <h2 className="font-display text-[20px] font-semibold text-white">Bloqué quelque part ?</h2>
          <p className="mx-auto mt-2.5 max-w-md text-[14px] leading-relaxed text-ink-400">
            La documentation officielle couvre chaque surface en détail, et le canal le plus rapide
            reste de demander à Claude Code lui-même : il lit ton projet.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/brief" variant="brand">
              Générer un nouveau brief
            </ButtonLink>
            <a
              href="https://code.claude.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/12 px-5 text-[14px] text-white transition-colors hover:bg-white/[0.05]"
            >
              Documentation Claude Code
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function Step({
  id,
  n,
  title,
  lead,
  children,
}: {
  id: string;
  n: number;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-[13px] font-semibold tracking-widest text-brand-400">
          {String(n).padStart(2, "0")}
        </span>
        <h2 className="font-display text-[23px] font-semibold tracking-tight text-white sm:text-[27px]">
          {title}
        </h2>
      </div>
      <p className="mt-3 text-[14.5px] leading-relaxed text-ink-400">{lead}</p>
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-[14.5px] leading-relaxed text-ink-300">{children}</p>;
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-300 underline underline-offset-4 hover:text-brand-200"
    >
      {children}
    </a>
  );
}

const STEPS: { id: string; title: string; lead: string; body: ReactNode }[] = [
  {
    id: "acces",
    title: "Payer et accéder à Claude Code",
    lead: "Claude Code demande soit un abonnement Claude, soit un compte Anthropic Console facturé à l'usage. Les deux marchent.",
    body: (
      <>
        <P>
          <strong className="text-white">Option 1 — abonnement Claude.</strong> C&apos;est le chemin
          le plus simple : un montant fixe par mois, pas de facture à surveiller. Les plans et leurs
          prix sont sur <Ext href="https://claude.com/pricing">claude.com/pricing</Ext>.
        </P>
        <P>
          <strong className="text-white">Option 2 — API à l&apos;usage.</strong> Tu crées un compte
          sur <Ext href="https://platform.claude.com/">platform.claude.com</Ext>, tu génères une clé
          API et tu la mets dans ton terminal. Tu paies ce que tu consommes, ce qui peut être moins
          cher si tu codes deux heures par semaine, et beaucoup plus cher si tu codes tous les jours.
        </P>
        <CopyBlock
          label="option 2 seulement — clé API"
          code={`export ANTHROPIC_API_KEY="sk-ant-..."`}
        />
        <Alert tone="info">
          Avec la variable <code>ANTHROPIC_API_KEY</code> définie, Claude Code saute l&apos;écran de
          connexion et te demande simplement d&apos;approuver la clé. Sans elle, il te fait te
          connecter à ton compte Claude au premier lancement.
        </Alert>
      </>
    ),
  },
  {
    id: "installer",
    title: "Installer Claude Code",
    lead: "Une seule commande selon ton système. L'installation native se met à jour toute seule.",
    body: (
      <>
        <CopyBlock label="macOS, Linux, WSL" code={`curl -fsSL https://claude.ai/install.sh | bash`} />
        <CopyBlock label="Windows PowerShell" code={`irm https://claude.ai/install.ps1 | iex`} language="powershell" />
        <P>Ou par gestionnaire de paquets, si tu préfères :</P>
        <CopyBlock label="Homebrew (macOS)" code={`brew install --cask claude-code`} />
        <CopyBlock label="WinGet (Windows)" code={`winget install Anthropic.ClaudeCode`} language="powershell" />
        <P>
          Tu n&apos;as pas envie d&apos;installer quoi que ce soit ? Claude Code tourne aussi dans le
          navigateur sur <Ext href="https://claude.ai/code">claude.ai/code</Ext>, et il existe une
          application de bureau ainsi que des extensions VS Code et JetBrains. Le moteur est le même
          partout.
        </P>
      </>
    ),
  },
  {
    id: "projet",
    title: "Créer le dossier du projet",
    lead: "Claude Code travaille dans le dossier depuis lequel tu le lances. Un dossier vide, un projet.",
    body: (
      <>
        <CopyBlock
          label="terminal"
          code={`mkdir mon-saas
cd mon-saas
claude`}
        />
        <P>
          Au premier lancement il te demande de te connecter. Ensuite tu obtiens une invite de
          commande : c&apos;est là que le brief se colle.
        </P>
        <Alert tone="warning">
          Lance-le dans un dossier <strong>vide</strong>. Dans un dossier qui contient déjà un autre
          projet, il lira ce projet et construira par-dessus.
        </Alert>
      </>
    ),
  },
  {
    id: "coller",
    title: "Coller ton brief",
    lead: "C'est l'étape centrale, et elle tient en un copier-coller.",
    body: (
      <>
        <P>
          Ouvre ton brief depuis <strong className="text-white">Mes briefs</strong>, clique{" "}
          <strong className="text-white">Copier le brief complet</strong>, puis colle-le dans
          l&apos;invite de Claude Code et valide.
        </P>
        <P>
          Le brief commence par une section <em>« Ton rôle »</em> qui lui donne ses règles : tout doit
          compiler, aucune donnée inventée dans l&apos;interface, aucun secret en dur, et il doit te
          dire si une instruction lui paraît techniquement mauvaise au lieu de l&apos;appliquer
          bêtement. Tu n&apos;as rien à ajouter.
        </P>
        <P>
          Il va te poser des questions et lancer des commandes. Lis ce qu&apos;il propose avant
          d&apos;approuver — c&apos;est ton projet, pas le sien.
        </P>
      </>
    ),
  },
  {
    id: "connecteurs",
    title: "Brancher les connecteurs MCP",
    lead: "MCP est le standard qui permet à Claude Code de parler à tes outils : dépôt de code, hébergement, base de données, paiement.",
    body: (
      <>
        <P>
          Un connecteur s&apos;ajoute en une commande. Deux formes selon le type de serveur —{" "}
          <strong className="text-white">distant</strong> (une URL fournie par le service) ou{" "}
          <strong className="text-white">local</strong> (un programme qui tourne sur ta machine) :
        </P>
        <CopyBlock
          label="serveur distant — la forme la plus courante"
          code={`claude mcp add --transport http <nom> <url>`}
        />
        <CopyBlock
          label="serveur local"
          code={`claude mcp add --transport stdio <nom> -- <commande> [arguments]`}
        />
        <P>
          <strong className="text-white">Où trouver l&apos;URL ?</strong> Sur la page MCP du service
          concerné — chaque fournisseur publie la sienne. Ne la devine pas, va la chercher. Exemple
          tiré de la documentation officielle :
        </P>
        <CopyBlock label="exemple documenté" code={`claude mcp add --transport http notion https://mcp.notion.com/mcp`} />
        <P>
          <strong className="text-white">Choisir la portée.</strong> Par défaut le connecteur ne vaut
          que pour le projet courant. <code>--scope user</code> le rend disponible dans tous tes
          projets, <code>--scope project</code> le partage avec ton équipe via un fichier{" "}
          <code>.mcp.json</code> versionné.
        </P>
        <CopyBlock label="disponible partout" code={`claude mcp add --transport http <nom> --scope user <url>`} />
        <P>
          <strong className="text-white">S&apos;authentifier.</strong> La plupart des connecteurs
          passent par OAuth. Tape <code>/mcp</code> dans Claude Code et suis les étapes dans ton
          navigateur, ou lance la connexion depuis le terminal :
        </P>
        <CopyBlock
          label="authentification"
          code={`claude mcp login <nom>

# en SSH ou sans navigateur
claude mcp login <nom> --no-browser`}
        />
        <P>
          <strong className="text-white">Quand un service demande une clé</strong> plutôt
          qu&apos;OAuth, elle se passe en en-tête ou en variable d&apos;environnement :
        </P>
        <CopyBlock
          label="avec un jeton"
          code={`claude mcp add --transport http <nom> <url> \\
  --header "Authorization: Bearer TON_JETON"

claude mcp add --env API_KEY=TA_CLE --transport stdio <nom> -- <commande>`}
        />
        <P>Pour vérifier, lister et retirer :</P>
        <CopyBlock
          label="gestion"
          code={`claude mcp list          # tous les connecteurs configurés
claude mcp get <nom>     # le détail de l'un d'eux
claude mcp remove <nom>  # le retirer
/mcp                     # leur état, depuis Claude Code`}
        />
        <Alert tone="warning">
          Un connecteur donne à Claude Code un accès réel à ce service. N&apos;ajoute que ceux dont tu
          as besoin, et relis ce qu&apos;il te propose avant d&apos;approuver une action qui écrit
          quelque part.
        </Alert>
      </>
    ),
  },
  {
    id: "reste-a-faire",
    title: "Obtenir la liste de ce qu'il reste à faire",
    lead: "Le brief se termine sur une definition of done. Fais-la vérifier point par point plutôt que de deviner où tu en es.",
    body: (
      <>
        <P>
          Quand Claude Code annonce qu&apos;il a fini, ne le crois pas sur parole. Colle exactement
          ceci :
        </P>
        <CopyBlock
          label="à coller dans Claude Code"
          language="text"
          code={`Reprends la section « Definition of done » du brief et vérifie
chaque point un par un dans le code réel, pas de mémoire.

Rends-moi un tableau à trois colonnes :
  fait  |  à moitié fait  |  pas commencé

Pour chaque ligne non terminée, indique le fichier concerné et
ce qu'il reste précisément à écrire. Puis lance le build et
colle-moi la sortie, même si elle échoue.

Ne dis pas qu'un point est fait sans l'avoir vérifié.`}
        />
        <P>
          Tu obtiens un état réel plutôt qu&apos;un « c&apos;est terminé » optimiste. Répète cette
          demande après chaque grosse étape : c&apos;est le meilleur garde-fou contre un projet qui
          paraît fini et ne l&apos;est pas.
        </P>
        <P>
          Deux autres commandes utiles au quotidien : <code>/clear</code> pour repartir sur un
          contexte propre entre deux tâches sans rien perdre du code, et un fichier{" "}
          <code>CLAUDE.md</code> à la racine du projet pour y écrire tes règles — Claude Code le lit
          au début de chaque session.
        </P>
      </>
    ),
  },
  {
    id: "deployer",
    title: "Mettre en ligne",
    lead: "Un projet qui n'est pas déployé n'existe pas. Le brief te fait déployer dès le premier jour, même une page blanche.",
    body: (
      <>
        <CopyBlock
          label="à coller dans Claude Code"
          language="text"
          code={`Mets ce projet en ligne :
1. initialise git et pousse le dépôt sur GitHub
2. importe-le sur Vercel et déploie
3. liste les variables d'environnement que je dois renseigner,
   avec pour chacune où aller la chercher
4. dis-moi comment vérifier que le déploiement fonctionne`}
        />
        <P>
          Il te restera les variables d&apos;environnement à coller toi-même : ce sont tes secrets,
          personne d&apos;autre ne peut le faire à ta place. Demande-lui la liste exacte plutôt que de
          la deviner.
        </P>
        <Alert tone="info">
          Une fois en ligne, refais l&apos;étape 6. C&apos;est le moment où l&apos;écart entre « ça
          tourne sur ma machine » et « ça tourne en production » apparaît.
        </Alert>
      </>
    ),
  },
];

function Upsell() {
  const perks = [
    "Les commandes exactes pour installer et payer Claude Code",
    "Comment brancher chaque connecteur MCP, avec l'authentification",
    "Le prompt à coller pour obtenir la liste de ce qu'il reste à faire",
    "La procédure de mise en ligne, étape par étape",
  ];

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-24">
        <SectionHeading
          eyebrow="Réservé aux plans Pro et Max"
          title="Le guide complet, du brief au site en ligne"
          description="Avoir le brief est une chose, savoir quoi en faire en est une autre. Ce guide couvre les sept étapes, avec chaque commande copiable et vérifiée sur la documentation officielle."
        />

        <div className="surface mt-12 p-8 sm:p-10">
          <ul className="space-y-3.5">
            {perks.map((p) => (
              <li key={p} className="flex gap-3 text-[14.5px] leading-snug text-ink-200">
                <svg className="mt-1 shrink-0 text-mint-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {p}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/pricing" variant="brand" size="lg" className="flex-1">
              Passer au plan Pro
            </ButtonLink>
            <ButtonLink href="/dashboard" variant="outline" size="lg" className="flex-1">
              Retour à mes briefs
            </ButtonLink>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
