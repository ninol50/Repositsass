import Link from "next/link";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 items-center justify-center rounded-[10px]"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(140deg, #8f6fff 0%, #6a45f5 55%, #22cfa8 140%)",
        boxShadow: "0 6px 18px -6px rgba(124,92,255,0.7), inset 0 1px 0 rgba(255,255,255,0.35)",
      }}
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0b0b12"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* stacked layers = the repository */}
        <path d="M4 7.5 12 3.5l8 4-8 4-8-4Z" />
        <path d="M4 12.5 12 16.5l8-4" />
        {/* the spark = the generated idea */}
        <path d="M12 18.5v3M9.6 20.2l1.2.9M14.4 20.2l-1.2.9" opacity="0.75" />
      </svg>
    </span>
  );
}

export function Logo({ size = 32, href = "/" }: { size?: number; href?: string | null }) {
  const content = (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="font-display text-[17px] font-semibold tracking-tight text-white">
        Reposit<span className="text-brand-300">SaaS</span>
      </span>
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} className="rounded-lg transition-opacity hover:opacity-85">
      {content}
    </Link>
  );
}
