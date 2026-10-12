"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl, postMediaUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import BottomNav, { BOTTOM_NAV_HEIGHT } from "@/components/BottomNav";
import Header from "@/components/Header";
import ProfilePreviewModal from "@/components/ProfilePreviewModal";
import { Icon, Silhouette, type IconName } from "@/components/SoulIcons";
import type { Match, Message, Profile } from "@/lib/types";
import { ArrowLeft, ArrowUp, Mic, Image as ImageIcon, Plus, X, Play, Pause, ChevronDown, CornerUpLeft, Copy, MapPin } from "lucide-react";

// ───────────────────────────── design tokens ─────────────────────────────
const GOLD = "#D4AF37";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const GOLD_BTN = "linear-gradient(180deg, #f6e08a 0%, #D4AF37 48%, #a9801a 100%)";
const GOLD_BTN_SHADOW = "inset 0 1px 0 rgba(255,255,255,0.55), 0 8px 22px -6px rgba(212,175,55,0.5)";
const ONLINE = "#3ddc84";
// Chat media goes into your existing storage bucket, under the sender's own folder.
const CHAT_BUCKET = "posts";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VOICE_SECS = 120;

const SIGNATURES = ["212,175,55", "205,96,58", "52,150,108", "112,92,205", "214,134,82", "46,156,176"];
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const sigOf = (id?: string) => SIGNATURES[hash(id ?? "x") % SIGNATURES.length];
const isOnline = (p?: Profile | null) => !!p?.online_at && Date.now() - new Date(p.online_at).getTime() < 300000;

type MatchX = Match & { consent_user1?: boolean; consent_user2?: boolean };

// ───────────────────────────── Soul message protocol ─────────────────────────────
// Everything rides in the normal text column, so no database change is needed:
//   plain text                       "hello"
//   soul:<kind>|<json>               replies, photos, voice notes, plans, reactions, plan answers
// Reactions and plan answers are quiet "events": they are stored as messages, never shown as bubbles,
// and are folded into the message they point at.
type Parsed =
  | { kind: "text"; text: string }
  | { kind: "reply"; to: string; q: string; text: string }
  | { kind: "img"; p: string }
  | { kind: "voice"; p: string; s: number; w: string }
  | { kind: "plan"; t: string; w: string; at: string }
  | { kind: "react"; to: string; r: string }
  | { kind: "rsvp"; to: string; a: "yes" | "no" };

const PREFIX = "soul:";
const pack = (kind: string, data: object) => `${PREFIX}${kind}|${JSON.stringify(data)}`;

function parseMsg(c: string): Parsed {
  const text: Parsed = { kind: "text", text: c };
  if (!c.startsWith(PREFIX)) return text;
  const bar = c.indexOf("|");
  if (bar < 0) return text;
  const kind = c.slice(PREFIX.length, bar);
  try {
    const j = JSON.parse(c.slice(bar + 1));
    if (kind === "reply" && typeof j.to === "string" && typeof j.t === "string") return { kind, to: j.to, q: String(j.q ?? ""), text: j.t };
    if (kind === "img" && typeof j.p === "string") return { kind, p: j.p };
    if (kind === "voice" && typeof j.p === "string") return { kind, p: j.p, s: Number(j.s) || 0, w: String(j.w ?? "") };
    if (kind === "plan" && typeof j.at === "string") return { kind, t: String(j.t ?? "A plan"), w: String(j.w ?? ""), at: j.at };
    if (kind === "react" && typeof j.to === "string") return { kind, to: j.to, r: String(j.r ?? "") };
    if (kind === "rsvp" && typeof j.to === "string" && (j.a === "yes" || j.a === "no")) return { kind, to: j.to, a: j.a };
  } catch { /* fall through to plain text */ }
  return text;
}

const isEvent = (p: Parsed) => p.kind === "react" || p.kind === "rsvp";

function previewOf(content?: string) {
  if (!content) return "";
  const p = parseMsg(content);
  switch (p.kind) {
    case "text": return p.text;
    case "reply": return p.text;
    case "img": return "Photo";
    case "voice": return "Voice message";
    case "plan": return `Plan: ${p.t}`;
    case "react": return "Reacted to a message";
    case "rsvp": return "Answered a plan";
  }
}

const REACTIONS: { key: string; icon: IconName; label: string }[] = [
  { key: "love", icon: "like", label: "Love" },
  { key: "wow", icon: "super", label: "Wow" },
  { key: "warm", icon: "friendship", label: "Warm" },
  { key: "calm", icon: "casual", label: "Calm" },
];
const reactionIcon = (key: string) => REACTIONS.find(r => r.key === key)?.icon;

const STARTERS = (place?: string) => [
  `What is your favourite part of ${place || "home"}?`,
  "What does a perfect Saturday look like for you?",
  "Tell me something that made you smile this week.",
];
const PLAN_KINDS = ["Coffee", "Dinner", "Walk", "Beach", "Movie"];

