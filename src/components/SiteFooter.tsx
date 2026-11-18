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
              Quatre questions, cinq business classés selon ton profil et ton objectif.
              Trouve celui qui est fait pour toi, puis fais-le grandir.
            </p>
          </div>

          <div>
            <p className="mb-3 text-[12px] font-medium uppercase tracking-wider text-ink-500">Produit</p>
            <ul className="space-y-2.5 text-[13.5px] text-ink-400">
              <li><Link href="/#questionnaire" className="hover:text-white">Le questionnaire</Link></li>
              <li><Link href="/pricing" className="hover:text-white">Offres</Link></li>
              <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
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
          <p>© {new Date().getFullYear()} ScaleBiz. Tous droits réservés.</p>
          <p>Les revenus affichés sont des ordres de grandeur, pas une garantie de résultat.</p>
        </div>
      </div>
    </footer>
  );
}
