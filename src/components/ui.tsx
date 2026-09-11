import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50";

const SIZES = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-[14px]",
  lg: "h-[52px] px-7 text-[15px]",
} as const;

const VARIANTS = {
  primary:
    "bg-white text-ink-950 hover:bg-ink-100 active:scale-[0.985] shadow-[0_8px_24px_-10px_rgba(255,255,255,0.35)]",
  brand:
    "text-white glow-brand hover:brightness-110 active:scale-[0.985] bg-[linear-gradient(120deg,#8f6fff,#6a45f5)]",
  ghost: "text-ink-200 hover:bg-white/[0.06] hover:text-white",
  outline: "border border-white/12 text-white hover:border-white/25 hover:bg-white/[0.04]",
  danger: "border border-red-500/30 text-red-300 hover:bg-red-500/10",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string) {
  return cx(BASE, SIZES[size], VARIANTS[variant], extra);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-[12px] text-ink-300",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
}) {
  return (
    <div className={cx("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && (
        <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-brand-300">{eyebrow}</p>
      )}
      <h2 className="font-display text-[28px] font-semibold leading-[1.15] tracking-tight text-white sm:text-[38px]">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-[15px] leading-relaxed text-ink-400 sm:text-[16px]">{description}</p>
      )}
    </div>
  );
}

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" aria-hidden>
          <path
            d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.22l-4.94 2.6.94-5.5-4-3.9 5.53-.8L10 1.6z"
            fill={i <= Math.round(rating) ? "#f2b441" : "rgba(255,255,255,0.14)"}
          />
        </svg>
      ))}
    </span>
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success" | "warning";
  children: ReactNode;
}) {
  const tones = {
    info: "border-brand-500/25 bg-brand-500/[0.08] text-brand-100",
    error: "border-red-500/25 bg-red-500/[0.08] text-red-200",
    success: "border-mint-500/25 bg-mint-500/[0.08] text-mint-400",
    warning: "border-amber-500/25 bg-amber-500/[0.08] text-amber-200",
  } as const;
  return (
    <div className={cx("rounded-xl border px-4 py-3 text-[13.5px] leading-relaxed", tones[tone])}>
      {children}
    </div>
  );
}
