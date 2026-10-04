// Shared illustrated icons used across the app (discover, likes, ...).
// Every icon is self-contained (its own gradients, unique ids), so <IconDefs /> is no longer needed.
// It is kept as an empty component so existing pages that render it keep compiling.
import { useId } from "react";

export type IconName = "relationship" | "casual" | "friendship" | "fwb" | "pass" | "super" | "like" | "later";

// Want real artwork instead? Put PNG/SVG files in /public/icons and list them here,
// for example: friendship: "/icons/friendship.png". Anything listed here replaces the drawn icon.
const ICON_IMAGES: Partial<Record<IconName, string>> = {};

export function IconDefs() {
  return null;
}

// ── helpers ───────────────────────────────────────────────────────────────────
const f2 = (n: number) => n.toFixed(2);
const hexRgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hexRgb(a), B = hexRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
};
type Pt = [number, number];
const pts = (p: Pt[]) => p.map(q => `${f2(q[0])},${f2(q[1])}`).join(" ");

// ── static geometry ───────────────────────────────────────────────────────────
const HEART = "M24 43.5 C10 33.5 4.5 25 4.5 16.5 C4.5 10.2 9.2 5.5 15.3 5.5 C19.2 5.5 22.4 7.6 24 11 C25.6 7.6 28.8 5.5 32.7 5.5 C38.8 5.5 43.5 10.2 43.5 16.5 C43.5 25 38 33.5 24 43.5 Z";

// Five-point crystal star, lit from the top left.
const SC: Pt = [24, 25.5];
const TIPS: Pt[] = Array.from({ length: 5 }, (_, i) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  return [24 + 21 * Math.cos(a), 25.5 + 21 * Math.sin(a)];
});
const VALLEYS: Pt[] = Array.from({ length: 5 }, (_, i) => {
  const a = -Math.PI / 2 + Math.PI / 5 + (i * 2 * Math.PI) / 5;
  return [24 + 9.6 * Math.cos(a), 25.5 + 9.6 * Math.sin(a)];
});
const STAR_OUTLINE: Pt[] = TIPS.flatMap((t, i) => [t, VALLEYS[i]]);
const STAR_FACETS = TIPS.flatMap((t, i) => {
  const halves: { p: Pt[]; left: boolean }[] = [
    { p: [SC, t, VALLEYS[(i + 4) % 5]], left: true },
    { p: [SC, t, VALLEYS[i]], left: false },
  ];
  return halves.map(h => {
    const cx = (h.p[0][0] + h.p[1][0] + h.p[2][0]) / 3 - SC[0];
    const cy = (h.p[0][1] + h.p[1][1] + h.p[2][1]) / 3 - SC[1];
    const light = (Math.cos(Math.atan2(cy, cx) + Math.PI * 0.75) + 1) / 2;
    const t01 = Math.min(1, 0.12 + light * 0.68 + (h.left ? 0.14 : 0));
    return { points: pts(h.p), fill: mix("#1b44a8", "#eaf6ff", t01) };
  });
});

const TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  const r1 = i % 3 === 0 ? 12 : 13.3;
  const r2 = 15.2;
  return {
    i, major: i % 3 === 0,
    x1: f2(24 + r1 * Math.cos(a)), y1: f2(24 + r1 * Math.sin(a)),
    x2: f2(24 + r2 * Math.cos(a)), y2: f2(24 + r2 * Math.sin(a)),
  };
});

