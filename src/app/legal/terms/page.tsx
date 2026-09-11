import type { Metadata } from "next";
import { LegalPage, LegalSection, Placeholder } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Les conditions d'utilisation du service RepositSaaS.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Conditions d'utilisation" updated="11 septembre 2026">
      <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-[13.5px] text-amber-100">
        Ce document est un modèle de départ. Les champs surlignés doivent être complétés avec tes
        informations réelles, et le texte relu par un juriste avant toute mise en ligne commerciale.
      </p>

      <LegalSection title="1. Éditeur du service">
        <p>
          Le service RepositSaaS est édité par <Placeholder>[Raison sociale]</Placeholder>,{" "}
          <Placeholder>[forme juridique]</Placeholder>, immatriculée sous le numéro{" "}
          <Placeholder>[SIREN / numéro d&apos;immatriculation]</Placeholder>, dont le siège est situé{" "}
          <Placeholder>[adresse]</Placeholder>. Contact : <Placeholder>[email de contact]</Placeholder>.
        </p>
      </LegalSection>

      <LegalSection title="2. Objet du service">
        <p>
          RepositSaaS génère, à partir des réponses fournies par l&apos;utilisateur, un document de
          spécification destiné à être utilisé avec un assistant de développement. Le service fournit un
          document ; il ne fournit ni code fonctionnel, ni conseil juridique, ni conseil financier, ni
          garantie de résultat commercial.
        </p>
      </LegalSection>

      <LegalSection title="3. Compte utilisateur">
        <p>
          La création d&apos;un compte requiert une adresse email valide et un mot de passe. Tu es
          responsable de la confidentialité de tes identifiants et de toute activité effectuée depuis ton
          compte. Un compte par personne ; les comptes partagés peuvent être suspendus.
        </p>
      </LegalSection>

      <LegalSection title="4. Accès payant">
        <p>
          Une partie du contenu généré est accessible gratuitement. L&apos;accès au document complet
          nécessite un plan actif, payé via Whop. L&apos;accès est accordé après confirmation du paiement
          par le prestataire. Les abonnements se renouvellent automatiquement jusqu&apos;à résiliation,
          qui s&apos;effectue depuis ton compte Whop.
        </p>
      </LegalSection>

      <LegalSection title="5. Propriété des contenus">
        <p>
          Les idées et réponses que tu saisis restent ta propriété. Le document généré à partir de ces
          réponses t&apos;appartient : tu peux l&apos;utiliser, le modifier et l&apos;exploiter
          commercialement sans restriction. Le moteur de génération, l&apos;interface et la marque
          RepositSaaS restent la propriété de l&apos;éditeur.
        </p>
      </LegalSection>

      <LegalSection title="6. Usages interdits">
        <p>
          Sont interdits : la revente ou la redistribution automatisée des documents générés en tant que
          service concurrent, l&apos;extraction automatisée du service, toute tentative de contournement
          du paiement, et l&apos;utilisation du service pour concevoir un produit illicite.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitation de responsabilité">
        <p>
          Le service est fourni « en l&apos;état ». Les estimations chiffrées produites (nombre de clients,
          churn, LTV, CAC, trafic) reposent sur des moyennes de marché publiques et ne constituent pas une
          prévision de tes résultats. L&apos;éditeur ne peut être tenu responsable des décisions
          commerciales, techniques ou financières prises sur la base d&apos;un document généré.
        </p>
        <p>
          Dans la limite autorisée par la loi, la responsabilité de l&apos;éditeur est plafonnée au montant
          effectivement payé par l&apos;utilisateur au cours des douze derniers mois.
        </p>
      </LegalSection>

      <LegalSection title="8. Suspension et résiliation">
        <p>
          Tu peux supprimer ton compte à tout moment en nous écrivant. L&apos;éditeur peut suspendre un
          compte en cas de violation des présentes conditions, de fraude au paiement ou d&apos;usage
          abusif du service.
        </p>
      </LegalSection>

      <LegalSection title="9. Droit applicable">
        <p>
          Les présentes conditions sont régies par le droit <Placeholder>[pays applicable]</Placeholder>.
          Tout litige relève de la compétence des tribunaux de <Placeholder>[ville]</Placeholder>, sous
          réserve des dispositions protectrices applicables aux consommateurs.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
