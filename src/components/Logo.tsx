import Link from "next/link";

/** Three rising bars under an upward arrow: growth, step by step. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 items-center justify-center rounded-[10px]"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(140deg, #6ee7b7 0%, #10b981 55%, #047857 120%)",
        boxShadow: "0 6px 18px -6px rgba(16,185,129,0.7), inset 0 1px 0 rgba(255,255,255,0.35)",
      }}
    >
      <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 64 64" fill="none">
        <g fill="#060807">
          <rect x="10" y="40" width="10" height="14" rx="2.5" />
          <rect x="27" y="31" width="10" height="23" rx="2.5" />
          <rect x="44" y="22" width="10" height="32" rx="2.5" />
        </g>
        <path
          d="M8 30 25 15l9 7L52 7"
          stroke="#060807"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M43 6h10v10" stroke="#060807" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Logo({ size = 32, href = "/" }: { size?: number; href?: string | null }) {
  const content = (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="font-display text-[18px] font-bold tracking-tight text-white">
        Scale<span className="text-brand-400">Biz</span>
      </span>
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} className="rounded-lg transition-opacity hover:opacity-85" aria-label="ScaleBiz, accueil">
      {content}
    </Link>
  );
}