// ───────────────────────────── styles ─────────────────────────────
const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const CSS = `
  @keyframes chRise { from { opacity: 0; transform: translateY(18px); filter: blur(5px); } to { opacity: 1; transform: none; filter: blur(0); } }
  @keyframes chMsg { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
  @keyframes chShimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
  @keyframes chSpin { to { transform: rotate(360deg); } }
  @keyframes chBreathe { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.35); } }
  @keyframes chToast { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
  @keyframes chSheet { from { transform: translateY(100%); } to { transform: none; } }
  @keyframes chBar { from { opacity: 0; transform: translateY(6px) scale(0.94); } to { opacity: 1; transform: none; } }
  @keyframes chType { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
  @keyframes chFlash { 0% { box-shadow: 0 0 0 0 rgba(212,175,55,0.7); } 100% { box-shadow: 0 0 0 14px rgba(212,175,55,0); } }
  @keyframes chRec { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  .ch-rise { animation: chRise 0.7s cubic-bezier(.2,.8,.2,1) backwards; }
  .ch-msg { animation: chMsg 0.35s cubic-bezier(.2,.8,.2,1) backwards; }
  .ch-skel { background: linear-gradient(90deg, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 80%); background-size: 200% 100%; animation: chShimmer 1.8s linear infinite; }
  .ch-dot { animation: chBreathe 2.6s ease-in-out infinite; }
  .ch-spin { animation: chSpin 48s linear infinite; }
  .ch-spin-rev { animation: chSpin 30s linear infinite reverse; }
  .ch-sheet { animation: chSheet 0.4s cubic-bezier(.2,.8,.2,1); }
  .ch-bar { animation: chBar 0.22s cubic-bezier(.2,.8,.2,1); }
  .ch-flash { animation: chFlash 0.9s ease-out; }
  .ch-typing span { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${GOLD}; margin: 0 2px; animation: chType 1.2s ease-in-out infinite; }
  .ch-typing span:nth-child(2) { animation-delay: 0.15s; }
  .ch-typing span:nth-child(3) { animation-delay: 0.3s; }
  .ch-recdot { animation: chRec 1.1s ease-in-out infinite; }
  .ch-row { transition: background 0.25s ease; cursor: pointer; }
  .ch-row:hover { background: rgba(255,255,255,0.03); }
  .ch-row:active { background: rgba(255,255,255,0.06); }
  .ch-row:focus-visible, .ch-tap:focus-visible { outline: 2px solid #fff; outline-offset: -2px; }
  .ch-btn { transition: transform 0.2s ease, filter 0.25s ease, opacity 0.25s ease, background 0.25s ease; cursor: pointer; }
  .ch-btn:hover:not(:disabled) { filter: brightness(1.1); }
  .ch-btn:active:not(:disabled) { transform: scale(0.94); }
  .ch-btn:disabled { opacity: 0.45; cursor: default; }
  .ch-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  .ch-react { transition: transform 0.18s cubic-bezier(.2,.8,.2,1); }
  .ch-react:hover { transform: translateY(-4px) scale(1.18); }
  .ch-link { background: none; border: none; cursor: pointer; transition: color 0.2s ease; }
  .ch-link:hover { color: #fff; }
  .ch-scroll { scrollbar-width: none; }
  .ch-scroll::-webkit-scrollbar { display: none; }
  .ch-input::placeholder { font-family: ${SERIF}; font-style: italic; font-size: 16px; color: rgba(255,255,255,0.4); }
  .ch-field::placeholder { color: rgba(255,255,255,0.35); }
  @media (prefers-reduced-motion: reduce) {
    .ch-rise, .ch-msg, .ch-skel, .ch-dot, .ch-spin, .ch-spin-rev, .ch-sheet, .ch-bar, .ch-flash, .ch-typing span, .ch-recdot { animation: none !important; }
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
const rule: React.CSSProperties = { height: 1, background: "linear-gradient(90deg, rgba(212,175,55,0), rgba(212,175,55,0.65), rgba(212,175,55,0))" };

// ───────────────────────────── small pieces ─────────────────────────────
function Grain() {
  return <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.05, mixBlendMode: "overlay", backgroundImage: GRAIN }} />;
}

function Avatar({ src, size, sig, online, ring, glow = 0 }: { src?: string | null; size: number; sig: string; online?: boolean; ring?: "gold" | "soft"; glow?: number }) {
  const dot = Math.max(10, Math.round(size * 0.2));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {ring === "gold" && <div style={{ position: "absolute", inset: -5, borderRadius: "50%", border: `1px solid rgba(212,175,55,${0.4 + glow * 0.5})`, boxShadow: glow ? `0 0 ${10 + glow * 26}px rgba(212,175,55,${0.15 + glow * 0.5})` : "none", transition: "all 0.8s" }} />}
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#111", border: ring === "gold" ? `1.5px solid ${GOLD}` : "1px solid rgba(255,255,255,0.18)", boxShadow: ring === "gold" ? "0 0 24px rgba(212,175,55,0.3)" : "none" }}>
        {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Silhouette sig={sig} />}
      </div>
      {online && <span style={{ position: "absolute", right: 0, bottom: 0, width: dot, height: dot, borderRadius: "50%", background: ONLINE, border: "2px solid #07070c", boxShadow: `0 0 8px ${ONLINE}` }} />}
    </div>
  );
}

function Emblem() {
  return (
    <div style={{ position: "relative", width: 120, height: 120 }}>
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden style={{ position: "absolute", inset: 0 }}>
        <g className="ch-spin" style={{ transformOrigin: "60px 60px" }}>
          <circle cx="60" cy="60" r="56" fill="none" stroke={GOLD} strokeOpacity="0.45" strokeWidth="1" strokeDasharray="1 7" strokeLinecap="round" />
          <circle cx="116" cy="60" r="3" fill="#f6e08a" />
        </g>
        <g className="ch-spin-rev" style={{ transformOrigin: "60px 60px" }}>
          <path d="M60 22 L98 60 L60 98 L22 60 Z" fill="none" stroke={GOLD} strokeOpacity="0.55" strokeWidth="1" />
        </g>
      </svg>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
        <Icon name="like" size={34} />
      </div>
    </div>
  );
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.round(s)) % 60).padStart(2, "0")}`;

// Voice notes carry a real waveform, captured from the microphone while recording.
let playingAudio: HTMLAudioElement | null = null;
function VoiceBubble({ p, s, w, mine }: { p: string; s: number; w: string; mine: boolean }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const bars = (w && /^\d+$/.test(w) ? w : Array.from({ length: 32 }, (_, i) => String(2 + (hash(p + i) % 7))).join("")).split("").map(Number);

  useEffect(() => () => { audio.current?.pause(); }, []);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audio.current) {
      const a = new Audio(postMediaUrl(p) ?? "");
      a.ontimeupdate = () => setProgress(a.duration ? a.currentTime / a.duration : a.currentTime / Math.max(1, s));
      a.onended = () => { setPlaying(false); setProgress(0); };
      a.onpause = () => setPlaying(false);
      a.onplay = () => setPlaying(true);
      audio.current = a;
    }
    const a = audio.current;
    if (a.paused) {
      if (playingAudio && playingAudio !== a) playingAudio.pause();
      playingAudio = a;
      a.play().catch(() => {});
    } else a.pause();
  };

  const ink = mine ? "#1a1204" : "#fff";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 190 }}>
      <button onClick={toggle} aria-label={playing ? "Pause voice message" : "Play voice message"} className="ch-btn" style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: mine ? "rgba(26,18,4,0.88)" : GOLD_BTN, color: mine ? "#f6e08a" : "#1a1204" }}>
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />}
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 2, height: 30, flex: 1 }} aria-hidden>
        {bars.map((d, i) => {
          const done = i / bars.length < progress;
          return <span key={i} style={{ width: 3, height: 4 + d * 2.4, borderRadius: 2, background: ink, opacity: done ? 1 : 0.38, transition: "opacity 0.2s" }} />;
        })}
      </div>
      <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, opacity: 0.8, flexShrink: 0 }}>{mmss(playing && audio.current?.currentTime ? audio.current.currentTime : s)}</span>
    </div>
  );
}

function PlanCard({ plan, mine, otherName, status, onAnswer }: {
  plan: { t: string; w: string; at: string }; mine: boolean; otherName: string; status?: "yes" | "no";
  onAnswer: (a: "yes" | "no") => void;
}) {
  const d = new Date(plan.at);
  return (
    <div style={{ width: 252, borderRadius: 22, padding: 4, background: "linear-gradient(135deg, rgba(212,175,55,0.5), rgba(212,175,55,0.08) 55%, rgba(212,175,55,0.35))" }}>
      <div style={{ borderRadius: 19, padding: "16px 18px 16px", background: "linear-gradient(180deg, #17140e, #0d0c10)", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: "#f6e08a" }}>
          <Icon name="later" size={20} /> {mine ? "You proposed a plan" : `${otherName} proposed a plan`}
        </div>
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 32, lineHeight: 1.05, margin: "12px 0 4px" }}>{plan.t}</div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: "rgba(255,255,255,0.78)" }}>
          {d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 24, color: GOLD, marginTop: 2 }}>
          {d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </div>
        {plan.w && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
            <MapPin size={13} color={GOLD} /> {plan.w}
          </div>
        )}
        <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "14px 0 12px" }} />
        {status === "yes" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 20, color: "#f6e08a" }}>
            <Icon name="like" size={22} /> It is on
          </div>
        ) : status === "no" ? (
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: "rgba(255,255,255,0.5)" }}>Not this time</div>
        ) : mine ? (
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: "rgba(255,255,255,0.55)" }}>Waiting for {otherName}</div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ch-btn" onClick={() => onAnswer("no")} style={{ flex: 1, height: 40, borderRadius: 50, fontSize: 13, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.22)" }}>Not this time</button>
            <button className="ch-btn" onClick={() => onAnswer("yes")} style={{ flex: 1, height: 40, borderRadius: 50, border: "none", fontSize: 13, fontWeight: 700, color: "#1a1204", background: GOLD_BTN, boxShadow: GOLD_BTN_SHADOW }}>Accept</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── one message ─────────────────────────────
