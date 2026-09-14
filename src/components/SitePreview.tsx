import type { SitePreviewModel } from "@/lib/site-preview";

/**
 * A rendered mockup of the site the brief describes.
 *
 * Everything is inline-styled from the derived palette so the preview really
 * shows the user's colour, typography and interface style — not this site's.
 * No invented figures: the metric slots stay empty, exactly as the brief
 * instructs Claude Code to leave them until real data exists.
 *
 * `redacted` is the paywalled rendering. It is not a CSS blur over real text:
 * every generated string is replaced by a skeleton bar SERVER-SIDE, so nothing
 * readable is serialised into a free account's page. Opening the inspector
 * gives away the layout and the colour, which the user chose themselves —
 * never the copy the engine produced.
 */
export function SitePreview({ model, redacted = false }: { model: SitePreviewModel; redacted?: boolean }) {
  const { palette: c, style, fonts } = model;
  const radius = style.radius;
  const border = `${style.borderWidth}px solid ${c.border}`;
  const initial = redacted ? "•" : model.productName.charAt(0).toUpperCase();

  /** Text, or a skeleton bar of the same rough footprint when locked. */
  function T({ children, ch = 7, max = 320 }: { children: string; ch?: number; max?: number }) {
    if (!redacted) return <>{children}</>;
    return (
      <span
        aria-hidden
        style={{
          display: "inline-block",
          verticalAlign: "middle",
          width: Math.max(28, Math.min(max, children.length * ch)),
          maxWidth: "100%",
          height: "0.7em",
          borderRadius: 3,
          background: c.textMuted,
          opacity: 0.32,
        }}
      />
    );
  }

  const panel: React.CSSProperties = {
    background: style.blurPanels ? `${c.surfaceRaised}cc` : c.surface,
    border,
    borderRadius: radius,
    backdropFilter: style.blurPanels ? "blur(8px)" : undefined,
    boxShadow: style.shadow === "none" ? undefined : style.shadow,
  };

  const primaryBtn: React.CSSProperties = {
    background: c.primary,
    color: c.onPrimary,
    borderRadius: style.key === "brutalist" ? 0 : Math.min(radius, 12),
    padding: "9px 16px",
    fontSize: 12.5,
    fontWeight: 600,
    display: "inline-block",
    whiteSpace: "nowrap",
  };

  const ghostBtn: React.CSSProperties = {
    border,
    color: c.textPrimary,
    borderRadius: style.key === "brutalist" ? 0 : Math.min(radius, 12),
    padding: "9px 16px",
    fontSize: 12.5,
    fontWeight: 500,
    display: "inline-block",
    whiteSpace: "nowrap",
  };

  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/[0.09]"
      style={{ background: c.bg, color: c.textPrimary, fontFamily: fonts.body }}
    >
      {/* Browser chrome ------------------------------------------------ */}
      <div
        className="flex items-center gap-2 px-3.5 py-2.5"
        style={{ background: c.surfaceRaised, borderBottom: `1px solid ${c.border}` }}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.border }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.border }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.border }} />
        <span
          className="ml-2 truncate rounded-md px-2.5 py-1 text-[11px]"
          style={{ background: c.bg, color: c.textMuted, border: `1px solid ${c.border}` }}
        >
          <T ch={5} max={180}>{model.domain}</T>
        </span>
      </div>

      <div className="relative">
        {style.glow && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-64"
            style={{
              background: `radial-gradient(26rem 14rem at 50% 0%, ${c.primary}38, transparent 70%)`,
            }}
          />
        )}

        <div className="relative px-5 pb-7 pt-4 sm:px-8">
          {/* Site nav -------------------------------------------------- */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center text-[13px] font-bold"
                style={{
                  background: c.primary,
                  color: c.onPrimary,
                  borderRadius: style.key === "brutalist" ? 0 : Math.min(radius, 9),
                }}
              >
                {initial}
              </span>
              <span
                className="text-[14px]"
                style={{ fontFamily: fonts.display, fontWeight: fonts.weight, letterSpacing: fonts.tracking }}
              >
                <T ch={7} max={140}>{model.productName}</T>
              </span>
            </div>

            <div className="hidden items-center gap-5 sm:flex">
              {model.navItems.map((n) => (
                <span
                  key={n}
                  className="text-[12px]"
                  style={{
                    color: c.textMuted,
                    textTransform: style.uppercaseNav ? "uppercase" : "none",
                    letterSpacing: style.uppercaseNav ? "0.08em" : undefined,
                  }}
                >
                  <T ch={6} max={70}>{n}</T>
                </span>
              ))}
              <span style={primaryBtn}><T ch={7} max={110}>{model.ctaPrimary}</T></span>
            </div>
          </div>

          {/* Hero ------------------------------------------------------ */}
          <div className="mt-12 text-center">
            <span
              className="inline-block px-3 py-1 text-[11px]"
              style={{
                border,
                borderRadius: style.key === "brutalist" ? 0 : 999,
                color: c.textMuted,
                background: c.primarySoft,
              }}
            >
              <T ch={6} max={140}>{model.badge}</T>
            </span>

            <h2
              className="mx-auto mt-5 max-w-2xl text-[27px] leading-[1.12] sm:text-[36px]"
              style={{
                fontFamily: fonts.display,
                fontWeight: fonts.weight,
                letterSpacing: fonts.tracking,
                color: c.textPrimary,
              }}
            >
              <T ch={15} max={520}>{model.heroTitle}</T>
            </h2>

            <p
              className="mx-auto mt-4 max-w-xl text-[13.5px] leading-relaxed"
              style={{ color: c.textMuted }}
            >
              <T ch={6.5} max={460}>{model.heroSubtitle}</T>
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <span style={primaryBtn}><T ch={7} max={110}>{model.ctaPrimary}</T></span>
              <span style={ghostBtn}><T ch={7} max={110}>{model.ctaSecondary}</T></span>
            </div>
          </div>

          {/* Media slot ------------------------------------------------ */}
          {model.media.kind !== "none" && (
            <div
              className="mt-10 flex h-40 flex-col items-center justify-center gap-1.5 px-4 text-center sm:h-52"
              style={{
                ...panel,
                background:
                  model.media.kind === "abstract"
                    ? `linear-gradient(135deg, ${c.primary}40, ${c.accent}26)`
                    : panel.background,
              }}
            >
              <span className="text-[12px] font-medium" style={{ color: c.textPrimary }}>
                <T ch={6} max={160}>{model.media.label}</T>
              </span>
              <span className="max-w-xs text-[11.5px] leading-snug" style={{ color: c.textMuted }}>
                <T ch={5} max={220}>{model.media.description}</T>
              </span>
            </div>
          )}

          {/* Stats ----------------------------------------------------- */}
          <div className="mt-10 grid grid-cols-3 gap-3">
            {model.stats.map((s) => (
              <div key={s.label} className="px-3 py-4 text-center" style={panel}>
                <p
                  className="text-[20px]"
                  style={{ fontFamily: fonts.display, fontWeight: fonts.weight, color: c.textMuted }}
                >
                  —
                </p>
                <p className="mt-1 text-[10.5px]" style={{ color: c.textMuted }}>
                  <T ch={5} max={90}>{s.label}</T>
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[10.5px]" style={{ color: c.textMuted }}>
            {redacted ? "" : "Emplacements vides tant qu'il n'y a pas de vrai chiffre à afficher."}
          </p>

          {/* Features -------------------------------------------------- */}
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {model.featureCards.map((f) => (
              <div key={f.title} className="p-4" style={panel}>
                <span
                  className="flex h-6 w-6 items-center justify-center text-[11px]"
                  style={{
                    background: c.primarySoft,
                    color: c.primary,
                    borderRadius: style.key === "brutalist" ? 0 : 6,
                  }}
                >
                  ◆
                </span>
                <p
                  className="mt-3 text-[13px]"
                  style={{ fontFamily: fonts.display, fontWeight: fonts.weight, color: c.textPrimary }}
                >
                  <T ch={7} max={130}>{f.title}</T>
                </p>
                <p className="mt-1.5 text-[11.5px] leading-snug" style={{ color: c.textMuted }}>
                  <T ch={4.5} max={190}>{f.body}</T>
                </p>
              </div>
            ))}
          </div>

          {/* Pricing --------------------------------------------------- */}
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {model.pricing.map((t) => (
              <div
                key={t.name}
                className="p-4"
                style={{
                  ...panel,
                  border: t.highlight ? `${Math.max(1, style.borderWidth)}px solid ${c.primary}` : border,
                }}
              >
                <p className="text-[11.5px]" style={{ color: c.textMuted }}>
                  <T ch={6} max={90}>{t.name}</T>
                </p>
                <p
                  className="mt-1.5 text-[22px]"
                  style={{ fontFamily: fonts.display, fontWeight: fonts.weight, color: c.textPrimary }}
                >
                  {redacted ? <T ch={9} max={70}>{`${t.price}EUR`}</T> : `${t.price}€`}
                  <span className="ml-1 text-[11px]" style={{ color: c.textMuted }}>
                    {redacted ? null : t.period}
                  </span>
                </p>
                <ul className="mt-3 space-y-1.5">
                  {t.lines.map((l) => (
                    <li key={l} className="text-[11px] leading-snug" style={{ color: c.textMuted }}>
                      <T ch={4.2} max={180}>{l}</T>
                    </li>
                  ))}
                </ul>
                <span
                  className="mt-4 block text-center"
                  style={t.highlight ? primaryBtn : ghostBtn}
                >
                  <T ch={7} max={110}>{model.ctaPrimary}</T>
                </span>
              </div>
            ))}
          </div>

          {/* Footer ---------------------------------------------------- */}
          <div
            className="mt-10 pt-4 text-center text-[10.5px]"
            style={{ borderTop: `1px solid ${c.border}`, color: c.textMuted }}
          >
            <T ch={4.5} max={320}>{model.footerNote}</T>
          </div>
        </div>
      </div>
    </div>
  );
}
