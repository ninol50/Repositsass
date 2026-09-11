import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { ReviewForm } from "./ReviewForm";
import { SectionHeading, Stars } from "./ui";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export async function ReviewsSection() {
  const store = getStore();
  const [reviews, stats, user] = await Promise.all([
    store.listReviews(9),
    store.reviewStats(),
    currentUser(),
  ]);
  const existing = user ? await store.getReviewByUser(user.id) : null;

  return (
    <section id="avis" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-20 sm:py-28">
      <SectionHeading
        eyebrow="Avis"
        title="Ce que disent les gens qui l'utilisent"
        description={
          stats.count > 0
            ? `${stats.count} avis publiés par des comptes vérifiés. Aucun avis n'est écrit par nous.`
            : "Les avis ci-dessous viennent uniquement de comptes clients réels. Tant que personne n'en a laissé, cette section reste vide — on n'invente pas de témoignages."
        }
      />

      {stats.count > 0 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <Stars rating={stats.average} size={18} />
          <span className="text-[15px] font-medium text-white">{stats.average.toFixed(1)}</span>
          <span className="text-[13.5px] text-ink-500">sur {stats.count} avis</span>
        </div>
      )}

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {reviews.length === 0 ? (
            <div className="surface-flat flex h-full min-h-[220px] flex-col items-center justify-center p-10 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.09] text-ink-500">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-[15px] font-medium text-white">Pas encore d&apos;avis</p>
              <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-ink-400">
                RepositSaaS vient d&apos;ouvrir. Le premier avis publié ici sera celui d&apos;un vrai
                client, avec son compte vérifié — pas une citation inventée.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {reviews.map((r) => (
                <figure key={r.id} className="surface-flat flex flex-col p-5">
                  <Stars rating={r.rating} />
                  <blockquote className="mt-3 flex-1 text-[14px] leading-relaxed text-ink-200">
                    {r.body}
                  </blockquote>
                  <figcaption className="mt-4 flex items-center gap-3 border-t border-white/[0.07] pt-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-[11.5px] font-medium text-brand-200">
                      {initials(r.authorName)}
                    </span>
                    <span className="text-[13px] text-ink-300">{r.authorName}</span>
                    <span className="ml-auto text-[12px] text-ink-600">{formatDate(r.createdAt)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>

        <div>
          {user ? (
            <ReviewForm
              existing={existing ? { rating: existing.rating, body: existing.body, authorName: existing.authorName } : null}
              defaultName={user.email.split("@")[0]}
            />
          ) : (
            <div className="surface-flat p-6">
              <p className="text-[14.5px] font-medium text-white">Tu utilises RepositSaaS ?</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
                Seuls les comptes enregistrés peuvent laisser un avis, et un compte ne peut en publier
                qu&apos;un seul. C&apos;est ce qui rend cette section lisible.
              </p>
              <Link
                href="/login"
                className="mt-5 inline-flex h-10 items-center rounded-xl border border-white/12 px-4 text-[13.5px] text-white transition-colors hover:bg-white/[0.05]"
              >
                Se connecter pour laisser un avis
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