type RowProps = {
  id: string; mine: boolean; parsed: Parsed; joinsPrev: boolean; joinsNext: boolean;
  stamp: string; reactions: Record<string, string>; myId: string; otherName: string; quoteAuthor?: string;
  selected: boolean; flash: boolean; planStatus?: "yes" | "no";
  onSelect: () => void; onLove: () => void; onReact: (key: string) => void; onReply: () => void; onCopy: () => void;
  onQuote: (id: string) => void; onImage: (src: string) => void; onAnswer: (a: "yes" | "no") => void;
};

function MessageRow(p: RowProps) {
  const { parsed, mine } = p;
  const [dx, setDx] = useState(0);
  const touch = useRef<{ x: number; y: number; live: boolean } | null>(null);
  const lastTap = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (timer.current) clearTimeout(timer.current);
      lastTap.current = 0;
      p.onLove();
    } else {
      lastTap.current = now;
      timer.current = setTimeout(p.onSelect, 280);
    }
  };

  const mineReaction = p.reactions[p.myId];
  const grouped = Object.values(p.reactions).reduce<Record<string, number>>((acc, r) => { acc[r] = (acc[r] ?? 0) + 1; return acc; }, {});
  const keys = Object.keys(grouped);

  const wide = parsed.kind === "img" || parsed.kind === "plan";
  const radius = mine ? `20px ${p.joinsPrev ? 6 : 20}px 6px 20px` : `${p.joinsPrev ? 6 : 20}px 20px 20px 6px`;

  const body = (() => {
    switch (parsed.kind) {
      case "img": {
        const src = postMediaUrl(parsed.p) ?? "";
        return <img src={src} alt="Shared photo" onClick={e => { e.stopPropagation(); p.onImage(src); }} style={{ display: "block", width: 224, maxHeight: 300, objectFit: "cover", borderRadius: 18, cursor: "zoom-in", border: "1px solid rgba(255,255,255,0.14)" }} />;
      }
      case "voice": return <VoiceBubble p={parsed.p} s={parsed.s} w={parsed.w} mine={mine} />;
      case "plan": return <PlanCard plan={parsed} mine={mine} otherName={p.otherName} status={p.planStatus} onAnswer={p.onAnswer} />;
      case "reply":
        return (
          <>
            <div onClick={e => { e.stopPropagation(); p.onQuote(parsed.to); }} style={{ cursor: "pointer", margin: "-2px -4px 8px", padding: "6px 10px", borderRadius: 12, borderLeft: `3px solid ${mine ? "rgba(26,18,4,0.55)" : GOLD}`, background: mine ? "rgba(26,18,4,0.14)" : "rgba(255,255,255,0.06)" }}>
              <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 14, opacity: 0.85 }}>{p.quoteAuthor ?? "Message"}</div>
              <div style={{ fontSize: 12.5, opacity: 0.75, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{parsed.q}</div>
            </div>
            {parsed.text}
          </>
        );
      case "text": return parsed.text;
      default: return null;
    }
  })();

  return (
    <div id={`msg-${p.id}`} className="ch-msg" style={{ position: "relative", zIndex: p.selected ? 7 : 1, display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", marginTop: p.joinsPrev ? 3 : 10 }}>
      <div
        style={{ position: "relative", maxWidth: wide ? "100%" : "78%", transform: `translateX(${dx}px)`, transition: touch.current?.live ? "none" : "transform 0.25s cubic-bezier(.2,.8,.2,1)", touchAction: "pan-y" }}
        onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, live: false }; }}
        onTouchMove={e => {
          const t = touch.current; if (!t) return;
          const mx = e.touches[0].clientX - t.x, my = e.touches[0].clientY - t.y;
          if (!t.live && (Math.abs(my) > Math.abs(mx) || Math.abs(my) > 12)) { touch.current = null; return; }
          if (mx > 6) { t.live = true; setDx(Math.min(64, mx * 0.7)); }
        }}
        onTouchEnd={() => { const fire = dx >= 44; touch.current = null; setDx(0); if (fire) p.onReply(); }}
      >
        {dx > 8 && <span aria-hidden style={{ position: "absolute", left: -34, top: "50%", transform: "translateY(-50%)", opacity: Math.min(1, dx / 44), color: GOLD }}><CornerUpLeft size={18} /></span>}

        {p.selected && (
          <div className="ch-bar" style={{ position: "absolute", bottom: "100%", marginBottom: 10, [mine ? "right" : "left"]: 0, zIndex: 9, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 50, background: "rgba(16,14,20,0.94)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.16)", boxShadow: "0 16px 40px -12px rgba(0,0,0,0.9)", whiteSpace: "nowrap" }}>
            {REACTIONS.map(r => (
              <button key={r.key} className="ch-react" onClick={() => p.onReact(r.key)} aria-label={r.label} title={r.label} style={{ background: mineReaction === r.key ? "rgba(212,175,55,0.22)" : "none", border: "none", borderRadius: "50%", padding: 4, cursor: "pointer" }}>
                <Icon name={r.icon} size={28} />
              </button>
            ))}
            <span style={{ width: 1, height: 24, background: "rgba(255,255,255,0.15)", margin: "0 4px" }} />
            <button className="ch-link" onClick={p.onReply} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: "#f6e08a", padding: "4px 6px" }}><CornerUpLeft size={15} /> Reply</button>
            {parsed.kind === "text" && <button className="ch-link" onClick={p.onCopy} aria-label="Copy" style={{ color: "rgba(255,255,255,0.7)", padding: "4px 6px", display: "flex" }}><Copy size={15} /></button>}
          </div>
        )}

        <div
          onClick={wide ? undefined : onTap}
          className={p.flash ? "ch-flash" : undefined}
          style={wide ? { borderRadius: 20 } : {
            padding: "10px 15px", fontSize: 14.5, lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap", cursor: "pointer", borderRadius: radius,
            color: mine ? "#1a1204" : "#fff",
            background: mine ? "linear-gradient(180deg, #f6e08a 0%, #D4AF37 62%, #bf9722 100%)" : "rgba(255,255,255,0.07)",
            border: mine ? "none" : "1px solid rgba(255,255,255,0.1)",
            boxShadow: mine ? "inset 0 1px 0 rgba(255,255,255,0.5), 0 8px 20px -10px rgba(212,175,55,0.6)" : "none",
            backdropFilter: mine ? undefined : "blur(10px)", WebkitBackdropFilter: mine ? undefined : "blur(10px)",
          }}
        >
          {body}
        </div>

        {parsed.kind !== "plan" && wide && <div onClick={onTap} style={{ position: "absolute", inset: 0, borderRadius: 18 }} />}

        {keys.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginTop: -9, marginLeft: mine ? 0 : 10, marginRight: mine ? 10 : 0, position: "relative", justifyContent: mine ? "flex-end" : "flex-start" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 50, background: "rgba(16,14,20,0.95)", border: "1px solid rgba(212,175,55,0.45)" }}>
              {keys.map(k => {
                const ic = reactionIcon(k);
                return ic ? (
                  <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                    <Icon name={ic} size={15} />
                    {grouped[k] > 1 && <span style={{ fontSize: 11, fontWeight: 700, color: "#f6e08a" }}>{grouped[k]}</span>}
                  </span>
                ) : null;
              })}
            </span>
          </div>
        )}
      </div>

      {!p.joinsNext && (
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13.5, color: "rgba(255,255,255,0.42)", marginTop: 4, padding: "0 4px" }}>{p.stamp}</div>
      )}
    </div>
  );
}

