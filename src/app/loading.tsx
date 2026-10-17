"use client";
import { useTheme } from "@/context/ThemeContext";
import { BOTTOM_NAV_HEIGHT } from "@/components/BottomNav";

/**
 * Shown the instant you tap a tab, while the next page's code and data arrive.
 * Without it the screen freezes on the old page and feels like the app is hanging.
 * Every route inherits this file unless it has its own loading.tsx.
 */
export default function Loading() {
  const { colors } = useTheme();
  const bar = (w: string, h: number, r = 8): React.CSSProperties => ({
    width: w, height: h, borderRadius: r,
    background: `linear-gradient(90deg, ${colors.card} 25%, ${colors.border} 50%, ${colors.card} 75%)`,
    backgroundSize: "400px 100%", animation: "ldShimmer 1.2s linear infinite",
  });
  return (
    <div aria-busy="true" aria-label="Loading" style={{ minHeight: "100dvh", background: colors.bg, maxWidth: 430, margin: "0 auto", padding: `66px 16px ${BOTTOM_NAV_HEIGHT}px` }}>
      <style>{`@keyframes ldShimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}@media (prefers-reduced-motion:reduce){[aria-busy] *{animation:none!important}}`}</style>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={bar("40px", 40, 20)} />
            <div style={{ flex: 1 }}>
              <div style={{ ...bar("40%", 12, 6), marginBottom: 8 }} />
              <div style={bar("25%", 10, 6)} />
            </div>
          </div>
          <div style={bar("100%", 220, 16)} />
        </div>
      ))}
    </div>
  );
}