// ── icons ─────────────────────────────────────────────────────────────────────
function Heart({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}a`} cx="33%" cy="24%" r="92%">
          <stop offset="0" stopColor="#ff8fac" /><stop offset="0.36" stopColor="#ea2a5f" />
          <stop offset="0.78" stopColor="#a1103c" /><stop offset="1" stopColor="#64081f" />
        </radialGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" /><stop offset="0.45" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#ffb0c4" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={`${id}c`} cx="50%" cy="100%" r="65%">
          <stop offset="0" stopColor="#ff7396" stopOpacity="0.6" /><stop offset="1" stopColor="#ff7396" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}d`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.8" /></filter>
        <clipPath id={`${id}e`}><path d={HEART} /></clipPath>
      </defs>
      <path d={HEART} fill={`url(#${id}a)`} />
      <g clipPath={`url(#${id}e)`}>
        <ellipse cx="24" cy="45" rx="19" ry="12" fill={`url(#${id}c)`} />
        <path d="M8.5 19 C7.6 12.4 12.4 8.4 17 9 C13.4 10.4 11.8 13.6 12.6 18.4 Z" fill="#fff" opacity="0.55" filter={`url(#${id}d)`} />
        <path d="M39.5 16 C39.8 20 38 24 35 27.5" fill="none" stroke="#ffc1d2" strokeWidth="1.6" strokeLinecap="round" opacity="0.4" filter={`url(#${id}d)`} />
      </g>
      <path d={HEART} fill="none" stroke={`url(#${id}b)`} strokeWidth="1.1" />
      <ellipse cx="14.2" cy="12.4" rx="2.6" ry="1.4" transform="rotate(-38 14.2 12.4)" fill="#fff" opacity="0.92" />
    </>
  );
}

function Pass({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffb4c6" /><stop offset="0.45" stopColor="#ff5c85" /><stop offset="1" stopColor="#a8123f" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb4c6" /><stop offset="0.45" stopColor="#ff5c85" /><stop offset="1" stopColor="#a8123f" />
        </linearGradient>
      </defs>
      <g transform="rotate(45 24 24)">
        <rect x="20.6" y="5.5" width="6.8" height="37" rx="3.4" fill={`url(#${id}a)`} />
        <rect x="22.2" y="8" width="1.6" height="32" rx="0.8" fill="#fff" opacity="0.6" />
        <rect x="5.5" y="20.6" width="37" height="6.8" rx="3.4" fill={`url(#${id}b)`} />
        <rect x="8" y="22.2" width="32" height="1.6" rx="0.8" fill="#fff" opacity="0.6" />
        <rect x="20.6" y="20.6" width="6.8" height="6.8" rx="2" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="0.6" />
      </g>
    </>
  );
}

function Super({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}a`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {STAR_FACETS.map((f, i) => (
        <polygon key={i} points={f.points} fill={f.fill} stroke="#fff" strokeOpacity="0.4" strokeWidth="0.45" strokeLinejoin="round" />
      ))}
      <circle cx="24" cy="25.5" r="6.5" fill={`url(#${id}a)`} />
      <polygon points={pts(STAR_OUTLINE)} fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M38 6 L39 9.2 L42.2 10.2 L39 11.2 L38 14.4 L37 11.2 L33.8 10.2 L37 9.2 Z" fill="#fff" opacity="0.95" />
    </>
  );
}

function Later({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3b8" /><stop offset="0.35" stopColor="#f0d36e" />
          <stop offset="0.7" stopColor="#c99a22" /><stop offset="1" stopColor="#7a5710" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff3b8" /><stop offset="0.5" stopColor="#b98a1c" /><stop offset="1" stopColor="#6a4a0c" />
        </linearGradient>
        <radialGradient id={`${id}c`} cx="40%" cy="32%" r="80%">
          <stop offset="0" stopColor="#2c2f55" /><stop offset="1" stopColor="#0d0e22" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill={`url(#${id}a)`} />
      <circle cx="24" cy="24" r="18.3" fill={`url(#${id}b)`} />
      <circle cx="24" cy="24" r="16.6" fill={`url(#${id}c)`} />
      {TICKS.map(t => (
        <line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.major ? "#f3dc7a" : "#b9bde6"} strokeOpacity={t.major ? 1 : 0.6} strokeWidth={t.major ? 1.5 : 0.9} strokeLinecap="round" />
      ))}
      <line x1="24" y1="24" x2="17.5" y2="19.4" stroke="#f4f1ea" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="24" y1="24" x2="34" y2="18.3" stroke="#f4f1ea" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2.2" fill="#D4AF37" stroke="#fff3b8" strokeWidth="0.6" />
      <path d="M9.6 19.5 A15.4 15.4 0 0 1 22 9.2 Q13.6 12.4 11 23 Z" fill="#fff" opacity="0.16" />
    </>
  );
}