// ───────────────────────────── conversation ─────────────────────────────
function Conversation({ match, user, myProfile, onBack, onRead, onBump, onMatchPatch, toast }: {
  match: MatchX; user: { id: string }; myProfile: unknown;
  onBack: () => void; onRead: () => void; onBump: (content: string, at: string) => void;
  onMatchPatch: (patch: Partial<MatchX>) => void; toast: (m: string) => void;
}) {
  const other = match.other_user;
  const photo = avatarUrl(other?.photos?.[0] ?? other?.avatar_url);
  const online = isOnline(other);
  const sig = sigOf(other?.id);
  const otherName = other?.name ?? "them";

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [consentSaving, setConsentSaving] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);
  const [typing, setTyping] = useState(false);
  const [here, setHere] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);

  const [recording, setRecording] = useState(false);
  const [levels, setLevels] = useState<number[]>([]);
  const [recSecs, setRecSecs] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const atBottomRef = useRef(true);
  const prevCount = useRef(0);
  const lastTypingSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rec = useRef<{ mr: MediaRecorder; stream: MediaStream; ctx: AudioContext; raf: number; start: number; peaks: number[]; chunks: Blob[]; cancelled: boolean } | null>(null);

  const addMessage = (m: Message) => setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]));

  // load, mark read, and listen: new messages, read receipts, typing and who is here
  useEffect(() => {
    prevCount.current = 0;
    (async () => {
      const { data } = await supabase.from("messages").select("*").eq("match_id", match.id).order("created_at");
      setMessages((data as Message[]) ?? []);
      const { error } = await supabase.from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("match_id", match.id).neq("sender_id", user.id).is("read_at", null);
      if (!error) onRead();
    })();

    const channel = supabase.channel(`match:${match.id}`, { config: { presence: { key: user.id }, broadcast: { self: false } } });
    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${match.id}` }, payload => {
        const msg = payload.new as Message;
        addMessage(msg);
        onBump(msg.content, msg.created_at);
        if (msg.sender_id !== user.id) {
          setTyping(false);
          supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", msg.id);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `match_id=eq.${match.id}` }, payload => {
        const u = payload.new as Message;
        setMessages(prev => prev.map(m => (m.id === u.id ? { ...m, read_at: u.read_at } : m)));
      })
      .on("broadcast", { event: "typing" }, () => {
        setTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 3200);
      })
      .on("presence", { event: "sync" }, () => {
        setHere(Object.keys(channel.presenceState()).some(k => k !== user.id));
      })
      .subscribe(async status => { if (status === "SUBSCRIBED") await channel.track({ at: Date.now() }); });
    chRef.current = channel;

    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      supabase.removeChannel(channel);
      chRef.current = null;
    };
  }, [match.id, user.id]);

  // stop the microphone if we leave mid-recording
  useEffect(() => () => {
    const r = rec.current;
    if (r) { r.cancelled = true; cancelAnimationFrame(r.raf); r.stream.getTracks().forEach(t => t.stop()); r.ctx.close().catch(() => {}); }
  }, []);

  // ── fold the event stream into what the screen shows ──
  const parsed = messages.map(m => ({ m, p: parseMsg(m.content) }));
  const reactions: Record<string, Record<string, string>> = {};
  const answers: Record<string, { a: "yes" | "no"; by: string }> = {};
  parsed.forEach(({ m, p }) => {
    if (p.kind === "react") {
      const t = (reactions[p.to] ??= {});
      if (p.r) t[m.sender_id] = p.r; else delete t[m.sender_id];
    } else if (p.kind === "rsvp") answers[p.to] = { a: p.a, by: m.sender_id };
  });
  const visible = parsed.filter(x => !isEvent(x.p));
  const byId = new Map(messages.map(m => [m.id, m]));
  const lastSeenId = [...visible].reverse().find(x => x.m.sender_id === user.id && x.m.read_at)?.m.id ?? null;

  // the conversation's glow: warmer the more you both have said lately
  const recent = visible.filter(x => Date.now() - new Date(x.m.created_at).getTime() < 24 * 3600000);
  const bothSpoke = new Set(recent.map(x => x.m.sender_id)).size > 1;
  const glow = Math.min(bothSpoke ? 1 : 0.4, recent.length / 10);

  // ── scrolling ──
  const scrollToBottom = (smooth: boolean) => bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  useEffect(() => {
    const n = visible.length;
    const delta = n - prevCount.current;
    prevCount.current = n;
    if (delta <= 0) return;
    const last = visible[n - 1];
    if (delta > 1) scrollToBottom(false);
    else if (last.m.sender_id === user.id || atBottomRef.current) scrollToBottom(true);
    else setNewBelow(c => c + 1);
  }, [visible.length]);
  useEffect(() => { if (typing && atBottomRef.current) scrollToBottom(true); }, [typing]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
    atBottomRef.current = near;
    setAtBottom(near);
    if (near) setNewBelow(0);
  };

  // ── sending ──
  const sendRaw = async (content: string, quiet = false) => {
    const { data, error } = await supabase
      .from("messages")
      .insert({ match_id: match.id, sender_id: user.id, content, ...(quiet ? { read_at: new Date().toISOString() } : {}) })
      .select("*")
      .single();
    if (error || !data) return null;
    const msg = data as Message;
    addMessage(msg);
    onBump(msg.content, msg.created_at);
    return msg;
  };

  const sendText = async (override?: string) => {
    const text = (override ?? draft).trim();
    if (!text || sending) return;
    setSending(true);
    if (override === undefined) setDraft("");
    const quote = replyTo;
    setReplyTo(null);
    const content = quote
      ? pack("reply", { to: quote.id, q: previewOf(quote.content).slice(0, 90), t: text })
      : text;
    const ok = await sendRaw(content);
    setSending(false);
    if (!ok) {
      if (override === undefined) setDraft(text);
      setReplyTo(quote);
      toast("Couldn't send. Try again.");
    }
  };

  const onDraft = (v: string) => {
    setDraft(v);
    const now = Date.now();
    if (v && now - lastTypingSent.current > 2200) {
      lastTypingSent.current = now;
      chRef.current?.send({ type: "broadcast", event: "typing", payload: { uid: user.id } });
    }
  };

  const react = async (target: Message, key: string) => {
    setSelectedId(null);
    const mineNow = reactions[target.id]?.[user.id];
    await sendRaw(pack("react", { to: target.id, r: mineNow === key ? "" : key }), true);
  };
  const love = (target: Message) => { if (reactions[target.id]?.[user.id] !== "love") react(target, "love"); };

  const answerPlan = async (planId: string, a: "yes" | "no") => {
    const ok = await sendRaw(pack("rsvp", { to: planId, a }), true);
    if (!ok) toast("Couldn't save that. Try again.");
  };

  const sendPlan = async (plan: { t: string; w: string; at: string }) => {
    setPlanOpen(false);
    const ok = await sendRaw(pack("plan", plan));
    if (!ok) toast("Couldn't send the plan. Try again.");
  };

  const sendPhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast("Please choose a photo."); return; }
    if (file.size > MAX_IMAGE_BYTES) { toast("Photo must be under 10MB."); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/chat-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, file, { contentType: file.type });
    if (error) { setUploading(false); toast("Couldn't upload the photo."); return; }
    const ok = await sendRaw(pack("img", { p: path }));
    setUploading(false);
    if (!ok) toast("Couldn't send the photo.");
  };

  // ── voice notes: real waveform from the microphone ──
  const startRec = async () => {
    if (rec.current || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast("Voice notes need a secure connection and microphone access.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(t => MediaRecorder.isTypeSupported(t));
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const state = { mr, stream, ctx, raf: 0, start: Date.now(), peaks: [] as number[], chunks: [] as Blob[], cancelled: false };
      rec.current = state;
      mr.ondataavailable = e => { if (e.data.size) state.chunks.push(e.data); };
      mr.onstop = () => finishRec(state, mr.mimeType || mime || "audio/webm");

      let lastTick = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let max = 0;
        for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf[i] - 128));
        const level = Math.min(1, (max / 128) * 2.4);
        const now = performance.now();
        if (now - lastTick > 90) {
          lastTick = now;
          state.peaks.push(level);
          setLevels(l => [...l.slice(-31), level]);
          const secs = Math.round((Date.now() - state.start) / 1000);
          setRecSecs(secs);
          if (secs >= MAX_VOICE_SECS) { stopRec(false); return; }
        }
        state.raf = requestAnimationFrame(tick);
      };
      mr.start();
      setLevels([]); setRecSecs(0); setRecording(true);
      state.raf = requestAnimationFrame(tick);
    } catch {
      toast("Allow microphone access to send voice notes.");
    }
  };

  const stopRec = (cancel: boolean) => {
    const r = rec.current;
    if (!r) return;
    r.cancelled = cancel;
    cancelAnimationFrame(r.raf);
    if (r.mr.state !== "inactive") r.mr.stop();
    r.stream.getTracks().forEach(t => t.stop());
    r.ctx.close().catch(() => {});
    setRecording(false);
  };

  const finishRec = async (r: NonNullable<typeof rec.current>, mime: string) => {
    rec.current = null;
    if (r.cancelled) return;
    const secs = Math.max(1, Math.round((Date.now() - r.start) / 1000));
    const blob = new Blob(r.chunks, { type: mime });
    if (blob.size < 800) { toast("That was too short."); return; }
    // squeeze the recording into 32 bars, one digit (0 to 9) each
    const bins = 32;
    const w = Array.from({ length: bins }, (_, i) => {
      const slice = r.peaks.slice(Math.floor((i * r.peaks.length) / bins), Math.max(Math.floor(((i + 1) * r.peaks.length) / bins), Math.floor((i * r.peaks.length) / bins) + 1));
      return String(Math.min(9, Math.round((slice.length ? Math.max(...slice) : 0.15) * 9)));
    }).join("");
    setUploading(true);
    const ext = mime.includes("mp4") ? "m4a" : "webm";
    const path = `${user.id}/voice-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, blob, { contentType: mime });
    if (error) { setUploading(false); toast("Couldn't upload the voice note."); return; }
    const ok = await sendRaw(pack("voice", { p: path, s: secs, w }));
    setUploading(false);
    if (!ok) toast("Couldn't send the voice note.");
  };

  // ── Match of the Week (unchanged rule, tidier states) ──
  const myGender = (myProfile as { gender?: string } | null)?.gender;
  const eligible = (other?.gender === "Man" || other?.gender === "Woman") && (!myGender || myGender !== other?.gender);
  const isUser1 = match.user1_id === user.id;
  const iConsented = !!(isUser1 ? match.consent_user1 : match.consent_user2);
  const theyConsented = !!(isUser1 ? match.consent_user2 : match.consent_user1);
  const giveConsent = async () => {
    if (consentSaving) return;
    setConsentSaving(true);
    const field = isUser1 ? "consent_user1" : "consent_user2";
    const { error } = await supabase.from("matches").update({ [field]: true }).eq("id", match.id);
    setConsentSaving(false);
    if (error) { toast("Couldn't save that. Try again."); return; }
    onMatchPatch({ [field]: true } as Partial<MatchX>);
  };
  const bannerTitle = iConsented && theyConsented ? "You are both in" : iConsented ? "You have said yes" : theyConsented ? `${otherName} would love this` : "Match of the Week";
  const bannerText = iConsented && theyConsented ? "Keep an eye out for Match of the Week." : iConsented ? `Waiting for ${otherName} to say yes too.` : theyConsented ? "Join them and you could be featured together." : "Feature you both? Nothing is shared unless you each say yes.";

  const timeStr = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dayLabel = (iso: string) => {
    const d = new Date(iso), today = new Date(), yest = new Date();
    yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yest.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  };
  const near = (a?: Message, b?: Message) =>
    !!a && !!b && a.sender_id === b.sender_id && new Date(b.created_at).toDateString() === new Date(a.created_at).toDateString() &&
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime() < 5 * 60000;

  const jumpTo = (id: string) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(id);
    setTimeout(() => setFlashId(null), 1000);
  };

  const status = typing ? "typing" : here ? "here" : online ? "online" : "offline";
  const hasText = draft.trim().length > 0;

  return (
    <main style={shell}>
      <style>{CSS}</style>
      <Grain />
      {previewProfile && <ProfilePreviewModal profile={previewProfile} onClose={() => setPreviewProfile(null)} />}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(4,4,8,0.94)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, cursor: "zoom-out" }}>
          <img src={lightbox} alt="Shared photo" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 16 }} />
        </div>
      )}
      {selectedId && <div onClick={() => setSelectedId(null)} style={{ position: "absolute", inset: 0, zIndex: 6 }} />}

      {/* header */}
      <div style={{ position: "relative", padding: "calc(env(safe-area-inset-top, 0px) + 16px) 18px 14px", display: "flex", alignItems: "center", gap: 14 }}>
        <button className="ch-btn" onClick={onBack} aria-label="Back to messages" style={{ ...glass, width: 40, height: 40, borderRadius: "50%", flexShrink: 0, color: "#fff" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="ch-tap" role="button" tabIndex={0} onClick={() => other && setPreviewProfile(other)} onKeyDown={e => { if (e.key === "Enter" && other) setPreviewProfile(other); }} style={{ display: "flex", alignItems: "center", gap: 13, cursor: "pointer", minWidth: 0 }}>
          <Avatar src={photo} size={48} sig={sig} online={online || here} ring="gold" glow={glow} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 25, lineHeight: 1.05, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{otherName}</div>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, marginTop: 2, display: "flex", alignItems: "center", gap: 6, color: status === "offline" ? "rgba(255,255,255,0.5)" : status === "online" ? "#7ee8ad" : "#f6e08a" }}>
              {status === "typing" && <span className="ch-typing" aria-hidden><span /><span /><span /></span>}
              {status === "typing" ? "writing to you" : status === "here" ? "here with you" : status === "online" ? "Online now" : "Offline"}
            </div>
          </div>
        </div>
      </div>
      <div style={rule} />

      {eligible && (
        <div className="ch-rise" style={{ margin: "14px 16px 0", borderRadius: 20, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(135deg, rgba(212,175,55,0.14), rgba(212,175,55,0.04))", border: "1px solid rgba(212,175,55,0.35)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}>
          <Icon name="like" size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 18, lineHeight: 1.1, color: "#f6e08a" }}>{bannerTitle}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", lineHeight: 1.4, marginTop: 3 }}>{bannerText}</div>
          </div>
          {!iConsented && (
            <button className="ch-btn" onClick={giveConsent} disabled={consentSaving} style={{ flexShrink: 0, height: 36, padding: "0 18px", borderRadius: 50, border: "none", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", color: "#1a1204", background: GOLD_BTN, boxShadow: GOLD_BTN_SHADOW }}>{consentSaving ? "Saving" : "Yes"}</button>
          )}
        </div>
      )}

      {/* messages */}
      <div ref={scrollRef} onScroll={onScroll} className="ch-scroll" style={{ position: "relative", flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 16px 10px", display: "flex", flexDirection: "column", WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 20px)", maskImage: "linear-gradient(to bottom, transparent 0, #000 20px)" }}>
        {visible.length === 0 ? (
          <div className="ch-rise" style={{ margin: "auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, paddingBottom: 30, width: "100%" }}>
            <Avatar src={photo} size={92} sig={sig} ring="gold" />
            <h2 style={{ margin: "10px 0 0", fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 30 }}>Say hello to {otherName}</h2>
            <p style={{ margin: "0 0 8px", fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: "rgba(255,255,255,0.55)", maxWidth: 250, lineHeight: 1.45 }}>Begin with one of these, or write your own.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 320 }}>
              {STARTERS(other?.location).map(s => (
                <button key={s} className="ch-btn" onClick={() => sendText(s)} style={{ textAlign: "left", padding: "13px 18px", borderRadius: 18, fontFamily: SERIF, fontStyle: "italic", fontSize: 18, lineHeight: 1.3, color: "#fff", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)" }}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          visible.map(({ m, p }, i) => {
            const mine = m.sender_id === user.id;
            const prev = visible[i - 1]?.m;
            const next = visible[i + 1]?.m;
            const joinsNext = near(m, next);
            const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
            const ans = p.kind === "plan" ? answers[m.id] : undefined;
            const planStatus = ans && ans.by !== m.sender_id ? ans.a : undefined;
            const seen = mine && m.id === lastSeenId && m.read_at;
            const quoted = p.kind === "reply" ? byId.get(p.to) : undefined;
            return (
              <div key={m.id}>
                {newDay && (
                  <div style={{ display: "flex", alignItems: "center", gap: 14, margin: i === 0 ? "0 0 16px" : "22px 0 16px" }}>
                    <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                    <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: "rgba(255,255,255,0.5)" }}>{dayLabel(m.created_at)}</span>
                    <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                  </div>
                )}
                <MessageRow
                  id={m.id} mine={mine} parsed={p} joinsPrev={near(prev, m)} joinsNext={joinsNext}
                  stamp={`${timeStr(m.created_at)}${seen ? `  ·  Seen ${timeStr(m.read_at!)}` : ""}`}
                  reactions={reactions[m.id] ?? {}} myId={user.id} otherName={otherName}
                  quoteAuthor={quoted ? (quoted.sender_id === user.id ? "You" : otherName) : undefined}
                  selected={selectedId === m.id} flash={flashId === m.id} planStatus={planStatus}
                  onSelect={() => setSelectedId(s => (s === m.id ? null : m.id))}
                  onLove={() => love(m)} onReact={k => react(m, k)}
                  onReply={() => { setSelectedId(null); setReplyTo(m); }}
                  onCopy={() => { if (p.kind === "text") navigator.clipboard?.writeText(p.text); setSelectedId(null); toast("Copied"); }}
                  onQuote={jumpTo} onImage={setLightbox} onAnswer={a => answerPlan(m.id, a)}
                />
              </div>
            );
          })
        )}
        {typing && (
          <div className="ch-msg" style={{ alignSelf: "flex-start", marginTop: 10, padding: "12px 16px", borderRadius: "20px 20px 20px 6px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span className="ch-typing" aria-label={`${otherName} is writing`}><span /><span /><span /></span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!atBottom && (
        <button className="ch-btn" onClick={() => { scrollToBottom(true); setNewBelow(0); }} aria-label="Scroll to latest message" style={{ ...glass, position: "absolute", right: 18, bottom: replyTo ? 162 : 100, zIndex: 12, width: 42, height: 42, borderRadius: "50%", color: "#fff" }}>
          <ChevronDown size={20} />
          {newBelow > 0 && <span style={{ position: "absolute", top: -6, right: -4, minWidth: 20, height: 20, padding: "0 6px", borderRadius: 50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#1a1204", background: GOLD_BTN }}>{newBelow}</span>}
        </button>
      )}

      {/* composer */}
      <div style={{ position: "relative", zIndex: 8, background: "rgba(7,7,12,0.78)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {replyTo && (
          <div className="ch-bar" style={{ display: "flex", alignItems: "center", gap: 12, margin: "10px 16px 0", padding: "8px 8px 8px 14px", borderRadius: 16, borderLeft: `3px solid ${GOLD}`, background: "rgba(255,255,255,0.05)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 15, color: "#f6e08a" }}>Replying to {replyTo.sender_id === user.id ? "yourself" : otherName}</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{previewOf(replyTo.content)}</div>
            </div>
            <button className="ch-btn" onClick={() => setReplyTo(null)} aria-label="Cancel reply" style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={15} /></button>
          </div>
        )}

        {attachOpen && !recording && (
          <>
            <div onClick={() => setAttachOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
            <div className="ch-bar" style={{ position: "absolute", left: 16, bottom: "calc(100% + 0px)", marginBottom: -2, zIndex: 11, display: "flex", flexDirection: "column", gap: 8, transform: "translateY(-6px)" }}>
              <button className="ch-btn" onClick={() => { setAttachOpen(false); setPlanOpen(true); }} style={{ ...glass, gap: 10, height: 46, padding: "0 20px 0 12px", borderRadius: 50, color: "#fff", fontFamily: SERIF, fontStyle: "italic", fontSize: 18, background: "rgba(16,14,20,0.94)" }}>
                <Icon name="later" size={24} /> Plan something
              </button>
              <button className="ch-btn" onClick={() => { setAttachOpen(false); fileRef.current?.click(); }} style={{ ...glass, gap: 10, height: 46, padding: "0 20px 0 14px", borderRadius: 50, color: "#fff", fontFamily: SERIF, fontStyle: "italic", fontSize: 18, background: "rgba(16,14,20,0.94)" }}>
                <ImageIcon size={20} color={GOLD} /> Share a photo
              </button>
            </div>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) sendPhoto(f); e.target.value = ""; }} />

        <div style={{ padding: "12px 16px calc(14px + env(safe-area-inset-bottom, 0px))", display: "flex", gap: 10, alignItems: "center" }}>
          {recording ? (
            <>
              <button className="ch-btn" onClick={() => stopRec(true)} aria-label="Cancel recording" style={{ ...glass, width: 48, height: 48, flexShrink: 0, borderRadius: "50%", color: "#fff" }}><X size={18} /></button>
              <div style={{ flex: 1, height: 48, borderRadius: 50, display: "flex", alignItems: "center", gap: 12, padding: "0 18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(212,175,55,0.45)" }}>
                <span className="ch-recdot" style={{ width: 9, height: 9, borderRadius: "50%", background: "#ff5c85", boxShadow: "0 0 10px #ff5c85", flexShrink: 0 }} />
                <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 19, minWidth: 38 }}>{mmss(recSecs)}</span>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2, height: 30, overflow: "hidden" }} aria-hidden>
                  {levels.map((l, i) => <span key={i} style={{ width: 3, height: 4 + l * 24, borderRadius: 2, background: GOLD, opacity: 0.4 + l * 0.6 }} />)}
                </div>
              </div>
              <button className="ch-btn" onClick={() => stopRec(false)} aria-label="Send voice note" style={{ width: 48, height: 48, flexShrink: 0, borderRadius: "50%", border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: GOLD_BTN, boxShadow: GOLD_BTN_SHADOW, color: "#1a1204" }}><ArrowUp size={20} strokeWidth={2.6} /></button>
            </>
          ) : (
            <>
              <button className="ch-btn" onClick={() => setAttachOpen(o => !o)} aria-label="Attach" aria-expanded={attachOpen} style={{ ...glass, width: 48, height: 48, flexShrink: 0, borderRadius: "50%", color: GOLD, transform: attachOpen ? "rotate(45deg)" : "none", transition: "transform 0.3s cubic-bezier(.2,.8,.2,1)" }}><Plus size={20} /></button>
              <input
                className="ch-input"
                value={draft}
                onChange={e => onDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) sendText(); }}
                placeholder={uploading ? "Sending" : `Write to ${otherName}`}
                aria-label={`Message ${otherName}`}
                disabled={uploading}
                style={{ flex: 1, minWidth: 0, height: 48, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 50, padding: "0 20px", fontSize: 15, color: "#fff", outline: "none", fontFamily: "system-ui" }}
              />
              {hasText ? (
                <button className="ch-btn" onClick={() => sendText()} disabled={sending} aria-label="Send" style={{ width: 48, height: 48, flexShrink: 0, borderRadius: "50%", border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: GOLD_BTN, boxShadow: GOLD_BTN_SHADOW, color: "#1a1204" }}><ArrowUp size={20} strokeWidth={2.6} /></button>
              ) : (
                <button className="ch-btn" onClick={startRec} disabled={uploading} aria-label="Record a voice note" style={{ ...glass, width: 48, height: 48, flexShrink: 0, borderRadius: "50%", color: GOLD, border: "1px solid rgba(212,175,55,0.55)" }}><Mic size={20} /></button>
              )}
            </>
          )}
        </div>
      </div>

      {planOpen && <PlanSheet name={otherName} onClose={() => setPlanOpen(false)} onSend={sendPlan} />}
    </main>
  );
}

