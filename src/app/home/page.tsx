"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import BottomNav, { BOTTOM_NAV_HEIGHT } from "@/components/BottomNav";
import Header from "@/components/Header";
import type { Profile } from "@/lib/types";
import { MapPin, MessageCircle } from "lucide-react";

type Action = "like" | "pass" | "superlike";
type Exit = Action | "later";

const GOLD = "#D4AF37";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const THRESH_X = 110; // drag distance that commits a left/right swipe
const THRESH_Y = 120; // drag distance that commits a super like

const BADGE: Record<string, { bg: string; color: string }> = {
  relationship: { bg: "rgba(255,51,102,0.22)", color: "#FF5C85" },
  casual:       { bg: "rgba(96,165,250,0.22)", color: "#7DB8FB" },
  friendship:   { bg: "rgba(212,175,55,0.22)", color: "#E6C24F" },
  fwb:          { bg: "rgba(52,211,153,0.22)", color: "#4BE0A9" },
};

// Each person gets a signature hue, matching the feed.
const SIGNATURES = ["212,175,55", "205,96,58", "52,150,108", "112,92,205", "214,134,82", "46,156,176"];
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));

function photosOf(p: Profile | undefined): string[] {
  if (!p) return [];
  const raw: (string | null | undefined)[] = [...(p.photos ?? [])];
  if (raw.length === 0) raw.push(p.avatar_url);
  return raw.map(r => (r ? avatarUrl(r) : null)).filter((u): u is string => !!u);
}

type IconName = "relationship" | "casual" | "friendship" | "fwb" | "pass" | "super" | "like" | "later";

// Want your own artwork instead? Put PNG/SVG files in /public/icons and list them here,
// for example: friendship: "/icons/friendship.png". Anything listed here replaces the drawn icon.
const ICON_IMAGES: Partial<Record<IconName, string>> = {};

const f2 = (n: number) => n.toFixed(2);
const HEART = "M24 42 C8 30 4 21 4 14.5 C4 9 8.2 5 13.5 5 C18 5 21.7 7.6 24 11.5 C26.3 7.6 30 5 34.5 5 C39.8 5 44 9 44 14.5 C44 21 40 30 24 42 Z";
const STAR_PTS = Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  const r = i % 2 === 0 ? 20 : 8.5;
  return [24 + r * Math.cos(a), 25 + r * Math.sin(a)] as [number, number];
});
const starStr = (p: [number, number]) => `${f2(p[0])},${f2(p[1])}`;
const TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  const r1 = i % 3 === 0 ? 11.5 : 12.8;
  const r2 = 14.5;
  return {
    i, long: i % 3 === 0,
    x1: f2(24 + r1 * Math.cos(a)), y1: f2(24 + r1 * Math.sin(a)),
    x2: f2(24 + r2 * Math.cos(a)), y2: f2(24 + r2 * Math.sin(a)),
  };
});

// Shared gradients for every drawn icon (rendered once per page).
function IconDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <radialGradient id="icHeart" cx="35%" cy="25%" r="85%">
          <stop offset="0" stopColor="#ffb0c4" /><stop offset="0.55" stopColor="#f0306a" /><stop offset="1" stopColor="#a50f3b" />
        </radialGradient>
        <linearGradient id="icRose" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffc2d1" /><stop offset="0.5" stopColor="#ff5c85" /><stop offset="1" stopColor="#c01848" />
        </linearGradient>
        <linearGradient id="icGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1b0" /><stop offset="0.3" stopColor="#f3dc7a" /><stop offset="0.65" stopColor="#D4AF37" /><stop offset="1" stopColor="#8f6b12" />
        </linearGradient>
        <linearGradient id="icBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e2f1ff" /><stop offset="0.5" stopColor="#5aa5f5" /><stop offset="1" stopColor="#2b63c9" />
        </linearGradient>
        <linearGradient id="icGem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset="0.5" stopColor="#bfe6ff" /><stop offset="1" stopColor="#7fb8f0" />
        </linearGradient>
        <linearGradient id="icWave" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fe0ff" /><stop offset="1" stopColor="#2a6fe8" />
        </linearGradient>
        <linearGradient id="icWave2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c4f3ff" /><stop offset="1" stopColor="#3b8cf0" />
        </linearGradient>
        <linearGradient id="icViolet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6dcff" /><stop offset="0.5" stopColor="#8b6be0" /><stop offset="1" stopColor="#4b2fa8" />
        </linearGradient>
        <radialGradient id="icGreen" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#b9ffe3" /><stop offset="0.6" stopColor="#25c58a" /><stop offset="1" stopColor="#0e7a54" />
        </radialGradient>
        <radialGradient id="icGreen2" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#d6fff0" /><stop offset="0.6" stopColor="#4be0a9" /><stop offset="1" stopColor="#14966a" />
        </radialGradient>
        <clipPath id="icLens"><circle cx="18" cy="26" r="13" /></clipPath>
      </defs>
    </svg>
  );
}

