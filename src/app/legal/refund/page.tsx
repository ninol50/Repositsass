import type { Metadata } from "next";
import { LegalPage, LegalSection, Placeholder } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Politique de remboursement",
  description: "Les conditions de remboursement de RepositSaaS, sans formulation ambiguë.",
};

export default function RefundPage() {
  return (
    <LegalPage title="Politique de remboursement" updated="11 septembre 2026">
      <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-[13.5px] text-amber-100">
        Modèle de départ. Vérifie sa compatibilité avec les conditions de Whop et avec le droit de
        rétractation applicable à ta juridiction avant mise en ligne.
      </p>

      <LegalSection title="Le principe">
        <p>
          Tu peux demander le remboursement intégral de ton premier paiement dans les 7 jours, sans avoir
          à te justifier. Écris à <Placeholder>[email de contact]</Placeholder> depuis l&apos;adresse email
          de ton compte.
        </p>
      </LegalSection>

      <LegalSection title="La limite, dite clairement">
        <p>
          Le remboursement couvre un usage d&apos;évaluation. Au-delà de 10 briefs complets débloqués sur
          la période, la demande peut être refusée : à ce stade, le service a été consommé, pas évalué.
        </p>
      </LegalSection>

      <LegalSection title="Renouvellements">
        <p>
          Les renouvellements d&apos;abonnement ne sont pas remboursés rétroactivement. Résilie depuis ton
          compte Whop avant la date de renouvellement : l&apos;accès reste actif jusqu&apos;à la fin de la
          période déjà payée.
        </p>
      </LegalSection>

      <LegalSection title="Plan Lifetime">
        <p>
          Le plan à paiement unique suit la même règle de 7 jours. Passé ce délai, il n&apos;est pas
          remboursable.
        </p>
      </LegalSection>

      <LegalSection title="Délai de traitement">
        <p>
          Les remboursements sont traités par Whop, généralement sous 5 à 10 jours ouvrés selon ton moyen
          de paiement. Nous confirmons chaque demande par email.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
