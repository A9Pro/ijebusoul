"use client";
import { useMemo } from "react";
import type { ReactNode } from "react";

/**
 * SoulCloth: a strip of woven aso-oke cloth that is unique to every profile.
 *
 * - The pattern is generated from the profile id, so the same person always
 *   gets the same cloth, on every device, with no image stored anywhere.
 * - The cloth grows with the person: each interest adds a strip, and the
 *   strips already there never change (the generator is prefix-stable).
 * - Pure CSS gradients. No libraries, no images.
 */

export const CLOTH = {
  ink: "#0f1233",
  indigo: "#1e2466",
  indigo2: "#2b3390",
  camwood: "#b8412b",
  gold: "#e0a82e",
  cotton: "#f2ebdd",
} as const;

const PAIRS: [string, string][] = [
  [CLOTH.indigo, CLOTH.gold],
  [CLOTH.camwood, CLOTH.cotton],
  [CLOTH.ink, CLOTH.gold],
  [CLOTH.indigo2, CLOTH.cotton],
  [CLOTH.cotton, CLOTH.indigo],
  [CLOTH.gold, CLOTH.ink],
  [CLOTH.camwood, CLOTH.ink],
  [CLOTH.indigo, CLOTH.cotton],
];

const PATTERNS: Array<(a: string, b: string) => string> = [
  // pinstripe
  (a, b) => `linear-gradient(90deg, ${a} 0 40%, ${b} 40% 46%, ${a} 46% 100%)`,
  // check
  (a, b) => `conic-gradient(${a} 25%, ${b} 0 50%, ${a} 0 75%, ${b} 0) 0 0 / 100% 28px`,
  // diamond lattice
  (a, b) =>
    `repeating-linear-gradient(45deg, transparent 0 8px, ${b} 8px 10px), repeating-linear-gradient(-45deg, transparent 0 8px, ${b} 8px 10px), ${a}`,
  // dots
  (a, b) => `radial-gradient(circle at 50% 50%, ${b} 0 2.5px, transparent 3px) 0 0 / 100% 16px, ${a}`,
  // bands
  (a, b) => `repeating-linear-gradient(0deg, ${a} 0 12px, ${b} 12px 24px)`,
  // edge stripes
  (a, b) =>
    `linear-gradient(90deg, transparent 0 18%, ${b} 18% 24%, transparent 24% 76%, ${b} 76% 82%, transparent 82%), ${a}`,
];

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One CSS background per strip. Strip n is the same whatever the total count is. */
export function buildStrips(seedKey: string, count: number): string[] {
  const rand = mulberry32(hashSeed(seedKey || "ijebusoul"));
  const out: string[] = [];
  let prevPattern = -1;
  let prevPair = -1;
  for (let i = 0; i < count; i++) {
    let p = Math.floor(rand() * PATTERNS.length);
    if (p === prevPattern) p = (p + 1) % PATTERNS.length;
    let c = Math.floor(rand() * PAIRS.length);
    if (c === prevPair) c = (c + 1) % PAIRS.length;
    prevPattern = p;
    prevPair = c;
    const [a, b] = PAIRS[c];
    out.push(PATTERNS[p](a, b));
  }
  return out;
}

/** 7 strips for a new profile, one more per interest, 15 at most. */
export function clothStripCount(interestCount: number): number {
  return Math.max(7, Math.min(15, 7 + interestCount));
}

const CSS = `
.sc-wrap{position:relative;width:100%}
.sc-cloth{display:flex;height:100%;overflow:hidden;border-radius:0 0 22px 22px}
.sc-strip{position:relative;flex:1;transform-origin:top;animation:sc-weave 1s cubic-bezier(.2,.75,.15,1) both}
.sc-strip.sc-up{transform-origin:bottom}
.sc-strip::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,.34),rgba(0,0,0,0) 22%,rgba(0,0,0,0) 78%,rgba(0,0,0,.34))}
.sc-strip::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0,rgba(0,0,0,.16) 2px,transparent 2px,transparent 5px)}
.sc-shade{position:absolute;inset:0;border-radius:0 0 22px 22px;pointer-events:none;background:linear-gradient(to bottom,rgba(0,0,0,.3),rgba(0,0,0,0) 40%,rgba(0,0,0,.18))}
.sc-fringe{position:absolute;left:12px;right:12px;bottom:-8px;height:8px;pointer-events:none;background:repeating-linear-gradient(90deg,#e0a82e 0 2px,transparent 2px 5px);-webkit-mask-image:linear-gradient(#000,transparent);mask-image:linear-gradient(#000,transparent);opacity:.9}
.sc-overlay{position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:space-between;padding:12px 14px;pointer-events:none}
.sc-overlay>*{pointer-events:auto}
@keyframes sc-weave{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@media (prefers-reduced-motion:reduce){.sc-strip{animation:none}}
`;

export default function SoulCloth({
  seed,
  strips = 9,
  height = 132,
  children,
}: {
  seed: string;
  strips?: number;
  height?: number;
  children?: ReactNode;
}) {
  const backgrounds = useMemo(() => buildStrips(seed, strips), [seed, strips]);

  return (
    <div className="sc-wrap" style={{ height }}>
      <div className="sc-cloth" aria-hidden="true">
        {backgrounds.map((bg, i) => (
          <div
            key={i}
            className={`sc-strip${i % 2 ? " sc-up" : ""}`}
            style={{ background: bg, animationDelay: `${Math.min(i, 8) * 60}ms` }}
          />
        ))}
      </div>
      <div className="sc-shade" aria-hidden="true" />
      <div className="sc-fringe" aria-hidden="true" />
      {children ? <div className="sc-overlay">{children}</div> : null}
      <style>{CSS}</style>
    </div>
  );
}