function Icon({ name, size }: { name: IconName; size: number }) {
  const custom = ICON_IMAGES[name];
  if (custom) {
    return <img src={custom} alt="" width={size} height={size} draggable={false} style={{ width: size, height: size, objectFit: "contain", display: "block" }} />;
  }
  const svg = { viewBox: "0 0 48 48", width: size, height: size, "aria-hidden": true, style: { display: "block", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))" } } as const;

  switch (name) {
    case "like":
      return (
        <svg {...svg}>
          <path d={HEART} fill="url(#icHeart)" />
          <path d={HEART} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
          <ellipse cx="16" cy="14" rx="6" ry="3.3" transform="rotate(-30 16 14)" fill="#fff" opacity="0.5" />
        </svg>
      );
    case "pass":
      return (
        <svg {...svg}>
          <g transform="rotate(45 24 24)">
            <rect x="20" y="5" width="8" height="38" rx="4" fill="url(#icRose)" />
            <rect x="5" y="20" width="38" height="8" rx="4" fill="url(#icRose)" />
            <rect x="21.6" y="7" width="2.4" height="13" rx="1.2" fill="#fff" opacity="0.5" />
            <rect x="7" y="21.6" width="13" height="2.4" rx="1.2" fill="#fff" opacity="0.5" />
          </g>
        </svg>
      );
    case "super":
      return (
        <svg {...svg}>
          <polygon points={STAR_PTS.map(starStr).join(" ")} fill="url(#icBlue)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" strokeLinejoin="round" />
          {STAR_PTS.map((p, i) => (
            <polygon key={i} points={`24,25 ${starStr(p)} ${starStr(STAR_PTS[(i + 1) % 10])}`} fill={i % 2 === 0 ? "#fff" : "#0a2878"} opacity={i % 2 === 0 ? 0.28 : 0.16} />
          ))}
        </svg>
      );
    case "later":
      return (
        <svg {...svg}>
          <circle cx="24" cy="24" r="20" fill="url(#icViolet)" />
          <circle cx="24" cy="24" r="16" fill="#171229" />
          {TICKS.map(t => (
            <line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#cdbfff" strokeOpacity={t.long ? 0.9 : 0.5} strokeWidth={t.long ? 1.6 : 1} strokeLinecap="round" />
          ))}
          <line x1="24" y1="24" x2="24" y2="13.5" stroke="#f3dc7a" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="24" y1="24" x2="31" y2="28" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="24" cy="24" r="2.3" fill="#D4AF37" />
          <path d="M9 19 A17 17 0 0 1 21 8" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "relationship":
      return (
        <svg {...svg}>
          <circle cx="24" cy="32" r="10.5" fill="none" stroke="url(#icGold)" strokeWidth="5" />
          <polygon points="16,6 32,6 38,13 24,24 10,13" fill="url(#icGem)" stroke="#fff" strokeOpacity="0.8" strokeWidth="0.8" strokeLinejoin="round" />
          <g fill="none" stroke="#fff" strokeOpacity="0.65" strokeWidth="0.7">
            <polyline points="10,13 38,13" />
            <polyline points="16,6 20,13 24,24" />
            <polyline points="32,6 28,13 24,24" />
            <polyline points="20,13 24,6 28,13" />
          </g>
        </svg>
      );
    case "casual":
      return (
        <svg {...svg}>
          <path d="M3 28 C9 17 17 17 23 25 C29 33 37 33 45 21 V43 C45 45 43 46 41 46 H7 C5 46 3 45 3 43 Z" fill="url(#icWave)" />
          <path d="M3 35 C10 28 17 29 24 35 C31 41 38 40 45 32 V43 C45 45 43 46 41 46 H7 C5 46 3 45 3 43 Z" fill="url(#icWave2)" opacity="0.85" />
          <path d="M3 28 C9 17 17 17 23 25 C29 33 37 33 45 21" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "friendship":
      return (
        <svg {...svg}>
          <g fill="none" stroke="#fff" strokeOpacity="0.65" strokeWidth="1.8" strokeLinecap="round">
            <path d="M15 14 C13 11 17 9 15 5" />
            <path d="M22 14 C20 11 24 9 22 5" />
            <path d="M29 14 C27 11 31 9 29 5" />
          </g>
          <ellipse cx="22" cy="42" rx="17" ry="3.2" fill="url(#icGold)" opacity="0.85" />
          <path d="M9 18 H35 V30 C35 37 30 41 22 41 C14 41 9 37 9 30 Z" fill="url(#icGold)" />
          <ellipse cx="22" cy="18" rx="13" ry="3.4" fill="#4a2c12" />
          <ellipse cx="22" cy="18.4" rx="10.5" ry="2.3" fill="#7a4a22" />
          <path d="M35 21 H38 C43 21 43 32 37 32 H34" fill="none" stroke="url(#icGold)" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M13 23 V30" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "fwb":
      return (
        <svg {...svg}>
          <circle cx="18" cy="26" r="13" fill="url(#icGreen)" />
          <circle cx="30" cy="22" r="13" fill="url(#icGreen2)" opacity="0.88" />
          <circle cx="30" cy="22" r="13" fill="#fff" opacity="0.26" clipPath="url(#icLens)" />
          <ellipse cx="13" cy="20" rx="4" ry="2.2" transform="rotate(-35 13 20)" fill="#fff" opacity="0.5" />
          <ellipse cx="35" cy="16" rx="4" ry="2.2" transform="rotate(-35 35 16)" fill="#fff" opacity="0.5" />
          <path d="M38 4 L39.6 8.4 L44 10 L39.6 11.6 L38 16 L36.4 11.6 L32 10 L36.4 8.4 Z" fill="#fff" opacity="0.95" />
        </svg>
      );
  }
}

// Shown when someone has no photo yet.
function Silhouette({ sig }: { sig: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", background: `radial-gradient(60% 45% at 50% 35%, rgba(${sig},0.35), transparent 70%), #12121a` }}>
      <svg viewBox="0 0 100 100" width="62%" aria-hidden style={{ display: "block", marginBottom: "28%" }}>
        <defs>
          <linearGradient id="icSil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`rgb(${sig})`} stopOpacity="0.55" />
            <stop offset="1" stopColor={`rgb(${sig})`} stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="34" r="19" fill="url(#icSil)" />
        <path d="M10 100 C10 70 28 58 50 58 C72 58 90 70 90 100 Z" fill="url(#icSil)" />
      </svg>
    </div>
  );
}

const CSS = `
  @keyframes hpEnter { from { transform: scale(0.94) translateY(14px); opacity: 0.85; } to { transform: none; opacity: 1; } }
  @keyframes hpFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes hpShimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
  @keyframes hpSpin { to { transform: rotate(360deg); } }
  @keyframes hpBreathe { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
  @keyframes hpToast { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
  .hp-card { animation: hpEnter 0.4s cubic-bezier(.2,.8,.2,1); }
  .hp-photo { animation: hpFade 0.35s ease; }
  .hp-spin { animation: hpSpin 40s linear infinite; }
  .hp-spin-rev { animation: hpSpin 26s linear infinite reverse; }
  .hp-dot { animation: hpBreathe 2.4s ease-in-out infinite; }
  .hp-skel { background: linear-gradient(90deg, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 80%); background-size: 200% 100%; animation: hpShimmer 1.6s linear infinite; }
  .hp-btn { transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease; cursor: pointer; }
  .hp-btn:hover:not(:disabled) { transform: translateY(-2px) scale(1.06); }
  .hp-btn:active:not(:disabled) { transform: scale(0.93); }
  .hp-btn:disabled { opacity: 0.5; cursor: default; }
  .hp-btn:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) {
    .hp-card, .hp-photo, .hp-spin, .hp-spin-rev, .hp-dot, .hp-skel { animation: none !important; }
  }
`;

const shell: React.CSSProperties = {
  height: "100dvh", width: "100%", maxWidth: 430, margin: "0 auto", position: "relative", overflow: "hidden",
  display: "flex", flexDirection: "column", fontFamily: "system-ui, -apple-system, sans-serif",
  background: "radial-gradient(80% 38% at 95% 8%, rgba(212,175,55,0.13), transparent 70%), radial-gradient(70% 40% at 0% 65%, rgba(112,92,205,0.15), transparent 70%), #07070c",
};

function ActionBtn({ label, size, onClick, disabled, bg, border, glow, children }: {
  label: string; size: number; onClick: () => void; disabled?: boolean;
  bg: string; border: string; glow?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <button
        className="hp-btn"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        style={{
          width: size, height: size, borderRadius: "50%", background: bg, border,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          boxShadow: glow ?? "none",
        }}
      >
        {children}
      </button>
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>{label}</span>
    </div>
  );
}

function Stamp({ text, color, rotate, alpha, style }: { text: string; color: string; rotate: number; alpha: number; style: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute", zIndex: 6, pointerEvents: "none", opacity: alpha,
        transform: `rotate(${rotate}deg) scale(${0.85 + alpha * 0.15})`,
        border: `2.5px solid ${color}`, color, borderRadius: 12, padding: "4px 16px",
        fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 34, letterSpacing: "0.04em",
        textShadow: `0 0 18px ${color}`, boxShadow: `0 0 22px ${color}55, inset 0 0 14px ${color}33`,
        background: "rgba(0,0,0,0.25)", ...style,
      }}
    >
      {text}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, profile: myProfile, loading: authLoading } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [index, setIndex] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [exit, setExit] = useState<Exit | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [bioOpen, setBioOpen] = useState(false);

  const startRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const busy = useRef(false);

  const current = profiles[index];
  const next = profiles[index + 1];
  const pics = photosOf(current);
  const nextPic = photosOf(next)[0];

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
    if (!authLoading && user && !myProfile) router.replace("/onboarding");
  }, [authLoading, user, myProfile]);

  const loadProfiles = async () => {
    if (!user) {
      setFetching(false);
      setProfiles([]);
      return;
    }
    setFetching(true);
    const { data: swipes } = await supabase
      .from("swipes").select("swiped_id").eq("swiper_id", user.id);
    const swipedIds = swipes?.map(s => s.swiped_id) ?? [];

    let query = supabase.from("profiles").select("*").neq("id", user.id).limit(30);
    if (swipedIds.length > 0) query = query.not("id", "in", `(${swipedIds.join(",")})`);

    const { data } = await query;
    setProfiles((data as Profile[]) ?? []);
    setIndex(0);
    setPhotoIdx(0);
    setFetching(false);
  };

  useEffect(() => { loadProfiles(); }, [user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  // One path for every way of moving on: drag, buttons and keyboard.
  const commit = async (action: Exit) => {
    if (!user || !current || busy.current || exit) return;
    busy.current = true;
    setDragging(false);
    setExit(action);

    const req: PromiseLike<{ error: unknown }> = action === "later"
      ? Promise.resolve({ error: null })
      : supabase.from("swipes").insert({ swiper_id: user.id, swiped_id: current.id, action });
    const [res] = await Promise.all([req, new Promise(r => setTimeout(r, 380))]);
    if (res.error) showToast("Couldn't save that swipe");

    setIndex(i => i + 1);
    setExit(null);
    setDrag({ x: 0, y: 0 });
    setPhotoIdx(0);
    setBioOpen(false);
    busy.current = false;
  };

  // Arrow keys on desktop: left = pass, right = like, up = super like.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") commit("like");
      else if (e.key === "ArrowLeft") commit("pass");
      else if (e.key === "ArrowUp") commit("superlike");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── drag handling ──
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (exit || busy.current) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    setDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not supported */ }
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) movedRef.current = true;
    if (movedRef.current) setDrag({ x: dx, y: Math.min(dy, 60) });
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    if (!s) return;
    startRef.current = null;
    setDragging(false);
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;

    if (!movedRef.current) {
      // a tap: left edge = previous photo, right edge = next photo
      setDrag({ x: 0, y: 0 });
      if (pics.length > 1) {
        const rect = e.currentTarget.getBoundingClientRect();
        const rel = (e.clientX - rect.left) / rect.width;
        if (rel < 0.35) setPhotoIdx(i => Math.max(0, i - 1));
        else if (rel > 0.65) setPhotoIdx(i => Math.min(pics.length - 1, i + 1));
      }
      return;
    }
    if (dx > THRESH_X) commit("like");
    else if (dx < -THRESH_X) commit("pass");
    else if (dy < -THRESH_Y) commit("superlike");
    else setDrag({ x: 0, y: 0 });
  };
  const onCancel = () => { startRef.current = null; setDragging(false); setDrag({ x: 0, y: 0 }); };

  const toastEl = toast && (
    <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "#FF3366", color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 20px", borderRadius: 50, whiteSpace: "nowrap", animation: "hpToast 0.3s ease both" }}>
      {toast}
    </div>
  );

  // ── loading ──
  if (authLoading || fetching) return (
    <main style={shell}>
      <style>{CSS}</style>
      <Header />
      <div style={{ padding: "10px 20px 12px" }}>
        <div className="hp-skel" style={{ width: 130, height: 26, borderRadius: 8 }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, margin: "0 14px" }}>
        <div className="hp-skel" style={{ width: "100%", height: "100%", borderRadius: 28, border: "1px solid rgba(255,255,255,0.08)" }} />
      </div>
      <div style={{ height: BOTTOM_NAV_HEIGHT + 150 }} />
      <BottomNav />
    </main>
  );

  // ── everyone seen ──
  if (!current) return (
    <main style={shell}>
      <style>{CSS}</style>
      {toastEl}
      <Header />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: `0 32px ${BOTTOM_NAV_HEIGHT}px`, textAlign: "center" }}>
        <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden style={{ marginBottom: 6 }}>
          <g className="hp-spin" style={{ transformOrigin: "60px 60px" }}>
            <circle cx="60" cy="60" r="54" fill="none" stroke={GOLD} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 6" />
            <circle cx="114" cy="60" r="3.5" fill="#f3dc7a" />
          </g>
          <g className="hp-spin-rev" style={{ transformOrigin: "60px 60px" }}>
            <path d="M60 28 L92 60 L60 92 L28 60 Z" fill="none" stroke={GOLD} strokeOpacity="0.85" strokeWidth="1.2" />
          </g>
          <circle cx="60" cy="60" r="6" fill={GOLD} fillOpacity="0.9" />
        </svg>
        <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 30, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
          You've seen everyone nearby
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, maxWidth: 280 }}>
          New souls join every day. Check back soon, or refresh to look again.
        </p>
        <button
          className="hp-btn"
          onClick={loadProfiles}
          style={{ background: `linear-gradient(135deg, #e6c24f, ${GOLD} 55%, #b8901f)`, border: "none", borderRadius: 50, padding: "13px 32px", fontSize: 14, fontWeight: 800, color: "#000", marginTop: 6, boxShadow: "0 8px 28px rgba(212,175,55,0.35)" }}
        >
          Refresh
        </button>
      </div>
      <BottomNav />
    </main>
  );

  // ── the card ──
  const sig = SIGNATURES[hash(current.id) % SIGNATURES.length];
  const badgeKey = (current.looking_for && BADGE[current.looking_for] ? current.looking_for : "relationship") as IconName;
  const badge = BADGE[badgeKey];
  const photoSrc = pics[Math.min(photoIdx, Math.max(0, pics.length - 1))];

  const likeA = exit === "like" ? 1 : clamp(drag.x / THRESH_X);
  const passA = exit === "pass" ? 1 : clamp(-drag.x / THRESH_X);
  const superA = exit === "superlike" ? 1 : clamp(-drag.y / THRESH_Y) * (Math.abs(drag.x) < THRESH_X ? 1 : 0);

  const tx = exit === "like" ? 560 : exit === "pass" ? -560 : exit ? 0 : drag.x;
  const ty = exit === "superlike" ? -760 : exit === "later" ? 70 : drag.y;
  const rot = exit === "like" ? 20 : exit === "pass" ? -20 : exit ? 0 : drag.x / 16;
  const peek = exit ? 1 : 0.94 + 0.06 * clamp(Math.max(Math.abs(drag.x) / THRESH_X, -drag.y / THRESH_Y));
  const peekP = (peek - 0.94) / 0.06;
  const ease = "transform 0.38s cubic-bezier(.2,.8,.2,1), opacity 0.38s ease";

  return (
    <main style={shell}>
      <style>{CSS}</style>
      {toastEl}
      <Header />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 12px" }}>
        <h1 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 28, color: "#fff", letterSpacing: "-0.01em", lineHeight: 1 }}>
          Discover
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 50, padding: "6px 12px" }}>
          <span className="hp-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#3ddc84", boxShadow: "0 0 8px #3ddc84" }} />
          {profiles.length - index} {profiles.length - index === 1 ? "soul" : "souls"} near you
        </div>
      </div>

      <IconDefs />

      {/* stage: the next card waits underneath */}
      <div style={{ position: "relative", flex: 1, minHeight: 0, margin: "0 14px" }}>
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, borderRadius: 28, overflow: "hidden", background: "#0b0b12",
            border: "1px solid rgba(255,255,255,0.08)",
            transform: `scale(${peek}) translateY(${(1 - peekP) * 14}px)`,
            transition: dragging ? "none" : "transform 0.38s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          {nextPic && <img src={nextPic} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />}
          <div style={{ position: "absolute", inset: 0, background: "rgba(7,7,12,0.45)" }} />
        </div>

        <div
          key={current.id}
          className="hp-card"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
          style={{
            position: "absolute", inset: 0, borderRadius: 28, overflow: "hidden", background: "#0b0b12",
            border: `1px solid rgba(${sig},0.4)`,
            boxShadow: `0 0 34px rgba(${sig},0.22), 0 18px 50px rgba(0,0,0,0.5)`,
            touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
            cursor: dragging ? "grabbing" : "grab", willChange: "transform",
            transform: `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg)`,
            opacity: exit ? 0 : 1,
            transition: dragging ? "none" : ease,
          }}
        >
          {photoSrc ? (
            <img key={photoSrc} className="hp-photo" src={photoSrc} alt={current.name} draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Silhouette sig={sig} />
          )}

          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 22%, transparent 42%, rgba(0,0,0,0.9) 100%)" }} />

          {/* photo progress */}
          {pics.length > 1 && (
            <div style={{ position: "absolute", top: 12, left: 14, right: 14, zIndex: 5, display: "flex", gap: 4, pointerEvents: "none" }}>
              {pics.map((_, i) => (
                <span key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= photoIdx ? "#fff" : "rgba(255,255,255,0.3)", boxShadow: i <= photoIdx ? `0 0 8px rgba(${sig},0.8)` : "none", transition: "background 0.2s" }} />
              ))}
            </div>
          )}

          {/* swipe stamps */}
          <Stamp text="LIKE" color="#F3DC7A" rotate={-12} alpha={likeA} style={{ top: 48, left: 20 }} />
          <Stamp text="PASS" color="#FF5C85" rotate={12} alpha={passA} style={{ top: 48, right: 20 }} />
          <Stamp text="SUPER" color="#7DB8FB" rotate={0} alpha={superA} style={{ top: "38%", left: "50%", marginLeft: -62 }} />

          {/* identity */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 5, padding: "60px 20px 20px", pointerEvents: "none" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, minWidth: 0 }}>
                <span style={{ fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", textShadow: "0 2px 14px rgba(0,0,0,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{current.name}</span>
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.78)" }}>{current.age}</span>
              </div>
              {current.looking_for && (
                <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, background: badge.bg, color: badge.color, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 50, border: `1px solid ${badge.color}55` }}>
                  <Icon name={badgeKey} size={18} />
                  <span>{current.looking_for.charAt(0).toUpperCase() + current.looking_for.slice(1)}</span>
                </span>
              )}
            </div>

            {current.location && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 10 }}>
                <MapPin size={13} color={`rgb(${sig})`} /> {current.location}
              </div>
            )}

            {current.bio && (
              <p
                role="button"
                onPointerDown={e => e.stopPropagation()}
                onClick={() => setBioOpen(o => !o)}
                style={{
                  fontSize: 13.5, color: "rgba(255,255,255,0.82)", lineHeight: 1.55, marginBottom: 14, cursor: "pointer", pointerEvents: "auto",
                  ...(bioOpen ? {} : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }),
                }}
              >
                {current.bio}
              </p>
            )}

            <button
              className="hp-btn"
              onPointerDown={e => e.stopPropagation()}
              onClick={() => router.push("/chats")}
              style={{ width: "100%", pointerEvents: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(255,255,255,0.1)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 14, padding: "12px 0", color: "#fff", fontSize: 14, fontWeight: 600 }}
            >
              <MessageCircle size={16} /> Send a message
            </button>
          </div>
        </div>
      </div>

      {/* actions */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 16, padding: `14px 0 ${BOTTOM_NAV_HEIGHT + 10}px` }}>
        <ActionBtn label="Pass" size={58} onClick={() => commit("pass")} disabled={!!exit} bg="rgba(24,12,18,0.78)" border="1.5px solid rgba(255,92,133,0.5)" glow="0 6px 22px rgba(255,51,102,0.22)">
          <Icon name="pass" size={26} />
        </ActionBtn>
        <ActionBtn label="Super" size={52} onClick={() => commit("superlike")} disabled={!!exit} bg="rgba(10,18,32,0.78)" border="1.5px solid rgba(125,184,251,0.5)" glow="0 6px 22px rgba(96,165,250,0.22)">
          <Icon name="super" size={26} />
        </ActionBtn>
        <ActionBtn label="Like" size={76} onClick={() => commit("like")} disabled={!!exit} bg="radial-gradient(circle at 30% 25%, rgba(255,140,170,0.28), rgba(22,10,16,0.88))" border={`2px solid ${GOLD}`} glow="0 8px 34px rgba(255,51,102,0.4), 0 0 0 5px rgba(212,175,55,0.12)">
          <Icon name="like" size={38} />
        </ActionBtn>
        <ActionBtn label="Later" size={52} onClick={() => commit("later")} disabled={!!exit} bg="rgba(18,12,32,0.78)" border="1.5px solid rgba(167,139,250,0.5)" glow="0 6px 22px rgba(139,107,224,0.22)">
          <Icon name="later" size={26} />
        </ActionBtn>
      </div>

      <BottomNav />
    </main>
  );
}