function Ring({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3b8" /><stop offset="0.35" stopColor="#f0d36e" />
          <stop offset="0.7" stopColor="#c99a22" /><stop offset="1" stopColor="#7a5710" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b98a1c" /><stop offset="1" stopColor="#5e410a" />
        </linearGradient>
      </defs>
      {/* band: darker underside first, then the lit face */}
      <ellipse cx="24" cy="33.6" rx="12.6" ry="11" fill="none" stroke={`url(#${id}b)`} strokeWidth="5" />
      <ellipse cx="24" cy="33" rx="12.6" ry="11" fill="none" stroke={`url(#${id}a)`} strokeWidth="4.4" />
      <path d="M13 29 C14.6 24.6 18.6 22 24 22" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" strokeLinecap="round" />
      {/* prongs */}
      <path d="M17.6 15 L19.8 20.6 L22 20.6 L20.6 14 Z M30.4 15 L28.2 20.6 L26 20.6 L27.4 14 Z" fill={`url(#${id}a)`} />
      {/* brilliant-cut diamond */}
      <polygon points="17,5 31,5 28,13.6 20,13.6" fill="#f5fbff" />
      <polygon points="17,5 10.5,13.6 20,13.6" fill="#c7e6fb" />
      <polygon points="31,5 37.5,13.6 28,13.6" fill="#a6d2f2" />
      <polygon points="10.5,13.6 20,13.6 24,25" fill="#8fc0e8" />
      <polygon points="20,13.6 28,13.6 24,25" fill="#e8f6ff" />
      <polygon points="28,13.6 37.5,13.6 24,25" fill="#6fa6d8" />
      <g fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="0.5" strokeLinejoin="round">
        <polygon points="17,5 31,5 37.5,13.6 24,25 10.5,13.6" />
        <polyline points="10.5,13.6 37.5,13.6" />
        <polyline points="20,13.6 24,25 28,13.6" />
      </g>
      <path d="M40 3 L41 6 L44 7 L41 8 L40 11 L39 8 L36 7 L39 6 Z" fill="#fff" opacity="0.95" />
    </>
  );
}