// ───────────────────────────── plan composer ─────────────────────────────
const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

function PlanSheet({ name, onClose, onSend }: { name: string; onClose: () => void; onSend: (p: { t: string; w: string; at: string }) => void }) {
  const [kind, setKind] = useState(PLAN_KINDS[0]);
  const [where, setWhere] = useState("");
  const [when, setWhen] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(17, 0, 0, 0); return toLocalInput(d); });
  const valid = !!when && new Date(when).getTime() > Date.now();

  const field: React.CSSProperties = { width: "100%", height: 50, boxSizing: "border-box", borderRadius: 16, padding: "0 16px", fontSize: 15, color: "#fff", outline: "none", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", fontFamily: "system-ui", colorScheme: "dark" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} className="ch-sheet" style={{ width: "100%", maxWidth: 430, borderRadius: "30px 30px 0 0", padding: "26px 22px calc(26px + env(safe-area-inset-bottom, 0px))", background: "linear-gradient(180deg, #14120d, #0b0a0e)", borderTop: "1px solid rgba(212,175,55,0.45)", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="later" size={34} />
          <div>
            <h2 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 30, lineHeight: 1 }}>Plan something</h2>
            <p style={{ margin: "4px 0 0", fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: "rgba(255,255,255,0.55)" }}>A quiet invitation for {name}</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "22px 0 14px" }}>
          {PLAN_KINDS.map(k => (
            <button key={k} className="ch-btn" onClick={() => setKind(k)} style={{ padding: "8px 18px", borderRadius: 50, fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 18, color: kind === k ? "#1a1204" : "#fff", background: kind === k ? GOLD_BTN : "rgba(255,255,255,0.06)", border: kind === k ? "none" : "1px solid rgba(255,255,255,0.18)" }}>{k}</button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="ch-field" value={where} onChange={e => setWhere(e.target.value)} placeholder="Where? A place you both know" maxLength={80} style={field} aria-label="Where" />
          <input type="datetime-local" value={when} min={toLocalInput(new Date())} onChange={e => setWhen(e.target.value)} style={field} aria-label="When" />
        </div>

        <button className="ch-btn" disabled={!valid} onClick={() => onSend({ t: kind, w: where.trim(), at: new Date(when).toISOString() })} style={{ width: "100%", height: 54, marginTop: 20, borderRadius: 50, border: "none", fontSize: 15, fontWeight: 700, letterSpacing: "0.02em", color: "#1a1204", background: GOLD_BTN, boxShadow: GOLD_BTN_SHADOW }}>
          Send the invitation
        </button>
        <div style={{ textAlign: "center", marginTop: 6 }}>
          <button className="ch-link" onClick={onClose} style={{ padding: "12px 20px", fontFamily: SERIF, fontStyle: "italic", fontSize: 19, color: "rgba(255,255,255,0.6)" }}>Not now</button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── inbox ─────────────────────────────
export default function ChatsPage() {
  const router = useRouter();
  const { user, profile: myProfile, loading: authLoading } = useAuth();

  const [matches, setMatches] = useState<MatchX[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetching(true);
      const { data: rawMatches } = await supabase
        .from("matches").select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!rawMatches?.length) { setMatches([]); setFetching(false); return; }

      const otherIds = rawMatches.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", otherIds);
      const profileMap: Record<string, Profile> = {};
      profiles?.forEach(p => { profileMap[p.id] = p as Profile; });

      const enriched = await Promise.all(rawMatches.map(async m => {
        const { data: lastMsgArr } = await supabase
          .from("messages").select("content, created_at").eq("match_id", m.id).order("created_at", { ascending: false }).limit(1);
        const { count: unread } = await supabase
          .from("messages").select("id", { count: "exact", head: true })
          .eq("match_id", m.id).neq("sender_id", user.id).is("read_at", null);
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id;
        return {
          ...m,
          other_user: profileMap[otherId],
          last_message: lastMsgArr?.[0]?.content,
          last_message_at: lastMsgArr?.[0]?.created_at,
          unread_count: unread ?? 0,
        } as MatchX;
      }));

      setMatches(enriched.filter(m => m.other_user));
      setFetching(false);
    })();
  }, [user]);

  const timeAgo = (iso?: string) => {
    if (!iso) return "";
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };

  const toastEl = toast && (
    <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 400, background: "rgba(24,10,16,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,92,133,0.55)", color: "#ffc2d1", fontSize: 13, fontWeight: 600, padding: "11px 22px", borderRadius: 50, whiteSpace: "nowrap", animation: "chToast 0.3s ease both" }}>
      {toast}
    </div>
  );

  if (authLoading || fetching) return (
    <main style={shell}>
      <style>{CSS}</style>
      <Header />
      <div style={{ padding: "10px 22px 20px" }}>
        <div className="ch-skel" style={{ width: 190, height: 38, borderRadius: 8, marginBottom: 12 }} />
        <div className="ch-skel" style={{ width: 110, height: 14, borderRadius: 6 }} />
      </div>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px" }}>
          <div className="ch-skel" style={{ width: 58, height: 58, borderRadius: "50%" }} />
          <div style={{ flex: 1 }}>
            <div className="ch-skel" style={{ width: "40%", height: 16, borderRadius: 6, marginBottom: 10 }} />
            <div className="ch-skel" style={{ width: "75%", height: 12, borderRadius: 6 }} />
          </div>
        </div>
      ))}
      <BottomNav />
    </main>
  );

  const active = activeId ? matches.find(m => m.id === activeId) ?? null : null;
  if (active && user) {
    return (
      <>
        {toastEl}
        <Conversation
          key={active.id}
          match={active}
          user={user}
          myProfile={myProfile}
          onBack={() => setActiveId(null)}
          onRead={() => setMatches(ms => ms.map(m => (m.id === active.id ? { ...m, unread_count: 0 } : m)))}
          onBump={(content, at) => setMatches(ms => ms.map(m => (m.id === active.id ? { ...m, last_message: content, last_message_at: at } : m)))}
          onMatchPatch={patch => setMatches(ms => ms.map(m => (m.id === active.id ? { ...m, ...patch } : m)))}
          toast={showToast}
        />
      </>
    );
  }

  const totalUnread = matches.reduce((s, m) => s + m.unread_count, 0);
  const fresh = matches.filter(m => !m.last_message);
  const convos = matches
    .filter(m => m.last_message)
    .sort((a, b) => new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime());

  return (
    <main style={shell}>
      <style>{CSS}</style>
      <Grain />
      {toastEl}
      <Header />
      {previewProfile && <ProfilePreviewModal profile={previewProfile} onClose={() => setPreviewProfile(null)} />}

      <div style={{ position: "relative", padding: "6px 22px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 44, letterSpacing: "-0.015em", lineHeight: 0.95 }}>Messages</h1>
            <p style={{ margin: "8px 0 0", fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: "rgba(255,255,255,0.58)" }}>
              {matches.length > 0 ? `${matches.length} ${matches.length === 1 ? "match" : "matches"}` : "Where conversations begin"}
            </p>
          </div>
          {totalUnread > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 17, color: "#f6e08a", paddingBottom: 4 }}>
              <span className="ch-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, boxShadow: `0 0 10px ${GOLD}` }} />
              {totalUnread} unread
            </div>
          )}
        </div>
        <div style={{ ...rule, marginTop: 16 }} />
      </div>

      <div className="ch-scroll" style={{ position: "relative", flex: 1, minHeight: 0, overflowY: "auto", padding: `4px 0 ${BOTTOM_NAV_HEIGHT + 24}px` }}>
        {matches.length === 0 ? (
          <div className="ch-rise" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, padding: "46px 32px 0" }}>
            <Emblem />
            <h2 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 30, fontWeight: 600 }}>No conversations yet</h2>
            <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: "rgba(255,255,255,0.58)", lineHeight: 1.5, maxWidth: 270 }}>Like someone back and your first match will appear here.</p>
            <button className="ch-btn" onClick={() => router.push("/likes")} style={{ marginTop: 10, height: 46, padding: "0 28px", borderRadius: 50, border: "none", fontSize: 14, fontWeight: 700, letterSpacing: "0.02em", color: "#1a1204", background: GOLD_BTN, boxShadow: GOLD_BTN_SHADOW }}>See who likes you</button>
          </div>
        ) : (
          <>
            {fresh.length > 0 && (
              <section className="ch-rise" style={{ padding: "18px 0 6px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "0 22px 14px" }}>
                  <h2 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 22 }}>New matches</h2>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{fresh.length}</span>
                </div>
                <div className="ch-scroll" style={{ display: "flex", gap: 20, overflowX: "auto", padding: "6px 22px 8px" }}>
                  {fresh.map((m, i) => (
                    <button key={m.id} className="ch-btn ch-rise" onClick={() => setActiveId(m.id)} aria-label={`Start a conversation with ${m.other_user?.name}`} style={{ background: "none", border: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0, color: "#fff", animationDelay: `${i * 0.06}s` }}>
                      <Avatar src={avatarUrl(m.other_user?.photos?.[0] ?? m.other_user?.avatar_url)} size={68} sig={sigOf(m.other_user?.id)} online={isOnline(m.other_user)} ring="gold" />
                      <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 16, maxWidth: 76, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.other_user?.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section style={{ paddingTop: fresh.length > 0 ? 14 : 12 }}>
              {convos.length > 0 && <h2 style={{ margin: 0, padding: "0 22px 6px", fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 22 }}>Conversations</h2>}
              {convos.length === 0 ? (
                <p className="ch-rise" style={{ margin: 0, padding: "28px 32px", textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>Choose someone above and say hello.</p>
              ) : (
                convos.map((m, i) => {
                  const photo = avatarUrl(m.other_user?.photos?.[0] ?? m.other_user?.avatar_url);
                  const unread = m.unread_count > 0;
                  const kind = m.last_message ? parseMsg(m.last_message).kind : "text";
                  return (
                    <div key={m.id} className="ch-row ch-rise" role="button" tabIndex={0} onClick={() => setActiveId(m.id)} onKeyDown={e => { if (e.key === "Enter") setActiveId(m.id); }} style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 22px", animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
                      <div onClick={e => { e.stopPropagation(); if (m.other_user) setPreviewProfile(m.other_user); }} aria-label={`View ${m.other_user?.name}'s profile`} role="button" style={{ cursor: "pointer", padding: "14px 0" }}>
                        <Avatar src={photo} size={58} sig={sigOf(m.other_user?.id)} online={isOnline(m.other_user)} ring={unread ? "gold" : "soft"} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, padding: "14px 0", borderBottom: i === convos.length - 1 ? "none" : "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                          <span style={{ fontFamily: SERIF, fontWeight: unread ? 700 : 600, fontSize: 22, lineHeight: 1.1, letterSpacing: "-0.005em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.other_user?.name}</span>
                          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, flexShrink: 0, color: unread ? "#f6e08a" : "rgba(255,255,255,0.45)", fontWeight: unread ? 700 : 500 }}>{timeAgo(m.last_message_at)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 5 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, fontSize: 13.5, color: unread ? "#fff" : "rgba(255,255,255,0.55)", fontWeight: unread ? 500 : 400, fontStyle: kind === "text" || kind === "reply" ? "normal" : "italic" }}>
                            {kind === "voice" && <Mic size={13} color={GOLD} />}
                            {kind === "img" && <ImageIcon size={13} color={GOLD} />}
                            {kind === "plan" && <Icon name="later" size={16} />}
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewOf(m.last_message)}</span>
                          </span>
                          {unread && <span style={{ minWidth: 22, height: 22, padding: "0 7px", borderRadius: 50, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#1a1204", background: GOLD_BTN, boxShadow: "0 0 12px rgba(212,175,55,0.5)" }}>{m.unread_count}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}