"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import BottomNav, { BOTTOM_NAV_HEIGHT } from "@/components/BottomNav";
import Header from "@/components/Header";
import ProfilePreviewModal from "@/components/ProfilePreviewModal";
import { Icon, Silhouette, type IconName } from "@/components/SoulIcons";
import type { Profile } from "@/lib/types";
import { MapPin, MessageCircle } from "lucide-react";

const GOLD = "#D4AF37";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const GOLD_BTN = "linear-gradient(180deg, #f6e08a 0%, #D4AF37 48%, #a9801a 100%)";
const GOLD_BTN_SHADOW = "inset 0 1px 0 rgba(255,255,255,0.55), 0 8px 22px -6px rgba(212,175,55,0.5)";

const BADGE: Record<string, { color: string; label: string }> = {
  relationship: { color: "#FF8FAE", label: "Relationship" },
  casual:       { color: "#8EC4FA", label: "Casual" },
  friendship:   { color: "#EAC95E", label: "Friendship" },
  fwb:          { color: "#58E5B1", label: "FWB" },
};

// Each person keeps one signature hue across the feed, discover and likes.
const SIGNATURES = ["212,175,55", "205,96,58", "52,150,108", "112,92,205", "214,134,82", "46,156,176"];
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

type LikeEntry = { profile: Profile; action: string; created_at: string; matched: boolean; passed: boolean };
type Filter = "all" | "new" | "matched";
const FILTERS: [Filter, string][] = [["all", "All"], ["new", "New"], ["matched", "Matched"]];

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const CSS = `
  @keyframes lkRise { from { opacity: 0; transform: translateY(22px); filter: blur(6px); } to { opacity: 1; transform: none; filter: blur(0); } }
  @keyframes lkShimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
  @keyframes lkSpin { to { transform: rotate(360deg); } }
  @keyframes lkBreathe { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.35); } }
  @keyframes lkPop { from { opacity: 0; transform: scale(0.94) translateY(24px); } to { opacity: 1; transform: none; } }
  @keyframes lkBeat { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.14); } }
  @keyframes lkRing { 0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.7; } 100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; } }
  @keyframes lkGoldShimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
  @keyframes lkMote { 0% { transform: translateY(0) scale(0.6); opacity: 0; } 20% { opacity: 0.9; } 100% { transform: translateY(-260px) scale(1); opacity: 0; } }
  @keyframes lkToast { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }

  .lk-card { animation: lkRise 0.8s cubic-bezier(.2,.8,.2,1) backwards; transition: transform 0.4s cubic-bezier(.2,.8,.2,1), opacity 0.35s ease; }
  .lk-card:active { transform: scale(0.988); }
  .lk-card.lk-leave { opacity: 0; transform: scale(0.94) translateY(8px); pointer-events: none; }
  .lk-card:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
  .lk-img { transition: transform 1.4s cubic-bezier(.2,.8,.2,1); }
  .lk-card:hover .lk-img { transform: scale(1.045); }
  .lk-fade { animation: lkRise 0.7s cubic-bezier(.2,.8,.2,1) backwards; }

  .lk-skel { background: linear-gradient(90deg, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 80%); background-size: 200% 100%; animation: lkShimmer 1.8s linear infinite; }
  .lk-dot { animation: lkBreathe 2.6s ease-in-out infinite; }
  .lk-spin { animation: lkSpin 48s linear infinite; }
  .lk-spin-rev { animation: lkSpin 30s linear infinite reverse; }
  .lk-pop { animation: lkPop 0.7s cubic-bezier(.2,.8,.2,1) both; }
  .lk-beat { animation: lkBeat 1.6s ease-in-out infinite; }
  .lk-ring { animation: lkRing 2.6s ease-out infinite; }
  .lk-mote { animation: lkMote 6s ease-in infinite; }
  .lk-gold {
    background: linear-gradient(90deg, #b8901f, #f6e08a, #D4AF37, #f6e08a, #b8901f);
    background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent; color: transparent; animation: lkGoldShimmer 6s linear infinite;
  }

  .lk-btn { transition: transform 0.2s ease, filter 0.25s ease, background 0.25s ease, border-color 0.25s ease; cursor: pointer; }
  .lk-btn:hover:not(:disabled) { filter: brightness(1.08); }
  .lk-btn:active:not(:disabled) { transform: scale(0.96); }
  .lk-btn:disabled { opacity: 0.5; cursor: default; }
  .lk-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  .lk-link { background: none; border: none; cursor: pointer; transition: color 0.2s ease; }
  .lk-link:hover { color: #fff; }

  .lk-scroll { scrollbar-width: none; }
  .lk-scroll::-webkit-scrollbar { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .lk-card, .lk-fade, .lk-skel, .lk-dot, .lk-spin, .lk-spin-rev, .lk-pop, .lk-beat, .lk-ring, .lk-mote, .lk-gold, .lk-img { animation: none !important; transition: none !important; }
    .lk-gold { color: #D4AF37; -webkit-text-fill-color: #D4AF37; background: none; }
  }
`;

