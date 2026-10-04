"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl, postMediaUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import BottomNav, { BOTTOM_NAV_HEIGHT } from "@/components/BottomNav";
import Header from "@/components/Header";
import type { Post } from "@/lib/types";
import {
  Sparkles, MessageCircle, Share2, Bookmark, MoreHorizontal, X,
  Image as ImageIcon, Type as TypeIcon, Pencil, Trash2,
  Volume2, VolumeX, Inbox, Plus, ArrowUp, Zap, MapPin, Landmark, Flame, User, UserPlus, UserCheck, LayoutGrid, Users,
} from "lucide-react";

type Colors = ReturnType<typeof useTheme>["colors"];
type Tab = "soul" | "now" | "people" | "places" | "culture";

interface CommentItem {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { name: string; avatar_url?: string | null; photos?: string[] } | null;
}

const GOLD = "#D4AF37";
const BG_COLORS = ["#1a1a2e", "#2e1a1a", "#1a2e1e", "#2e2a1a", "#241a2e", "#1a2830", "#000000", "#3a2a1a"];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;
const HEAT = "255,122,40";
const profileHref = (id: string) => `/profile/${id}`; // change if your profile route is different

// Culture, stories and events work through hashtags in the caption, so no database change is needed.
const CULTURE_TAGS: [string, string][] = [
  ["Stories", "story"], ["Events", "event"], ["Food", "food"], ["History", "history"],
  ["Language", "language"], ["Festival", "festival"], ["Fashion", "fashion"], ["Tradition", "tradition"],
];
const ALL_CULTURE = ["culture", ...CULTURE_TAGS.map(t => t[1])];
const hasTag = (caption: string, tag: string) => new RegExp(`#${tag}\\b`, "i").test(caption);

function Caption({ text, sig }: { text: string; sig: string }) {
  return (
    <>
      {text.split(/(#\w+)/g).map((part, i) =>
        part.startsWith("#") ? <span key={i} style={{ color: `rgb(${sig})`, fontWeight: 700 }}>{part}</span> : part
      )}
    </>
  );
}

// Each author gets a signature hue, so all of their posts feel related.
const SIGNATURES = ["212,175,55", "205,96,58", "52,150,108", "112,92,205", "214,134,82", "46,156,176"];

// ── helpers ───────────────────────────────────────────────────────────────────
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}
function useDoubleTap(onSingle: (() => void) | null, onDouble: () => void, delay = 250) {
  const lastTap = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return () => {
    const now = Date.now();
    if (now - lastTap.current < delay) {
      if (timer.current) clearTimeout(timer.current);
      lastTap.current = 0;
      onDouble();
    } else {
      lastTap.current = now;
      timer.current = setTimeout(() => { onSingle?.(); }, delay);
    }
  };
}