function Wave({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe2a8" /><stop offset="0.55" stopColor="#ffb98a" /><stop offset="1" stopColor="#8fc5f2" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d8fe0" /><stop offset="1" stopColor="#12418f" />
        </linearGradient>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fc3f5" /><stop offset="1" stopColor="#1f63c4" />
        </linearGradient>
        <linearGradient id={`${id}d`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9ecff" /><stop offset="1" stopColor="#3a8fe8" />
        </linearGradient>
        <radialGradient id={`${id}e`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff7d6" stopOpacity="0.95" /><stop offset="1" stopColor="#fff7d6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#8aa6c8" />
        </linearGradient>
        <clipPath id={`${id}g`}><circle cx="24" cy="24" r="19.2" /></clipPath>
      </defs>
      <circle cx="24" cy="24" r="22" fill={`url(#${id}f)`} />
      <g clipPath={`url(#${id}g)`}>
        <rect width="48" height="48" fill={`url(#${id}a)`} />
        <circle cx="33" cy="15" r="9" fill={`url(#${id}e)`} />
        <circle cx="33" cy="15" r="3.6" fill="#fff4cf" />
        <path d="M0 30 C8 23.5 14 24 20 29 C26 34 34 33 48 24 V48 H0 Z" fill={`url(#${id}b)`} />
        <path d="M0 36 C9 30 16 31 23 35.6 C31 40.4 39 38.6 48 31.5 V48 H0 Z" fill={`url(#${id}c)`} />
        <path d="M0 42 C10 37.6 17 38.6 25 42 C33 45.4 41 44 48 39 V48 H0 Z" fill={`url(#${id}d)`} />
        <path d="M0 30 C8 23.5 14 24 20 29 C26 34 34 33 48 24" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M0 36 C9 30 16 31 23 35.6 C31 40.4 39 38.6 48 31.5" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" strokeLinecap="round" />
      </g>
      <circle cx="24" cy="24" r="19.2" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="0.8" />
    </>
  );
}

function Cup({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fffdf8" /><stop offset="0.5" stopColor="#efe6d8" /><stop offset="1" stopColor="#b9aa93" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#b7ad9d" />
        </linearGradient>
        <radialGradient id={`${id}c`} cx="45%" cy="40%" r="70%">
          <stop offset="0" stopColor="#b57a45" /><stop offset="0.6" stopColor="#6e4020" /><stop offset="1" stopColor="#3b200d" />
        </radialGradient>
        <filter id={`${id}d`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="0.7" /></filter>
        <filter id={`${id}e`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="1.1" /></filter>
      </defs>
      {/* steam */}
      <g fill="none" stroke="#fff" strokeLinecap="round" opacity="0.7" filter={`url(#${id}d)`}>
        <path d="M17 13 C14.6 10 19.2 8.6 17 4" strokeWidth="1.6" />
        <path d="M23.5 13 C21 9.6 26 8 23.5 2.8" strokeWidth="1.8" />
        <path d="M30 13 C27.6 10 32 8.6 30 4.4" strokeWidth="1.6" />
      </g>
      {/* saucer */}
      <ellipse cx="24" cy="40" rx="19" ry="4.6" fill="#8d8170" opacity="0.55" filter={`url(#${id}e)`} />
      <ellipse cx="24" cy="38.6" rx="18.4" ry="4.4" fill={`url(#${id}b)`} />
      <ellipse cx="24" cy="38" rx="13.6" ry="2.9" fill="#e4dac9" />
      {/* handle */}
      <path d="M34.6 20.6 H37.4 C44 20.6 44 32.6 36.6 32.6 H33.4" fill="none" stroke="#cfc3af" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M34.6 20.6 H37.4 C43 20.6 43 31.6 36.6 31.6" fill="none" stroke="#fffdf8" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
      {/* cup body */}
      <path d="M10.6 19.2 C10.6 30.6 14.2 37 23 37 C31.8 37 35.4 30.6 35.4 19.2 Z" fill={`url(#${id}a)`} />
      <path d="M13.4 22 C13.6 29 15.8 33 19 34.6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      {/* rim and coffee */}
      <ellipse cx="23" cy="19.2" rx="12.4" ry="3.9" fill="#fffdf8" stroke="#D4AF37" strokeWidth="0.9" />
      <ellipse cx="23" cy="19.5" rx="10.5" ry="3" fill={`url(#${id}c)`} />
      <ellipse cx="20" cy="18.8" rx="4.6" ry="0.95" fill="#e2b787" opacity="0.55" />
    </>
  );
}

function Orbs({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}a`} cx="34%" cy="28%" r="80%">
          <stop offset="0" stopColor="#c3ffe6" /><stop offset="0.5" stopColor="#25c58a" /><stop offset="1" stopColor="#0a6747" />
        </radialGradient>
        <radialGradient id={`${id}b`} cx="34%" cy="28%" r="80%">
          <stop offset="0" stopColor="#e2fff4" /><stop offset="0.5" stopColor="#58e5b1" /><stop offset="1" stopColor="#14966a" />
        </radialGradient>
        <radialGradient id={`${id}c`} cx="50%" cy="100%" r="60%">
          <stop offset="0" stopColor="#a8ffd8" stopOpacity="0.6" /><stop offset="1" stopColor="#a8ffd8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}d`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.05" /><stop offset="1" stopColor="#c8ffe9" stopOpacity="0.5" />
        </linearGradient>
        <clipPath id={`${id}e`}><circle cx="17.5" cy="27" r="13" /></clipPath>
        <clipPath id={`${id}f`}><circle cx="30.5" cy="21" r="13" /></clipPath>
        <filter id={`${id}g`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.7" /></filter>
      </defs>
      <circle cx="17.5" cy="27" r="13" fill={`url(#${id}a)`} />
      <circle cx="30.5" cy="21" r="13" fill={`url(#${id}b)`} opacity="0.9" />
      <g clipPath={`url(#${id}f)`}>
        <circle cx="30.5" cy="21" r="13" fill="none" />
        <ellipse cx="30.5" cy="35" rx="14" ry="8" fill={`url(#${id}c)`} />
      </g>
      <g clipPath={`url(#${id}e)`}>
        <circle cx="30.5" cy="21" r="13" fill="#fff" opacity="0.3" />
        <ellipse cx="17.5" cy="41" rx="13" ry="7" fill={`url(#${id}c)`} />
      </g>
      <circle cx="17.5" cy="27" r="12.6" fill="none" stroke={`url(#${id}d)`} strokeWidth="1" />
      <circle cx="30.5" cy="21" r="12.6" fill="none" stroke={`url(#${id}d)`} strokeWidth="1" />
      <path d="M8.4 24 C8.6 19.6 11.6 16.6 15.4 16.2 C12.4 18 10.8 20.6 10.6 24.6 Z" fill="#fff" opacity="0.6" filter={`url(#${id}g)`} />
      <path d="M21.6 18 C22 13.4 25 10.2 29 9.6 C26 11.4 24.4 14 24.2 18.4 Z" fill="#fff" opacity="0.6" filter={`url(#${id}g)`} />
      <path d="M40 3 L41 6 L44 7 L41 8 L40 11 L39 8 L36 7 L39 6 Z" fill="#fff" opacity="0.95" />
    </>
  );
}

// ── public components ─────────────────────────────────────────────────────────
export function Icon({ name, size }: { name: IconName; size: number }) {
  const id = "ic" + useId().replace(/[^a-zA-Z0-9]/g, "") + name;
  const custom = ICON_IMAGES[name];
  if (custom) {
    return <img src={custom} alt="" width={size} height={size} draggable={false} style={{ width: size, height: size, objectFit: "contain", display: "block" }} />;
  }
  const body =
    name === "like" ? <Heart id={id} /> :
    name === "pass" ? <Pass id={id} /> :
    name === "super" ? <Super id={id} /> :
    name === "later" ? <Later id={id} /> :
    name === "relationship" ? <Ring id={id} /> :
    name === "casual" ? <Wave id={id} /> :
    name === "friendship" ? <Cup id={id} /> :
    <Orbs id={id} />;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden style={{ display: "block", overflow: "visible", filter: "drop-shadow(0 1.5px 2px rgba(0,0,0,0.45))" }}>
      {body}
    </svg>
  );
}

// Shown when someone has no photo yet.
export function Silhouette({ sig }: { sig: string }) {
  const id = "sil" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", background: `radial-gradient(60% 45% at 50% 35%, rgba(${sig},0.35), transparent 70%), #12121a` }}>
      <svg viewBox="0 0 100 100" width="62%" aria-hidden style={{ display: "block", marginBottom: "28%" }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`rgb(${sig})`} stopOpacity="0.55" />
            <stop offset="1" stopColor={`rgb(${sig})`} stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="34" r="19" fill={`url(#${id})`} />
        <path d="M10 100 C10 70 28 58 50 58 C72 58 90 70 90 100 Z" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}