const shell: React.CSSProperties = {
  height: "100dvh", width: "100%", maxWidth: 430, margin: "0 auto", position: "relative", overflow: "hidden",
  display: "flex", flexDirection: "column", fontFamily: "system-ui, -apple-system, sans-serif", color: "#fff",
  background: "radial-gradient(80% 38% at 95% 6%, rgba(212,175,55,0.12), transparent 70%), radial-gradient(70% 40% at 0% 70%, rgba(112,92,205,0.13), transparent 70%), #07070c",
};

const glass: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(12,10,16,0.5)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.2)",
};

function Emblem() {
  return (
    <div style={{ position: "relative", width: 120, height: 120 }}>
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden style={{ position: "absolute", inset: 0 }}>
        <g className="lk-spin" style={{ transformOrigin: "60px 60px" }}>
          <circle cx="60" cy="60" r="56" fill="none" stroke={GOLD} strokeOpacity="0.45" strokeWidth="1" strokeDasharray="1 7" strokeLinecap="round" />
          <circle cx="116" cy="60" r="3" fill="#f6e08a" />
        </g>
        <g className="lk-spin-rev" style={{ transformOrigin: "60px 60px" }}>
          <path d="M60 22 L98 60 L60 98 L22 60 Z" fill="none" stroke={GOLD} strokeOpacity="0.55" strokeWidth="1" />
        </g>
      </svg>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
        <Icon name="like" size={34} />
      </div>
    </div>
  );
}

function Face({ src, size, sig }: { src: string | null | undefined; size: number; sig: string }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div style={{ position: "absolute", inset: -7, borderRadius: "50%", border: "1px solid rgba(212,175,55,0.5)" }} />
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#111", border: `1.5px solid ${GOLD}`, boxShadow: "0 0 40px rgba(212,175,55,0.35)" }}>
        {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Silhouette sig={sig} />}
      </div>
    </div>
  );
}

