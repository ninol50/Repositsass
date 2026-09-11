import type { Metadata } from "next";
import { LegalPage, LegalSection, Placeholder } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Quelles données RepositSaaS collecte, pourquoi, et pendant combien de temps.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Politique de confidentialité" updated="11 septembre 2026">
      <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-[13.5px] text-amber-100">
        Modèle de départ à compléter avec tes informations réelles avant toute mise en ligne commerciale.
      </p>

      <LegalSection title="Responsable du traitement">
        <p>
          <Placeholder>[Raison sociale]</Placeholder>, <Placeholder>[adresse]</Placeholder>. Pour toute
          question relative à tes données : <Placeholder>[email de contact]</Placeholder>.
        </p>
      </LegalSection>

      <LegalSection title="Données collectées">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-white">Compte :</strong> adresse email et empreinte du mot de passe
            (hachée avec scrypt et un sel unique — le mot de passe en clair n&apos;est jamais stocké).
          </li>
          <li>
            <strong className="text-white">Contenu :</strong> les réponses au questionnaire et les briefs
            générés, conservés pour que tu puisses les rouvrir.
          </li>
          <li>
            <strong className="text-white">Paiement :</strong> identifiant d&apos;abonnement et statut du
            plan transmis par Whop. Aucune donnée bancaire ne transite par nos serveurs.
          </li>
          <li>
            <strong className="text-white">Avis :</strong> le nom d&apos;affichage et le texte que tu
            publies volontairement.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Ce que nous ne faisons pas">
        <p>
          Tes idées ne sont envoyées à aucun fournisseur de modèle d&apos;IA : la génération est
          entièrement locale à notre serveur et déterministe. Nous ne vendons pas tes données et nous ne
          les utilisons pas pour entraîner quoi que ce soit.
        </p>
      </LegalSection>

      <LegalSection title="Bases légales">
        <p>
          Exécution du contrat (fourniture du service et gestion de l&apos;abonnement), intérêt légitime
          (sécurité du service, prévention de la fraude), consentement (publication d&apos;un avis).
        </p>
      </LegalSection>

      <LegalSection title="Durées de conservation">
        <p>
          Compte et briefs : tant que le compte existe, puis 30 jours après la demande de suppression.
          Données de facturation : conservées selon la durée légale applicable. Avis publiés : jusqu&apos;à
          leur retrait à ta demande.
        </p>
      </LegalSection>

      <LegalSection title="Sous-traitants">
        <ul className="list-disc space-y-2 pl-5">
          <li>Hébergement de l&apos;application : <Placeholder>[Vercel ou ton hébergeur]</Placeholder></li>
          <li>Base de données : <Placeholder>[Neon, Vercel Postgres, ...]</Placeholder></li>
          <li>Paiement : Whop</li>
        </ul>
      </LegalSection>

      <LegalSection title="Tes droits">
        <p>
          Tu disposes d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de portabilité, de
          limitation et d&apos;opposition. Écris à <Placeholder>[email de contact]</Placeholder> depuis
          l&apos;adresse de ton compte : nous répondons sous 30 jours. Tu peux également saisir
          l&apos;autorité de contrôle compétente.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Un seul cookie est déposé : le cookie de session (<code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[13px]">rs_session</code>), strictement
          nécessaire au fonctionnement de la connexion. Il est <em>httpOnly</em>, <em>SameSite=Lax</em>, et
          expire au bout de 30 jours. Aucun cookie publicitaire n&apos;est utilisé.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
