import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.07] bg-ink-950">
      <div className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-ink-400">
              Un questionnaire, un brief de construction complet, prêt à coller dans Claude Code.
              Pas de génération approximative : des specs, des tokens et des chiffres.
            </p>
          </div>

          <div>
            <p className="mb-3 text-[12px] font-medium uppercase tracking-wider text-ink-500">Produit</p>
            <ul className="space-y-2.5 text-[13.5px] text-ink-400">
              <li><Link href="/brief" className="hover:text-white">Générer un brief</Link></li>
              <li><Link href="/pricing" className="hover:text-white">Tarifs</Link></li>
              <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
              <li><Link href="/#avis" className="hover:text-white">Avis</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-[12px] font-medium uppercase tracking-wider text-ink-500">Légal</p>
            <ul className="space-y-2.5 text-[13.5px] text-ink-400">
              <li><Link href="/legal/terms" className="hover:text-white">Conditions d&apos;utilisation</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white">Confidentialité</Link></li>
              <li><Link href="/legal/refund" className="hover:text-white">Remboursement</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-[12.5px] text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} RepositSaaS. Tous droits réservés.</p>
          <p>
            Paiements traités par Whop. RepositSaaS n&apos;est affilié ni à Anthropic ni à Claude.
          </p>
        </div>
      </div>
    </footer>
  );
}