// ── one admirer: a framed portrait ────────────────────────────────────────────
function Card({ entry, hero, index, busy, leaving, onOpen, onPass, onLikeBack, onMessage }: {
  entry: LikeEntry; hero: boolean; index: number; busy: boolean; leaving: boolean;
  onOpen: () => void; onPass: () => void; onLikeBack: () => void; onMessage: () => void;
}) {
  const p = entry.profile;
  const badgeKey = (p.looking_for && BADGE[p.looking_for] ? p.looking_for : null) as IconName | null;
  const badge = badgeKey ? BADGE[badgeKey] : null;
  const photo = avatarUrl(p.photos?.[0] ?? p.avatar_url);
  const sig = SIGNATURES[hash(p.id) % SIGNATURES.length];
  const isSuper = entry.action === "superlike";
  const circle = hero ? 40 : 34;
  const btnH = hero ? 48 : 40;

  return (
    <article
      className={`lk-card${leaving ? " lk-leave" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${p.name}, ${p.age}. Open profile`}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      style={{
        position: "relative", overflow: "hidden", cursor: "pointer", background: "#0b0b12",
        aspectRatio: hero ? "4 / 5.1" : "3 / 5", borderRadius: hero ? 28 : 22,
        boxShadow: entry.matched
          ? "0 22px 44px -20px rgba(0,0,0,0.9), 0 0 36px -8px rgba(212,175,55,0.45), 0 0 0 1px rgba(212,175,55,0.35)"
          : `0 22px 44px -20px rgba(0,0,0,0.9), 0 0 32px -12px rgba(${sig},0.5), 0 0 0 1px rgba(255,255,255,0.07)`,
        animationDelay: `${Math.min(index, 8) * 0.07}s`,
      }}
    >
      {photo
        ? <img className="lk-img" src={photo} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        : <Silhouette sig={sig} />}

      {/* soft veil: calm at the top, deep at the bottom so the type always reads */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to bottom, rgba(5,5,10,0.4) 0%, rgba(5,5,10,0) 24%, rgba(5,5,10,0) 36%, rgba(5,5,10,0.6) 62%, rgba(5,5,10,0.94) 100%)" }} />

      {/* the mat: a fine inner frame, brighter once matched */}
      <div style={{ position: "absolute", inset: hero ? 10 : 8, borderRadius: hero ? 20 : 15, pointerEvents: "none", border: entry.matched ? "1px solid rgba(212,175,55,0.75)" : `1px solid rgba(${sig},0.3)` }} />

      {/* top: what they are looking for, and any special signal */}
      <div style={{ position: "absolute", top: hero ? 22 : 18, left: hero ? 22 : 18, right: hero ? 22 : 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start", pointerEvents: "none" }}>
        {badge && badgeKey ? (
          hero ? (
            <span style={{ ...glass, gap: 8, height: circle, padding: "0 16px 0 7px", borderRadius: 50 }}>
              <Icon name={badgeKey} size={26} />
              <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 16, color: badge.color }}>{badge.label}</span>
            </span>
          ) : (
            <span title={badge.label} aria-label={badge.label} style={{ ...glass, width: circle, height: circle, borderRadius: "50%" }}>
              <Icon name={badgeKey} size={23} />
            </span>
          )
        ) : <span />}

        {entry.matched ? (
          <span style={{ ...glass, gap: 6, height: hero ? 36 : 30, padding: "0 12px 0 8px", borderRadius: 50, border: "1px solid rgba(212,175,55,0.7)", background: "rgba(212,175,55,0.18)" }}>
            <Icon name="like" size={hero ? 20 : 17} />
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: hero ? 16 : 14, color: "#f6e08a" }}>Matched</span>
          </span>
        ) : isSuper ? (
          hero ? (
            <span style={{ ...glass, gap: 8, height: circle, padding: "0 16px 0 7px", borderRadius: 50, border: "1px solid rgba(142,196,250,0.55)" }}>
              <Icon name="super" size={26} />
              <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 16, color: "#b9dcff" }}>Super liked you</span>
            </span>
          ) : (
            <span title="Super liked you" aria-label="Super liked you" style={{ ...glass, width: circle, height: circle, borderRadius: "50%", border: "1px solid rgba(142,196,250,0.55)", boxShadow: "0 0 16px rgba(142,196,250,0.35)" }}>
              <Icon name="super" size={23} />
            </span>
          )
        ) : null}
      </div>

      {/* bottom: name, place, moment, actions */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: hero ? "0 26px 26px" : "0 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
          <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: hero ? 36 : 25, lineHeight: 1.05, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 2px 14px rgba(0,0,0,0.55)" }}>{p.name}</span>
          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: hero ? 26 : 19, color: "rgba(255,255,255,0.72)", flexShrink: 0 }}>{p.age}</span>
        </div>
        {p.location && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: hero ? 8 : 6, fontSize: hero ? 12.5 : 11, letterSpacing: "0.04em", color: "rgba(255,255,255,0.68)", whiteSpace: "nowrap", overflow: "hidden" }}>
            <MapPin size={hero ? 12 : 11} color={`rgb(${sig})`} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.location}</span>
          </div>
        )}
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: hero ? 16 : 14, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>
          Liked you {timeAgo(entry.created_at)}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: hero ? 16 : 12 }}>
          {!entry.matched ? (
            <>
              <button
                className="lk-btn"
                disabled={busy}
                aria-label={`Pass on ${p.name}`}
                onClick={e => { e.stopPropagation(); onPass(); }}
                style={{ ...glass, width: btnH, height: btnH, flexShrink: 0, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.06)" }}
              >
                <Icon name="pass" size={hero ? 22 : 19} />
              </button>
              <button
                className="lk-btn"
                disabled={busy}
                onClick={e => { e.stopPropagation(); onLikeBack(); }}
                style={{ flex: 1, height: btnH, borderRadius: 50, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: hero ? 14.5 : 13, fontWeight: 700, letterSpacing: "0.02em", color: "#1a1204", background: GOLD_BTN, boxShadow: GOLD_BTN_SHADOW }}
              >
                <Icon name="like" size={hero ? 22 : 19} /> Like back
              </button>
            </>
          ) : (
            <button
              className="lk-btn"
              onClick={e => { e.stopPropagation(); onMessage(); }}
              style={{ ...glass, flex: 1, height: btnH, borderRadius: 50, gap: 8, fontSize: hero ? 14.5 : 13, fontWeight: 700, letterSpacing: "0.02em", color: "#f6e08a", border: "1px solid rgba(212,175,55,0.7)", background: "rgba(212,175,55,0.12)" }}
            >
              <MessageCircle size={15} /> Message
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function LikesPage() {
  const router = useRouter();
  const { user, profile: myProfile, loading: authLoading } = useAuth();

  const [likes, setLikes] = useState<LikeEntry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [toast, setToast] = useState<string | null>(null);
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [matchFor, setMatchFor] = useState<Profile | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetching(true);

      const { data: rawLikes } = await supabase
        .from("swipes")
        .select("swiper_id, action, created_at")
        .eq("swiped_id", user.id)
        .in("action", ["like", "superlike"])
        .order("created_at", { ascending: false });

      if (!rawLikes?.length) { setLikes([]); setFetching(false); return; }

      // One entry per person (newest first); a super like wins over a plain like.
      const latest = new Map<string, { swiper_id: string; action: string; created_at: string }>();
      rawLikes.forEach(l => {
        const seen = latest.get(l.swiper_id);
        if (!seen) latest.set(l.swiper_id, l);
        else if (l.action === "superlike" && seen.action !== "superlike") latest.set(l.swiper_id, { ...seen, action: "superlike" });
      });
      const entries = Array.from(latest.values());
      const ids = entries.map(l => l.swiper_id);

      const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
      const profileMap: Record<string, Profile> = {};
      profiles?.forEach(p => { profileMap[p.id] = p as Profile; });

      const { data: myMatches } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      const matchedIds = new Set<string>();
      myMatches?.forEach(m => { matchedIds.add(m.user1_id === user.id ? m.user2_id : m.user1_id); });

      // People I already passed on stay hidden after a reload.
      const { data: mySwipes } = await supabase
        .from("swipes").select("swiped_id, action").eq("swiper_id", user.id).in("swiped_id", ids);
      const passedIds = new Set<string>();
      mySwipes?.forEach(s => { if (s.action === "pass") passedIds.add(s.swiped_id); });

      setLikes(
        entries
          .map(l => ({
            profile: profileMap[l.swiper_id],
            action: l.action,
            created_at: l.created_at,
            matched: matchedIds.has(l.swiper_id),
            passed: passedIds.has(l.swiper_id) && !matchedIds.has(l.swiper_id),
          }))
          .filter(l => l.profile)
      );
      setFetching(false);
    })();
  }, [user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleLikeBack = async (entry: LikeEntry) => {
    if (!user || busyId) return;
    setBusyId(entry.profile.id);

    const { error: swipeErr } = await supabase.from("swipes").insert({
      swiper_id: user.id,
      swiped_id: entry.profile.id,
      action: "like",
    });
    // 23505 = already swiped before; carry on and make sure the match exists
    if (swipeErr && swipeErr.code !== "23505") {
      showToast("Couldn't like back. Try again.");
      setBusyId(null);
      return;
    }

    const [u1, u2] = [user.id, entry.profile.id].sort();
    const { error: matchErr } = await supabase.from("matches").insert({
      user1_id: u1,
      user2_id: u2,
      created_at: new Date().toISOString(),
    });
    if (matchErr && matchErr.code !== "23505") {
      showToast("Couldn't create the match. Try again.");
      setBusyId(null);
      return;
    }

    setLikes(l => l.map(e => (e.profile.id === entry.profile.id ? { ...e, matched: true } : e)));
    setMatchFor(entry.profile);
    setBusyId(null);
  };

  // The card eases out while the pass is saved, so it never just vanishes.
  const handlePass = async (entry: LikeEntry) => {
    if (!user || busyId) return;
    const id = entry.profile.id;
    setBusyId(id);
    setLeaving(s => new Set(s).add(id));

    const [res] = await Promise.all([
      supabase.from("swipes").insert({ swiper_id: user.id, swiped_id: id, action: "pass" }),
      new Promise(r => setTimeout(r, 360)),
    ]);

    const failed = res.error && res.error.code !== "23505";
    if (!failed) setLikes(l => l.map(e => (e.profile.id === id ? { ...e, passed: true } : e)));
    setLeaving(s => { const n = new Set(s); n.delete(id); return n; });
    if (failed) showToast("Couldn't save that. Try again.");
    setBusyId(null);
  };

  const visible = likes.filter(e =>
    filter === "new" ? !e.matched && !e.passed :
    filter === "matched" ? e.matched :
    !e.passed
  );
  const newCount = likes.filter(e => !e.matched && !e.passed).length;
  const matchedCount = likes.filter(e => e.matched).length;
  const allCount = likes.filter(e => !e.passed).length;
  const counts: Record<Filter, number> = { all: allCount, new: newCount, matched: matchedCount };

  const toastEl = toast && (
    <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 400, background: "rgba(24,10,16,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,92,133,0.55)", color: "#ffc2d1", fontSize: 13, fontWeight: 600, padding: "11px 22px", borderRadius: 50, whiteSpace: "nowrap", animation: "lkToast 0.3s ease both" }}>
      {toast}
    </div>
  );

  // ── loading ──
  if (authLoading || fetching) return (
    <main style={shell}>
      <style>{CSS}</style>
      <Header />
      <div style={{ padding: "10px 22px 18px" }}>
        <div className="lk-skel" style={{ width: 130, height: 38, borderRadius: 8, marginBottom: 12 }} />
        <div className="lk-skel" style={{ width: 190, height: 14, borderRadius: 6 }} />
      </div>
      <div style={{ padding: "0 16px" }}>
        <div className="lk-skel" style={{ aspectRatio: "4 / 5.1", borderRadius: 28, maxHeight: 360 }} />
      </div>
      <BottomNav />
    </main>
  );

  const me = myProfile as unknown as { photos?: string[]; avatar_url?: string | null } | null;
  const myPhoto = avatarUrl(me?.photos?.[0] ?? me?.avatar_url);
  const matchPhoto = matchFor ? avatarUrl(matchFor.photos?.[0] ?? matchFor.avatar_url) : null;

  const emptyTitle =
    filter === "new" ? "No new likes yet" :
    filter === "matched" ? "No matches yet" : "Nothing here yet";
  const emptyText =
    filter === "matched" ? "Like someone back and your first match will appear here." :
    "When someone likes your profile, they will appear here.";

  const [hero, ...rest] = visible;
  const leftCol = rest.filter((_, i) => i % 2 === 0);
  const rightCol = rest.filter((_, i) => i % 2 === 1);
  const activeIdx = FILTERS.findIndex(f => f[0] === filter);

  const cardProps = (entry: LikeEntry, index: number, isHero: boolean) => ({
    entry, index, hero: isHero,
    busy: busyId === entry.profile.id,
    leaving: leaving.has(entry.profile.id),
    onOpen: () => setPreviewProfile(entry.profile),
    onPass: () => handlePass(entry),
    onLikeBack: () => handleLikeBack(entry),
    onMessage: () => router.push("/chats"),
  });

  return (
    <main style={shell}>
      <style>{CSS}</style>
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.05, mixBlendMode: "overlay", backgroundImage: GRAIN }} />
      {toastEl}
      <Header />

      {previewProfile && <ProfilePreviewModal profile={previewProfile} onClose={() => setPreviewProfile(null)} />}

      {/* title */}
      <div style={{ position: "relative", padding: "6px 22px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 44, letterSpacing: "-0.015em", lineHeight: 0.95 }}>Likes</h1>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: "rgba(255,255,255,0.58)", margin: "8px 0 0" }}>
              {allCount > 0 ? `${allCount} ${allCount === 1 ? "person admires" : "people admire"} you` : "Those who admire you"}
            </p>
          </div>
          {newCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 17, color: "#f6e08a", paddingBottom: 4 }}>
              <span className="lk-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, boxShadow: `0 0 10px ${GOLD}` }} />
              {newCount} new
            </div>
          )}
        </div>
        <div style={{ height: 1, marginTop: 16, background: "linear-gradient(90deg, rgba(212,175,55,0), rgba(212,175,55,0.65), rgba(212,175,55,0))" }} />
      </div>

      {/* tabs: quiet text with a gold line that glides between them */}
      <div style={{ position: "relative", display: "flex", margin: "4px 22px 14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }} role="tablist">
        {FILTERS.map(([key, label]) => {
          const active = filter === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(key)}
              className="lk-link"
              style={{ flex: 1, padding: "12px 0 11px", fontFamily: SERIF, fontStyle: "italic", fontWeight: active ? 700 : 500, fontSize: 19, color: active ? "#fff" : "rgba(255,255,255,0.5)" }}
            >
              {label}
              <sup style={{ fontFamily: "system-ui", fontStyle: "normal", fontSize: 10.5, fontWeight: 600, marginLeft: 4, opacity: active ? 0.85 : 0.5 }}>{counts[key]}</sup>
            </button>
          );
        })}
        <span aria-hidden style={{ position: "absolute", left: 0, bottom: -1, width: `${100 / FILTERS.length}%`, height: 2, transform: `translateX(${activeIdx * 100}%)`, transition: "transform 0.5s cubic-bezier(.2,.8,.2,1)", background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, boxShadow: `0 0 12px ${GOLD}` }} />
      </div>

      {/* the gallery */}
      <div
        className="lk-scroll"
        style={{ position: "relative", flex: 1, minHeight: 0, overflowY: "auto", padding: `10px 16px ${BOTTOM_NAV_HEIGHT + 24}px`, WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 14px)", maskImage: "linear-gradient(to bottom, transparent 0, #000 14px)" }}
      >
        {visible.length === 0 ? (
          <div key={filter} className="lk-fade" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, paddingTop: 40 }}>
            <Emblem />
            <h2 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 30, fontWeight: 600 }}>{emptyTitle}</h2>
            <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: "rgba(255,255,255,0.58)", lineHeight: 1.5, maxWidth: 270 }}>{emptyText}</p>
          </div>
        ) : (
          <div key={filter} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card {...cardProps(hero, 0, true)} />
            {rest.length > 0 && (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
                  {leftCol.map((e, i) => <Card key={e.profile.id} {...cardProps(e, 1 + i * 2, false)} />)}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0, marginTop: 36 }}>
                  {rightCol.map((e, i) => <Card key={e.profile.id} {...cardProps(e, 2 + i * 2, false)} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* match celebration */}
      {matchFor && (
        <div
          onClick={() => setMatchFor(null)}
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "radial-gradient(60% 40% at 50% 38%, rgba(212,175,55,0.16), transparent 70%), rgba(4,4,8,0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden" }}
        >
          {Array.from({ length: 16 }, (_, i) => {
            const h = hash(matchFor.id + i);
            return (
              <span key={i} className="lk-mote" aria-hidden style={{ position: "absolute", left: `${6 + (h % 88)}%`, bottom: `${8 + ((h >> 8) % 30)}%`, width: 2 + (h % 3), height: 2 + (h % 3), borderRadius: "50%", background: "#f6e08a", boxShadow: "0 0 10px #f6e08a", animationDelay: `${(h % 60) / 10}s`, animationDuration: `${5 + ((h >> 4) % 4)}s` }} />
            );
          })}
          <div className="lk-pop" onClick={e => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: 340, textAlign: "center" }}>
            <div style={{ position: "relative", width: 260, height: 140, margin: "0 auto 34px" }}>
              <span className="lk-ring" style={{ position: "absolute", left: "50%", top: "50%", width: 80, height: 80, borderRadius: "50%", border: `1px solid ${GOLD}` }} />
              <div style={{ position: "absolute", left: 14, top: 10 }}><Face src={myPhoto} size={118} sig="212,175,55" /></div>
              <div style={{ position: "absolute", left: 128, top: 10 }}>
                <Face src={matchPhoto} size={118} sig={SIGNATURES[hash(matchFor.id) % SIGNATURES.length]} />
              </div>
              <div className="lk-beat" style={{ position: "absolute", left: "50%", top: "50%", zIndex: 3 }}>
                <Icon name="like" size={52} />
              </div>
            </div>

            <h2 className="lk-gold" style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 50, letterSpacing: "-0.015em", lineHeight: 1, margin: "0 0 12px" }}>
              It's a match
            </h2>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 20, color: "rgba(255,255,255,0.7)", lineHeight: 1.45, margin: "0 0 30px" }}>
              You and {matchFor.name} admire each other.
            </p>

            <button
              className="lk-btn"
              onClick={() => { setMatchFor(null); router.push("/chats"); }}
              style={{ width: "100%", height: 54, borderRadius: 50, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontSize: 15, fontWeight: 700, letterSpacing: "0.02em", color: "#1a1204", background: GOLD_BTN, boxShadow: GOLD_BTN_SHADOW, marginBottom: 6 }}
            >
              <MessageCircle size={17} /> Say hello
            </button>
            <button
              className="lk-link"
              onClick={() => setMatchFor(null)}
              style={{ padding: "14px 20px", fontFamily: SERIF, fontStyle: "italic", fontSize: 19, color: "rgba(255,255,255,0.6)" }}
            >
              Keep browsing
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}