// ── One post = one full-screen scene ──────────────────────────────────────────
interface SoulPostProps {
  post: Post;
  isOwner: boolean;
  menuOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  likers: { id: string; photo: string | null }[];
  hot: boolean;
  arriving: boolean;
  orbit: CommentItem[];
  soundOn: boolean;
  onToggleSound: () => void;
  onNode: () => void;
  incoming: number;
  onToggleMenu: () => void;
  onFeel: () => void;
  onFollow: () => void;
  onSave: () => void;
  onTalk: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SoulPost(p: SoulPostProps) {
  const { post } = p;
  const photo = avatarUrl(post.profile?.photos?.[0] ?? post.profile?.avatar_url);
  const media = postMediaUrl(post.media_url);
  const isVideo = post.type === "video";
  const isText = post.type === "text";

  const sig = SIGNATURES[hash(post.user_id) % SIGNATURES.length];
  const energy = post.likes_count + post.comments_count * 2;
  const heat = Math.min(1, Math.max(energy / 40, p.hot ? 0.6 : 0));

  const videoRef = useRef<HTMLVideoElement>(null);
  const muted = !p.soundOn;
  const [bursts, setBursts] = useState<{ id: number; origin: "dock" | "center" }[]>([]);

  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    const el = videoRef.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        const r = entry.intersectionRatio;
        if (entry.isIntersecting && r > 0.6) el.play().catch(() => {});
        else el.pause();
        // spatial audio: sound swells as the post nears the middle of the screen
        el.volume = Math.max(0, Math.min(1, (r - 0.4) / 0.6));
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isVideo]);

  const addBurst = (origin: "dock" | "center") => {
    const id = Date.now() + Math.random();
    setBursts(b => [...b, { id, origin }]);
    setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 1200);
  };

  // Someone else just felt this post: their energy lands on it live.
  useEffect(() => { if (p.incoming > 0) addBurst("center"); }, [p.incoming]);

  const feel = () => {
    if (!post.user_liked) addBurst("dock");
    p.onFeel();
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  };

  const handleTap = useDoubleTap(isVideo ? togglePlay : null, () => {
    addBurst("center");
    if (!post.user_liked) p.onFeel();
  });

  // Generative text-post world: base colour is the author's choice, light is theirs.
  const world = useMemo(() => {
    const r = rng(hash(post.id));
    const x1 = 15 + r() * 70, y1 = 10 + r() * 35, x2 = 15 + r() * 70, y2 = 55 + r() * 35;
    const dots = Array.from({ length: 14 }, () => ({
      left: r() * 100, top: r() * 100, size: 2 + r() * 3,
      dur: 7 + r() * 9, delay: -r() * 12, drift: 20 + r() * 40,
    }));
    return { x1, y1, x2, y2, dots };
  }, [post.id]);

  const felt = post.likes_count;
  const glow = p.hot ? HEAT : sig;

  return (
    <section
      id={`soul-${post.id}`}
      data-soul="1"
      className="soul-anim"
      style={{
        height: `calc(100% - ${BOTTOM_NAV_HEIGHT + 48}px)`, boxSizing: "border-box",
        // busy posts physically take more room in the stream
        padding: `${6 - heat * 4}px ${12 - heat * 8}px`, transition: "padding 0.6s",
        scrollSnapAlign: "start", scrollSnapStop: "always",
        animation: p.arriving ? "riverArrive 0.9s cubic-bezier(.2,.8,.2,1)" : undefined,
      }}
    >
      <div className="soul-anim" style={{
        position: "relative", height: "100%", borderRadius: 26, overflow: "hidden", background: "#0b0b12",
        border: `1px solid rgba(${glow},${0.28 + heat * 0.4})`,
        boxShadow: `0 0 ${14 + heat * 30}px rgba(${glow},${0.2 + heat * 0.3}), inset 0 0 ${30 + heat * 50}px rgba(${glow},${0.05 + heat * 0.2})`,
        transition: "box-shadow 0.6s, border-color 0.6s",
        animation: p.hot ? "heatField 2.8s ease-in-out infinite" : undefined,
        willChange: "transform",
      }}>
        {/* surface */}
        {isText ? (
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(60% 45% at ${world.x1}% ${world.y1}%, rgba(${sig},0.34), transparent 70%), radial-gradient(55% 45% at ${world.x2}% ${world.y2}%, rgba(${sig},0.18), transparent 70%), ${post.bg_color || "#1a1a2e"}`,
          }}>
            {world.dots.map((d, i) => (
              <span key={i} className="soul-anim" style={{
                position: "absolute", left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size,
                borderRadius: "50%", background: `rgba(${sig},0.8)`, boxShadow: `0 0 8px rgba(${sig},0.7)`,
                animation: `soulDrift ${d.dur}s ease-in-out ${d.delay}s infinite`,
                ["--drift" as string]: `${d.drift}px`,
              }} />
            ))}
          </div>
        ) : media ? (
          isVideo ? (
            <video ref={videoRef} src={media} muted={muted} loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <img src={media} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          )
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ImageIcon size={40} color="rgba(255,255,255,0.3)" />
          </div>
        )}

        <div style={{ position: "absolute", inset: 0, background: isText ? "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 25%, transparent 55%, rgba(0,0,0,0.7) 100%)" : "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 24%, transparent 48%, rgba(0,0,0,0.88) 100%)", pointerEvents: "none" }} />

        {/* tap surface: single = play/pause (video), double = feel */}
        <div onClick={handleTap} style={{ position: "absolute", inset: 0, zIndex: 1, cursor: "pointer" }} />

        {isText && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 30px", pointerEvents: "none" }}>
            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontSize: post.caption.length > 120 ? 21 : 28, lineHeight: 1.45, color: "#fff", textAlign: "center", textShadow: "0 2px 18px rgba(0,0,0,0.45)" }}>
              “<Caption text={post.caption} sig={sig} />”
            </p>
          </div>
        )}

        {/* feel particles */}
        {bursts.map(b => (
          <div key={b.id} style={{ position: "absolute", zIndex: 3, pointerEvents: "none", ...(b.origin === "center" ? { left: "50%", top: "46%" } : { left: 80, bottom: 43 }) }}>
            {Array.from({ length: 12 }, (_, i) => {
              const r = rng(Math.floor(b.id) + i);
              const dx = b.origin === "center" ? (r() - 0.5) * 260 : (r() - 0.2) * 200;
              const dy = b.origin === "center" ? (r() - 0.5) * 260 : -(180 + r() * 220);
              return (
                <span key={i} className="soul-anim" style={{
                  position: "absolute", width: 7, height: 7, borderRadius: "50%",
                  background: `rgb(${sig})`, boxShadow: `0 0 12px rgb(${sig})`,
                  animation: `feelFly ${0.7 + r() * 0.4}s cubic-bezier(.2,.7,.3,1) forwards`,
                  ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`,
                }} />
              );
            })}
            {b.origin === "center" && (
              <span className="soul-anim" style={{ position: "absolute", left: -60, top: -60, width: 120, height: 120, borderRadius: "50%", border: `2px solid rgb(${sig})`, animation: "soulRing 0.9s ease-out forwards" }} />
            )}
          </div>
        ))}

        {/* identity */}
        <div style={{ position: "absolute", top: 14, left: 14, right: 14, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", pointerEvents: "none" }}>
          <div onClick={p.onNode} role="button" aria-label="Open profile preview" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, pointerEvents: "auto", cursor: "pointer" }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", padding: 2.5, background: `conic-gradient(rgb(${sig}), rgba(${sig},0.25), rgb(${sig}))`, boxShadow: `0 0 ${8 + heat * 16}px rgba(${sig},${0.35 + heat * 0.4})`, flexShrink: 0 }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#111", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 20 }}>🙂</span>}
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>{post.profile?.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "rgba(255,255,255,0.78)", textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
                {post.profile?.location && <MapPin size={11} />}
                {[post.profile?.location, timeAgo(post.created_at)].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>

          <div style={{ pointerEvents: "auto", flexShrink: 0 }}>
            {!p.isOwner ? (
              <button onClick={p.onFollow} style={{ background: post.user_following ? "rgba(255,255,255,0.12)" : GOLD, backdropFilter: "blur(8px)", border: post.user_following ? "1px solid rgba(255,255,255,0.25)" : "none", borderRadius: 50, padding: "7px 16px", fontSize: 12, fontWeight: 700, color: post.user_following ? "#fff" : "#000", cursor: "pointer" }}>
                {post.user_following ? "Following" : "Follow"}
              </button>
            ) : (
              <div style={{ position: "relative" }} ref={p.menuOpen ? p.menuRef : undefined}>
                <button onClick={p.onToggleMenu} aria-label="Post options" style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <MoreHorizontal size={18} color="#fff" />
                </button>
                {p.menuOpen && (
                  <div style={{ position: "absolute", top: 44, right: 0, background: "rgba(18,18,24,0.96)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, overflow: "hidden", minWidth: 140, zIndex: 20 }}>
                    <button onClick={p.onEdit} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: "11px 14px", fontSize: 13, color: "#fff", cursor: "pointer" }}><Pencil size={14} /> Edit</button>
                    <button onClick={p.onDelete} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: "11px 14px", fontSize: 13, color: "#FF3366", cursor: "pointer" }}><Trash2 size={14} /> Delete</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isVideo && (
          <button onClick={p.onToggleSound} aria-label={muted ? "Unmute" : "Mute"}
            style={{ position: "absolute", top: 72, right: 14, zIndex: 4, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {muted ? <VolumeX size={16} color="#fff" /> : <Volume2 size={16} color="#fff" />}
          </button>
        )}

        {p.hot && (
          <>
            <div style={{ position: "absolute", top: 68, left: 14, zIndex: 2, display: "flex", alignItems: "center", gap: 5, background: `rgba(${HEAT},0.18)`, border: `1px solid rgba(${HEAT},0.55)`, borderRadius: 50, padding: "4px 10px", fontSize: 12, fontWeight: 800, color: "#ffb27a", pointerEvents: "none", backdropFilter: "blur(6px)" }}>
              <Flame size={13} /> Trending
            </div>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="soul-anim" style={{ position: "absolute", bottom: -6, left: `${8 + i * 10.5}%`, width: 4, height: 4, borderRadius: "50%", background: `rgb(${HEAT})`, boxShadow: `0 0 10px rgb(${HEAT})`, animation: `emberRise ${3.2 + (i % 4) * 0.9}s ease-in ${-(i * 0.7)}s infinite`, pointerEvents: "none", zIndex: 1 }} />
            ))}
          </>
        )}

        {/* conversation orbit: the latest voices drift around the post */}
        {p.orbit.map((c, i) => {
          const cp = avatarUrl(c.profile?.photos?.[0] ?? c.profile?.avatar_url);
          const tops = isText ? ["18%", "68%"] : ["34%", "47%"];
          return (
            <button key={c.id} onClick={p.onTalk} className="soul-anim" style={{ position: "absolute", zIndex: 2, top: tops[i] ?? tops[1], ...(i === 0 ? { right: 12 } : { left: 12 }), maxWidth: "62%", display: "flex", alignItems: "center", gap: 7, background: "rgba(14,14,20,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 18, padding: "5px 11px 5px 5px", cursor: "pointer", textAlign: "left", animation: `orbitFloat ${6 + i * 2}s ease-in-out infinite` }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#1c1c26", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                {cp ? <img src={cp} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🙂"}
              </span>
              <span style={{ fontSize: 12, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <b style={{ color: GOLD }}>{c.profile?.name ?? "Someone"}</b> {c.content}
              </span>
            </button>
          );
        })}

        {/* caption, who felt it, actions */}
        <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, zIndex: 2, pointerEvents: "none" }}>
          {!isText && post.caption && (
            <p style={{ fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.94)", marginBottom: 10, textShadow: "0 1px 8px rgba(0,0,0,0.7)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              <Caption text={post.caption} sig={sig} />
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10, minHeight: 24 }}>
            {p.likers.length > 0 && (
              <div style={{ display: "flex" }}>
                {p.likers.map((l, i) => (
                  <div key={l.id} style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #0b0b12", marginLeft: i === 0 ? 0 : -8, background: "#1c1c26", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                    {l.photo ? <img src={l.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🙂"}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: `rgb(${sig})`, textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>
              {felt > 0 ? `${felt.toLocaleString()} ${felt === 1 ? "soul" : "souls"} felt this` : "Be the first to feel this"}
              <Sparkles size={13} className="soul-anim" style={{ animation: felt > 0 ? "soulBreathe 2.4s ease-in-out infinite" : undefined }} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(14,14,20,0.55)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 50, padding: 6, pointerEvents: "auto" }}>
            <button onClick={feel} style={{ flex: 1.3, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: post.user_liked ? `rgba(${sig},0.95)` : "rgba(255,255,255,0.08)", border: "none", borderRadius: 50, padding: "12px 0", fontSize: 14, fontWeight: 800, color: post.user_liked ? "#000" : "#fff", cursor: "pointer", transition: "background 0.2s", boxShadow: post.user_liked ? `0 0 18px rgba(${sig},0.6)` : "none" }}>
              <Sparkles size={17} fill={post.user_liked ? "#000" : "none"} /> {post.user_liked ? "Felt" : "Feel"}
            </button>
            <button onClick={p.onTalk} aria-label="Open conversation" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "none", border: "none", padding: "12px 0", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
              <MessageCircle size={19} /> {post.comments_count.toLocaleString()}
            </button>
            <button onClick={p.onShare} aria-label="Share" style={{ width: 46, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", padding: "12px 0", cursor: "pointer" }}>
              <Share2 size={19} color="#fff" />
            </button>
            <button onClick={p.onSave} aria-label={post.user_saved ? "Remove from saved" : "Save"} style={{ width: 46, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", padding: "12px 0", cursor: "pointer" }}>
              <Bookmark size={19} color={post.user_saved ? GOLD : "#fff"} fill={post.user_saved ? GOLD : "none"} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Conversation layer ────────────────────────────────────────────────────────
function ConversationLayer({
  post, comments, loading, draft, setDraft, submitting, myId, onSubmit, onClose,
}: {
  post: Post; comments: CommentItem[]; loading: boolean; draft: string; setDraft: (v: string) => void;
  submitting: boolean; myId: string; onSubmit: () => void; onClose: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [comments.length]);
  const speakers = new Set(comments.map(c => c.user_id)).size;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div
        onClick={e => e.stopPropagation()}
        className="soul-anim"
        style={{ width: "100%", maxWidth: 430, height: "64dvh", display: "flex", flexDirection: "column", background: "rgba(12,12,18,0.78)", backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)", borderTop: "1px solid rgba(255,255,255,0.14)", borderRadius: "26px 26px 0 0", animation: "sheetRise 0.32s cubic-bezier(.2,.8,.2,1)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 12px" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>Conversation</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
              {loading && comments.length === 0 ? "Gathering voices…" : speakers > 0 ? `${speakers} ${speakers === 1 ? "soul" : "souls"} speaking` : "No one has spoken yet"}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close conversation" style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={16} color="#fff" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
          {!loading && comments.length === 0 && (
            <div style={{ margin: "auto", textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
              Start the conversation.<br />Say what this made you feel.
            </div>
          )}
          {comments.map(c => {
            const mine = c.user_id === myId;
            const cPhoto = avatarUrl(c.profile?.photos?.[0] ?? c.profile?.avatar_url);
            return (
              <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexDirection: mine ? "row-reverse" : "row", alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "86%" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1c1c26", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {cPhoto ? <img src={cPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 13 }}>🙂</span>}
                </div>
                <div style={{ background: mine ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.09)", border: mine ? "1px solid rgba(212,175,55,0.35)" : "1px solid rgba(255,255,255,0.08)", borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "9px 13px" }}>
                  {!mine && <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, marginBottom: 2 }}>{c.profile?.name ?? "Someone"}</div>}
                  <div style={{ fontSize: 14, color: "#fff", lineHeight: 1.45 }}>{c.content}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 16px calc(16px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
            placeholder="Say something…"
            style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 50, padding: "12px 18px", fontSize: 14, color: "#fff", outline: "none", fontFamily: "system-ui" }}
          />
          <button
            onClick={onSubmit}
            disabled={!draft.trim() || submitting}
            aria-label="Send"
            style={{ width: 42, height: 42, borderRadius: "50%", background: GOLD, border: "none", cursor: draft.trim() ? "pointer" : "not-allowed", opacity: draft.trim() ? 1 : 0.45, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <ArrowUp size={18} color="#000" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Soul Node: radial profile preview ─────────────────────────────────────────
function SoulNode({ post, isMe, energy, count, onClose, onFollow, onFilter, onProfile }: {
  post: Post; isMe: boolean; energy: number; count: number;
  onClose: () => void; onFollow: () => void; onFilter: () => void; onProfile: () => void;
}) {
  const photo = avatarUrl(post.profile?.photos?.[0] ?? post.profile?.avatar_url);
  const sig = SIGNATURES[hash(post.user_id) % SIGNATURES.length];
  const actions = [
    { key: "profile", label: "Profile", icon: <User size={22} />, onClick: onProfile },
    ...(isMe ? [] : [{ key: "follow", label: post.user_following ? "Following" : "Follow", icon: post.user_following ? <UserCheck size={22} /> : <UserPlus size={22} />, onClick: onFollow }]),
    { key: "posts", label: "Their posts", icon: <LayoutGrid size={22} />, onClick: onFilter },
  ];
  const angles = actions.length === 3 ? [-90, 30, 150] : [-125, -55];
  const R = 112;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(4,4,8,0.78)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", width: 300, height: 350 }}>
        <div style={{ position: "absolute", left: 150 - R, top: 150 - R, width: R * 2, height: R * 2, borderRadius: "50%", border: `1px dashed rgba(${sig},0.35)` }} />
        <div style={{ position: "absolute", left: 90, top: 90, width: 120, height: 120, borderRadius: "50%", padding: 3, background: `conic-gradient(rgb(${sig}), rgba(${sig},0.2), rgb(${sig}))`, boxShadow: `0 0 40px rgba(${sig},0.5)` }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#111", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 44 }}>🙂</span>}
          </div>
        </div>

        {actions.map((a, i) => {
          const rad = (angles[i] * Math.PI) / 180;
          return (
            <button key={a.key} onClick={a.onClick} className="soul-anim" style={{ position: "absolute", left: 150 + R * Math.cos(rad) - 34, top: 150 + R * Math.sin(rad) - 34, width: 68, height: 68, borderRadius: "50%", background: "rgba(20,20,28,0.9)", border: `1px solid rgba(${sig},0.6)`, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, fontSize: 10.5, fontWeight: 700, cursor: "pointer", boxShadow: `0 0 18px rgba(${sig},0.3)`, animation: `nodeBloom 0.4s cubic-bezier(.2,.9,.3,1.2) ${0.05 + i * 0.07}s backwards` }}>
              {a.icon}{a.label}
            </button>
          );
        })}

        <div style={{ position: "absolute", left: 0, right: 0, top: 276, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>{post.profile?.name}</div>
          {post.profile?.location && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{post.profile.location}</div>}
          <div style={{ fontSize: 13, fontWeight: 700, color: `rgb(${sig})`, marginTop: 8 }}>
            {energy.toLocaleString()} soul energy · {count} {count === 1 ? "post" : "posts"} here
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Soul Composer (create / edit) ─────────────────────────────────────────────
interface ComposerProps {
  userId: string;
  editingPost?: Post | null;
  onClose: () => void;
  onCreated: (post: Post) => void;
  onUpdated: (post: Post) => void;
  colors: Colors;
}

const SoulComposer = ({ userId, editingPost, onClose, onCreated, onUpdated, colors }: ComposerProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const isEditing = !!editingPost;
  const [caption, setCaption] = useState(editingPost?.caption ?? "");
  const [postType, setPostType] = useState<"text" | "media">(editingPost && editingPost.type !== "text" ? "media" : "text");
  const [mediaKind, setMediaKind] = useState<"photo" | "video" | null>(
    editingPost?.type === "video" ? "video" : editingPost?.type === "photo" ? "photo" : null
  );
  const [bgColor, setBgColor] = useState(editingPost?.bg_color ?? BG_COLORS[0]);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    editingPost && editingPost.type !== "text" ? postMediaUrl(editingPost.media_url) : null
  );
  const [removeExistingMedia, setRemoveExistingMedia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // A file only counts while the "Image or video" mode is selected.
  const file = postType === "media" ? pickedFile : null;

  const toggleTag = (tag: string) => {
    setCaption(c => hasTag(c, tag)
      ? c.replace(new RegExp(`\\s*#${tag}\\b`, "gi"), "").trim()
      : `${c.trim()} #${tag}`.trim().slice(0, 300));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isVideo = f.type.startsWith("video/");
    if (f.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
      setError(isVideo ? "Video must be under 100MB." : "Image must be under 15MB.");
      return;
    }
    setPickedFile(f);
    setPreview(URL.createObjectURL(f));
    setMediaKind(isVideo ? "video" : "photo");
    setPostType("media");
    setRemoveExistingMedia(false);
    setError("");
  };

  const handleRemoveMedia = () => {
    setPickedFile(null);
    setPreview(null);
    setMediaKind(null);
    setRemoveExistingMedia(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const upload = async () => {
    if (!file) return null;
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("posts").upload(path, file, { upsert: true });
    if (uploadErr) throw uploadErr;
    return path;
  };

  const handleSubmit = async () => {
    const keepsOldMedia = !!(editingPost && editingPost.type !== "text" && !removeExistingMedia && postType === "media");
    if (!caption.trim() && !file && !keepsOldMedia) { setError("Write something or add media."); return; }
    setSaving(true);
    setError("");

    try {
      if (isEditing && editingPost) {
        const oldPath = editingPost.media_url;
        const dropOld = removeExistingMedia || postType === "text";
        let mediaPath: string | null = dropOld ? null : oldPath ?? null;
        const uploaded = await upload();
        if (uploaded) mediaPath = uploaded;

        const finalType = postType === "text" || !mediaPath ? "text" : (mediaKind ?? editingPost.type);

        const { data, error: updateErr } = await supabase
          .from("posts")
          .update({ type: finalType, caption: caption.trim(), media_url: finalType === "text" ? null : mediaPath, bg_color: bgColor })
          .eq("id", editingPost.id)
          .select("*, profile:profiles!posts_user_id_fkey(*)")
          .single();
        if (updateErr) throw updateErr;

        if (oldPath && (uploaded || dropOld)) {
          await supabase.storage.from("posts").remove([oldPath]).catch(() => {});
        }
        onUpdated({ ...(data as Post), user_liked: editingPost.user_liked, user_following: editingPost.user_following, user_saved: editingPost.user_saved });
        onClose();
        return;
      }

      const mediaPath = await upload();
      const { data, error: insertErr } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          type: mediaPath ? (mediaKind ?? "photo") : "text",
          caption: caption.trim(),
          media_url: mediaPath,
          bg_color: bgColor,
          likes_count: 0,
          comments_count: 0,
        })
        .select("*, profile:profiles!posts_user_id_fkey(*)")
        .single();
      if (insertErr) throw insertErr;

      onCreated({ ...(data as Post), user_liked: false, user_following: false, user_saved: false });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const seg = (active: boolean): React.CSSProperties => ({
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    background: active ? GOLD : colors.bg, border: "none", borderRadius: 50, padding: "11px 0",
    fontSize: 13, fontWeight: 700, color: active ? "#000" : colors.subtext, cursor: "pointer",
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 160, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div className="soul-anim" style={{ width: "100%", maxWidth: 430, background: colors.card, borderRadius: "28px 28px 0 0", padding: "24px 20px 40px", display: "flex", flexDirection: "column", gap: 16, maxHeight: "92dvh", overflowY: "auto", animation: "sheetRise 0.32s cubic-bezier(.2,.8,.2,1)" }}>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.text, letterSpacing: "-0.02em" }}>{isEditing ? "Edit your post" : "Create"}</h2>
            <p style={{ fontSize: 13, color: colors.subtext, marginTop: 3 }}>What are you bringing into the world?</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: colors.bg, border: "none", borderRadius: 50, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={16} color={colors.subtext} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setPostType("text")} style={seg(postType === "text")}><TypeIcon size={15} /> Words</button>
          <button onClick={() => setPostType("media")} style={seg(postType === "media")}><ImageIcon size={15} /> Image or video</button>
        </div>

        {postType === "text" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: bgColor, borderRadius: 18, padding: "22px 20px", minHeight: 96, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
              <p style={{ fontFamily: "Georgia, serif", fontSize: 16, color: "#fff", lineHeight: 1.5, fontStyle: "italic", textAlign: "center" }}>
                {caption.trim() ? `“${caption}”` : "Your words will glow here"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {BG_COLORS.map(c => (
                <button key={c} onClick={() => setBgColor(c)} aria-label={`Background ${c}`}
                  style={{ width: 30, height: 30, borderRadius: "50%", background: c, cursor: "pointer", border: bgColor === c ? `2px solid ${GOLD}` : `2px solid ${colors.border}`, boxShadow: bgColor === c ? "0 0 0 2px rgba(212,175,55,0.3)" : "none" }} />
              ))}
            </div>
          </div>
        )}

        {postType === "media" && (
          <div style={{ position: "relative" }}>
            <div onClick={() => fileRef.current?.click()} style={{ borderRadius: 18, background: preview ? "transparent" : colors.bg, border: `2px dashed ${preview ? "transparent" : colors.border}`, height: 240, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>
              {preview ? (
                mediaKind === "video"
                  ? <video src={preview} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ textAlign: "center", color: colors.subtext }}>
                  <ImageIcon size={32} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13 }}>Tap to choose an image or video</div>
                </div>
              )}
            </div>
            {preview && (
              <button onClick={e => { e.stopPropagation(); handleRemoveMedia(); }} aria-label="Remove media" style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.65)", border: "none", borderRadius: 50, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={14} color="#fff" />
              </button>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: "none" }} />

        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder={postType === "text" ? "Write something…" : "Add a caption…"}
          maxLength={300}
          rows={postType === "text" ? 5 : 3}
          style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 16, padding: "14px 16px", fontSize: 15, color: colors.text, outline: "none", resize: "none", lineHeight: 1.6, fontFamily: "system-ui" }}
        />
        <div style={{ textAlign: "right", fontSize: 11, color: colors.subtext, marginTop: -10 }}>{caption.length}/300</div>

        <div>
          <div style={{ fontSize: 11, color: colors.subtext, marginBottom: 8 }}>Add a tag so it shows up in Culture</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {([["Culture", "culture"], ...CULTURE_TAGS] as [string, string][]).map(([label, tag]) => {
              const on = hasTag(caption, tag);
              return (
                <button key={tag} onClick={() => toggleTag(tag)} style={{ background: on ? GOLD : colors.bg, border: `1px solid ${on ? GOLD : colors.border}`, borderRadius: 50, padding: "5px 12px", fontSize: 12, fontWeight: 700, color: on ? "#000" : colors.subtext, cursor: "pointer" }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {error && <div style={{ background: "rgba(255,51,102,0.15)", border: "1px solid rgba(255,51,102,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#FF3366" }}>{error}</div>}

        <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", background: saving ? "rgba(212,175,55,0.4)" : GOLD, border: "none", borderRadius: 50, padding: "16px 0", fontSize: 15, fontWeight: 800, color: saving ? "rgba(0,0,0,0.4)" : "#000", cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? (mediaKind === "video" && file ? "Uploading video…" : isEditing ? "Saving…" : "Releasing…") : (isEditing ? "Save changes" : "Release ✦")}
        </button>
      </div>
    </div>
  );
};

// ── Feed page ─────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const router = useRouter();
  const { user, profile: myProfile, loading: authLoading } = useAuth();
  const { colors } = useTheme();

  const [posts, setPosts] = useState<Post[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<Tab>("soul");
  const [showCreate, setShowCreate] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const deepLinked = useRef(false);
  const [likersByPost, setLikersByPost] = useState<Record<string, { id: string; photo: string | null }[]>>({});
  const [present, setPresent] = useState(1);
  const [place, setPlace] = useState<string | null>(null);
  const [cultureTag, setCultureTag] = useState<string | null>(null);
  const [personFilter, setPersonFilter] = useState<{ id: string; name: string } | null>(null);
  const [nodePost, setNodePost] = useState<Post | null>(null);
  const [orbitByPost, setOrbitByPost] = useState<Record<string, CommentItem[]>>({});
  const [soundOn, setSoundOn] = useState(false);
  const [pending, setPending] = useState<Post[]>([]);
  const [arrivedIds, setArrivedIds] = useState<Set<string>>(new Set());
  const [incoming, setIncoming] = useState<{ postId: string; n: number } | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const [commenting, setCommenting] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentItem[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<string | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const [pulseKey, setPulseKey] = useState(0);
  const firePulse = () => setPulseKey(k => k + 1);

  const markArrived = (ids: string[]) => {
    setArrivedIds(s => new Set([...s, ...ids]));
    setTimeout(() => setArrivedIds(s => { const n = new Set(s); ids.forEach(i => n.delete(i)); return n; }), 1200);
  };

  // New posts from other people wait in a pill, then float into the top of the stream.
  const releasePending = () => {
    const followedAuthors = new Set(posts.filter(p => p.user_following).map(p => p.user_id));
    const fresh = pending.map(p => ({ ...p, user_following: followedAuthors.has(p.user_id) }));
    setPosts(ps => [...fresh, ...ps.filter(p => !fresh.some(f => f.id === p.id))]);
    markArrived(fresh.map(f => f.id));
    setPending([]);
    setTab("soul"); setPlace(null); setPersonFilter(null);
    requestAnimationFrame(() => scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const [toast, setToast] = useState<{ label: string; color: string } | null>(null);
  const showToast = (label: string, color: string) => {
    setToast({ label, color });
    setTimeout(() => setToast(null), 1600);
  };

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user]);

  useEffect(() => {
    if (!menuOpenFor) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenFor(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpenFor]);

  // ── load posts (unchanged data model) ──
  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetching(true);
      const { data: rawPosts } = await supabase
        .from("posts")
        .select("*, profile:profiles!posts_user_id_fkey(*)")
        .order("created_at", { ascending: false })
        .limit(30);

      if (!rawPosts?.length) { setPosts([]); setFetching(false); return; }
      const postIds = rawPosts.map(p => p.id);

      const { data: myLikes } = await supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      const likedSet = new Set(myLikes?.map(l => l.post_id) ?? []);
      const { data: myFollows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      const followedSet = new Set(myFollows?.map(f => f.following_id) ?? []);
      const { data: mySaves } = await supabase.from("saved_posts").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      const savedSet = new Set(mySaves?.map(s => s.post_id) ?? []);

      setPosts(rawPosts.map(p => ({
        ...p,
        user_liked: likedSet.has(p.id),
        user_following: followedSet.has(p.user_id),
        user_saved: savedSet.has(p.id),
      } as Post)));
      setFetching(false);

      // Latest voices per post, for the conversation orbit. Fails quietly.
      const { data: recentComments } = await supabase
        .from("comments")
        .select("*, profile:profiles!comments_user_id_fkey(*)")
        .in("post_id", postIds)
        .order("created_at", { ascending: false })
        .limit(80);
      if (recentComments?.length) {
        const grouped: Record<string, CommentItem[]> = {};
        (recentComments as CommentItem[]).forEach(c => { const a = (grouped[c.post_id] ??= []); if (a.length < 2) a.push(c); });
        setOrbitByPost(grouped);
      }

      // Who felt each post, for the avatar stack. Fails quietly.
      const { data: likeRows } = await supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds).limit(400);
      if (!likeRows?.length) return;
      const byPost: Record<string, string[]> = {};
      likeRows.forEach(r => { const a = (byPost[r.post_id] ??= []); if (a.length < 4) a.push(r.user_id); });
      const ids = Array.from(new Set(Object.values(byPost).flat()));
      const { data: profs } = await supabase.from("profiles").select("id, photos, avatar_url").in("id", ids);
      const photoById = new Map((profs ?? []).map(pr => [pr.id as string, (avatarUrl(pr.photos?.[0] ?? pr.avatar_url) ?? null) as string | null]));
      const out: Record<string, { id: string; photo: string | null }[]> = {};
      Object.entries(byPost).forEach(([pid, uids]) => { out[pid] = uids.map(u => ({ id: u, photo: photoById.get(u) ?? null })); });
      setLikersByPost(out);
    })();
  }, [user]);

  // Shared links (/feed?post=ID) jump straight to that post.
  useEffect(() => {
    if (fetching || deepLinked.current || posts.length === 0) return;
    deepLinked.current = true;
    const id = new URLSearchParams(window.location.search).get("post");
    if (id) requestAnimationFrame(() => document.getElementById(`soul-${id}`)?.scrollIntoView());
  }, [fetching, posts.length]);

  // Soul Pulse: other people's activity travels through the stream live.
  // Requires Realtime to be enabled for post_likes and comments in Supabase; harmless if it isn't.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("soul-pulse")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_likes" }, payload => {
        const row = payload.new as { post_id: string; user_id: string };
        if (row.user_id === user.id) return;
        setPosts(ps => ps.map(p => p.id === row.post_id ? { ...p, likes_count: p.likes_count + 1 } : p));
        setIncoming({ postId: row.post_id, n: Date.now() });
        setPulseKey(k => k + 1);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, payload => {
        const row = payload.new as { post_id: string; user_id: string };
        if (row.user_id === user.id) return;
        setPosts(ps => ps.map(p => p.id === row.post_id ? { ...p, comments_count: p.comments_count + 1 } : p));
        setPulseKey(k => k + 1);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, async payload => {
        const row = payload.new as { id: string; user_id: string };
        if (row.user_id === user.id) return;
        const { data } = await supabase.from("posts").select("*, profile:profiles!posts_user_id_fkey(*)").eq("id", row.id).single();
        if (!data) return;
        setPending(ps => ps.some(x => x.id === data.id) ? ps : [{ ...(data as Post), user_liked: false, user_following: false, user_saved: false }, ...ps]);
        setPulseKey(k => k + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Real presence: how many souls have the app open right now.
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("souls-present", { config: { presence: { key: user.id } } });
    ch.on("presence", { event: "sync" }, () => setPresent(Math.max(1, Object.keys(ch.presenceState()).length)))
      .subscribe(async status => { if (status === "SUBSCRIBED") await ch.track({ at: Date.now() }); });
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Soul River: cards tilt and fade with distance from the middle of the screen.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const mid = el.scrollTop + el.clientHeight / 2;
      Array.from(el.children).forEach(node => {
        const sec = node as HTMLElement;
        const card = sec.firstElementChild as HTMLElement | null;
        if (!card || !sec.dataset.soul) return;
        const d = Math.max(-1.2, Math.min(1.2, (sec.offsetTop + sec.offsetHeight / 2 - mid) / sec.offsetHeight));
        const a = Math.abs(d);
        card.style.transform = `perspective(900px) rotateX(${d * -7}deg) scale(${1 - a * 0.07})`;
        card.style.opacity = String(1 - a * 0.4);
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    apply();
    return () => { el.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [fetching, tab, place, cultureTag, personFilter, posts.length]);

  // ── actions ──
  const toggleLike = async (post: Post) => {
    if (!user) return;
    const liking = !post.user_liked;
    const me = myProfile as unknown as { photos?: string[]; avatar_url?: string | null } | null;
    const myPhoto = (avatarUrl(me?.photos?.[0] ?? me?.avatar_url) ?? null) as string | null;
    setLikersByPost(l => {
      const cur = (l[post.id] ?? []).filter(x => x.id !== user.id);
      return { ...l, [post.id]: liking ? [{ id: user.id, photo: myPhoto }, ...cur].slice(0, 4) : cur };
    });
    setPosts(ps => ps.map(p => p.id === post.id ? { ...p, user_liked: liking, likes_count: Math.max(0, p.likes_count + (liking ? 1 : -1)) } : p));
    const { error } = liking
      ? await supabase.from("post_likes").insert({ user_id: user.id, post_id: post.id })
      : await supabase.from("post_likes").delete().eq("user_id", user.id).eq("post_id", post.id);
    if (error) {
      setPosts(ps => ps.map(p => p.id === post.id ? { ...p, user_liked: !liking, likes_count: Math.max(0, p.likes_count + (liking ? -1 : 1)) } : p));
      showToast("Couldn't save that", "#FF3366");
    } else if (liking) firePulse();
  };

  const toggleFollow = async (post: Post) => {
    if (!user) return;
    if (post.user_following) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", post.user_id);
      setPosts(ps => ps.map(p => p.user_id === post.user_id ? { ...p, user_following: false } : p));
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: post.user_id });
      setPosts(ps => ps.map(p => p.user_id === post.user_id ? { ...p, user_following: true } : p));
      firePulse();
    }
  };

  const toggleSave = async (post: Post) => {
    if (!user) return;
    if (post.user_saved) {
      await supabase.from("saved_posts").delete().eq("user_id", user.id).eq("post_id", post.id);
      setPosts(ps => ps.map(p => p.id === post.id ? { ...p, user_saved: false } : p));
    } else {
      await supabase.from("saved_posts").insert({ user_id: user.id, post_id: post.id });
      setPosts(ps => ps.map(p => p.id === post.id ? { ...p, user_saved: true } : p));
    }
  };

  const openComments = async (postId: string) => {
    setCommenting(postId);
    setCommentDraft("");
    if (!commentsByPost[postId]) setCommentsLoading(postId);
    const { data } = await supabase
      .from("comments")
      .select("*, profile:profiles!comments_user_id_fkey(*)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setCommentsByPost(c => ({ ...c, [postId]: (data as CommentItem[]) ?? [] }));
    setCommentsLoading(null);
  };

  const submitComment = async (post: Post) => {
    if (!user || !commentDraft.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: post.id, user_id: user.id, content: commentDraft.trim() })
      .select("*, profile:profiles!comments_user_id_fkey(*)")
      .single();
    setCommentSubmitting(false);
    if (error) { showToast("Couldn't post comment", "#FF3366"); return; }

    setCommentsByPost(c => ({ ...c, [post.id]: [...(c[post.id] ?? []), data as CommentItem] }));
    setOrbitByPost(o => ({ ...o, [post.id]: [data as CommentItem, ...(o[post.id] ?? [])].slice(0, 2) }));
    setPosts(ps => ps.map(p => p.id === post.id ? { ...p, comments_count: p.comments_count + 1 } : p));
    setCommentDraft("");
    firePulse();
  };

  const sharePost = async (post: Post) => {
    const url = `${window.location.origin}/feed?post=${post.id}`;
    const text = post.caption || "Check this out on ìjèbúsoul";
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: "ìjèbúsoul", text, url }); } catch { /* cancelled */ }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      showToast("Link copied", GOLD);
    }
  };

  const deletePost = async (post: Post) => {
    setMenuOpenFor(null);
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    if (post.media_url) await supabase.storage.from("posts").remove([post.media_url]).catch(() => {});
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) { showToast("Couldn't delete post", "#FF3366"); return; }
    setPosts(ps => ps.filter(p => p.id !== post.id));
    showToast("Post deleted", "#888");
  };

  // ── derived ──
  const now = Date.now();
  const recent = posts.filter(p => now - new Date(p.created_at).getTime() < DAY_MS);
  const placeCounts = new Map<string, number>();
  posts.forEach(p => { const l = p.profile?.location; if (l) placeCounts.set(l, (placeCounts.get(l) ?? 0) + 1); });
  let base = posts;
  if (tab === "now") base = recent;
  else if (tab === "people") base = posts.filter(p => p.user_following);
  else if (tab === "places" && place) base = posts.filter(p => p.profile?.location === place);
  else if (tab === "culture") {
    const tags = cultureTag ? [cultureTag] : ALL_CULTURE;
    base = posts.filter(p => tags.some(t => hasTag(p.caption ?? "", t)));
  }
  const visible = personFilter ? base.filter(p => p.user_id === personFilter.id) : base;

  // Trending: the busiest recent posts get a heat field.
  const hotIds = new Set(
    posts
      .map(p => {
        const e = p.likes_count + p.comments_count * 2;
        return { id: p.id, e, score: e / Math.pow((now - new Date(p.created_at).getTime()) / 3600000 + 2, 1.2) };
      })
      .filter(x => x.e >= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(x => x.id)
  );
  const nodeLive = nodePost ? posts.find(p => p.id === nodePost.id) ?? nodePost : null;
  const commentingPost = commenting ? posts.find(p => p.id === commenting) ?? null : null;

  const shell: React.CSSProperties = { height: "100dvh", maxWidth: 430, margin: "0 auto", background: "radial-gradient(80% 38% at 95% 8%, rgba(212,175,55,0.13), transparent 70%), radial-gradient(70% 40% at 0% 65%, rgba(112,92,205,0.15), transparent 70%), #07070c", fontFamily: "system-ui", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" };

  if (authLoading || fetching) return (
    <div style={{ ...shell, background: colors.bg }}>
      <Header />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: colors.subtext }}>
          <div className="soul-anim" style={{ width: 32, height: 32, border: `3px solid ${colors.border}`, borderTopColor: GOLD, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontSize: 14 }}>Opening the stream…</div>
        </div>
      </div>
      <BottomNav />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <main style={shell}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes sheetRise { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes feelFly {
          0%   { transform: translate(0,0) scale(0.6); opacity: 0; }
          12%  { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.15); opacity: 0; }
        }
        @keyframes soulRing { 0% { transform: scale(0.3); opacity: 0.9; } 100% { transform: scale(1.9); opacity: 0; } }
        @keyframes soulDrift {
          0%, 100% { transform: translate(0, 0); opacity: 0.25; }
          50% { transform: translate(var(--drift), calc(var(--drift) * -1)); opacity: 0.95; }
        }
        @keyframes soulBreathe { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.25); } }
        @keyframes heatField {
          0%, 100% { box-shadow: 0 0 20px rgba(255,122,40,0.35), inset 0 0 40px rgba(255,122,40,0.12); }
          50% { box-shadow: 0 0 48px rgba(255,122,40,0.75), inset 0 0 80px rgba(255,122,40,0.3); }
        }
        @keyframes emberRise { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(-260px) translateX(14px); opacity: 0; } }
        @keyframes orbitFloat { 0%, 100% { transform: translate(0,0); } 25% { transform: translate(7px,-9px); } 50% { transform: translate(0,-15px); } 75% { transform: translate(-7px,-7px); } }
        @keyframes riverArrive { from { opacity: 0; transform: translateY(-40px) scale(0.94); } to { opacity: 1; transform: none; } }
        @keyframes pillDrop { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: none; } }
        @keyframes nodeBloom { from { opacity: 0; transform: scale(0.2); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulseTravel { from { left: -10%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } to { left: 105%; opacity: 0; } }
        .soul-scroll { scrollbar-width: none; }
        .soul-scroll::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) { .soul-anim { animation: none !important; } }
      `}</style>

      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: toast.color, color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 20px", borderRadius: 50, zIndex: 200, whiteSpace: "nowrap" }}>
          {toast.label}
        </div>
      )}

      {(showCreate || editingPost) && user && myProfile && (
        <SoulComposer
          userId={user.id}
          editingPost={editingPost}
          onClose={() => { setShowCreate(false); setEditingPost(null); }}
          onCreated={post => { setPosts(ps => [post, ...ps]); markArrived([post.id]); }}
          onUpdated={updated => setPosts(ps => ps.map(p => p.id === updated.id ? { ...p, ...updated } : p))}
          colors={colors}
        />
      )}

      {commentingPost && user && (
        <ConversationLayer
          post={commentingPost}
          comments={commentsByPost[commentingPost.id] ?? []}
          loading={commentsLoading === commentingPost.id}
          draft={commentDraft}
          setDraft={setCommentDraft}
          submitting={commentSubmitting}
          myId={user.id}
          onSubmit={() => submitComment(commentingPost)}
          onClose={() => setCommenting(null)}
        />
      )}

      {nodeLive && user && (
        <SoulNode
          post={nodeLive}
          isMe={nodeLive.user_id === user.id}
          energy={posts.filter(p => p.user_id === nodeLive.user_id).reduce((n, p) => n + p.likes_count + p.comments_count * 2, 0)}
          count={posts.filter(p => p.user_id === nodeLive.user_id).length}
          onClose={() => setNodePost(null)}
          onFollow={() => toggleFollow(nodeLive)}
          onFilter={() => { setPersonFilter({ id: nodeLive.user_id, name: nodeLive.profile?.name ?? "this soul" }); setTab("soul"); setNodePost(null); }}
          onProfile={() => router.push(profileHref(nodeLive.user_id))}
        />
      )}

      <Header />

      <div style={{ position: "relative", zIndex: 10, padding: "6px 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
            <span className="soul-anim" style={{ width: 8, height: 8, borderRadius: "50%", background: "#3ddc84", boxShadow: "0 0 10px #3ddc84", animation: "soulBreathe 2.4s ease-in-out infinite" }} />
            {present} {present === 1 ? "soul" : "souls"} present
          </div>
          <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: GOLD, border: "none", borderRadius: 50, padding: "8px 16px 8px 12px", fontSize: 13, fontWeight: 800, color: "#000", cursor: "pointer", boxShadow: "0 0 20px rgba(212,175,55,0.45)" }}>
            <Plus size={15} strokeWidth={2.8} /> Create
          </button>
        </div>

        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 50, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
          {([["soul", "Soul", Sparkles], ["now", "Now", Zap], ["people", "People", Users], ["places", "Places", MapPin], ["culture", "Culture", Landmark]] as [Tab, string, typeof Sparkles][]).map(([key, label, Icon]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "9px 0", borderRadius: 50, fontSize: 11.5, fontWeight: active ? 800 : 600, cursor: "pointer", color: active ? "#fff" : "rgba(255,255,255,0.65)", background: active ? "rgba(212,175,55,0.14)" : "transparent", border: active ? `1px solid ${GOLD}` : "1px solid transparent", boxShadow: active ? "0 0 14px rgba(212,175,55,0.3)" : "none" }}
              >
                <Icon size={14} color={active ? GOLD : undefined} /> {label}
              </button>
            );
          })}
        </div>

        {tab === "places" && (
          <div className="soul-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 10, paddingBottom: 2 }}>
            {[["", posts.length] as [string, number], ...Array.from(placeCounts.entries())].map(([name, count]) => {
              const active = (place ?? "") === name;
              return (
                <button key={name || "all"} onClick={() => setPlace(name || null)} style={{ flexShrink: 0, background: active ? GOLD : "rgba(255,255,255,0.08)", border: "none", borderRadius: 50, padding: "6px 13px", fontSize: 12, fontWeight: 700, color: active ? "#000" : "#fff", cursor: "pointer" }}>
                  {name || "All places"} <span style={{ opacity: 0.65 }}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {tab === "culture" && (
          <div className="soul-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 10, paddingBottom: 2 }}>
            {([["All culture", ""], ...CULTURE_TAGS] as [string, string][]).map(([label, tag]) => {
              const count = tag ? posts.filter(p => hasTag(p.caption ?? "", tag)).length : posts.filter(p => ALL_CULTURE.some(t => hasTag(p.caption ?? "", t))).length;
              const active = (cultureTag ?? "") === tag;
              return (
                <button key={tag || "all"} onClick={() => setCultureTag(tag || null)} style={{ flexShrink: 0, background: active ? GOLD : "rgba(255,255,255,0.08)", border: "none", borderRadius: 50, padding: "6px 13px", fontSize: 12, fontWeight: 700, color: active ? "#000" : "#fff", cursor: "pointer" }}>
                  {label} <span style={{ opacity: 0.65 }}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {personFilter && (
          <div style={{ marginTop: 10 }}>
            <button onClick={() => setPersonFilter(null)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(212,175,55,0.16)", border: `1px solid ${GOLD}`, borderRadius: 50, padding: "5px 12px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
              Posts by {personFilter.name} <X size={12} />
            </button>
          </div>
        )}

        {/* Soul Pulse: a slow idle light, and a brighter one whenever something happens */}
        <div style={{ position: "relative", height: 1, marginTop: 10, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
          <span className="soul-anim" style={{ position: "absolute", top: -1, width: 46, height: 3, borderRadius: 3, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, animation: "pulseTravel 7s linear infinite" }} />
          {pulseKey > 0 && (
            <span key={pulseKey} className="soul-anim" style={{ position: "absolute", top: -2, width: 70, height: 5, borderRadius: 5, background: "linear-gradient(90deg, transparent, #fff, transparent)", boxShadow: `0 0 12px ${GOLD}`, animation: "pulseTravel 1.4s ease-out forwards" }} />
          )}
        </div>
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {pending.length > 0 && (
          <div style={{ position: "absolute", top: 8, left: 0, right: 0, zIndex: 20, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <button onClick={releasePending} className="soul-anim" style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 6, background: GOLD, border: "none", borderRadius: 50, padding: "8px 16px", fontSize: 13, fontWeight: 800, color: "#000", cursor: "pointer", boxShadow: "0 0 24px rgba(212,175,55,0.6)", animation: "pillDrop 0.5s ease-out" }}>
              <Sparkles size={14} /> {pending.length} new {pending.length === 1 ? "soul" : "souls"} arrived
            </button>
          </div>
        )}
        <div ref={scrollerRef} className="soul-scroll" style={{ position: "absolute", inset: 0, overflowY: "auto", scrollSnapType: "y mandatory", overscrollBehaviorY: "contain" }}>
          {visible.length === 0 ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 32px 80px", color: "rgba(255,255,255,0.65)", fontSize: 14 }}>
              <Inbox size={44} style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
                {personFilter ? `No posts from ${personFilter.name} here` : tab === "now" ? "Nothing in the last 24 hours" : tab === "places" ? "Nothing from this place yet" : tab === "people" ? "No one followed yet" : tab === "culture" ? "No culture posts yet" : "No posts yet"}
              </div>
              <div>{tab === "people" ? "Follow someone and their posts will gather here." : tab === "culture" ? "Add a tag like #culture, #story or #event when you create a post." : tab === "soul" ? "Be the first to share something with the community." : "Be the first to put something into the stream."}</div>
              <button onClick={() => setShowCreate(true)} style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 6, background: GOLD, border: "none", borderRadius: 50, padding: "12px 24px", fontSize: 14, fontWeight: 800, color: "#000", cursor: "pointer" }}>
                <Plus size={15} strokeWidth={2.5} /> Create a post
              </button>
            </div>
          ) : (
            <>
              {visible.map(post => (
                <SoulPost
                  key={post.id}
                  post={post}
                  isOwner={post.user_id === user?.id}
                  menuOpen={menuOpenFor === post.id}
                  menuRef={menuRef}
                  likers={likersByPost[post.id] ?? []}
                  hot={hotIds.has(post.id)}
                  arriving={arrivedIds.has(post.id)}
                  orbit={orbitByPost[post.id] ?? []}
                  soundOn={soundOn}
                  onToggleSound={() => setSoundOn(s => !s)}
                  onNode={() => setNodePost(post)}
                  incoming={incoming?.postId === post.id ? incoming.n : 0}
                  onToggleMenu={() => setMenuOpenFor(menuOpenFor === post.id ? null : post.id)}
                  onFeel={() => toggleLike(post)}
                  onFollow={() => toggleFollow(post)}
                  onSave={() => toggleSave(post)}
                  onTalk={() => openComments(post.id)}
                  onShare={() => sharePost(post)}
                  onEdit={() => { setMenuOpenFor(null); setEditingPost(post); }}
                  onDelete={() => deletePost(post)}
                />
              ))}
              <div style={{ height: BOTTOM_NAV_HEIGHT + 48 }} />
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
} 