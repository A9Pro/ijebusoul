"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import BottomNav, { BOTTOM_NAV_HEIGHT } from "@/components/BottomNav";
import Header from "@/components/Header";
import ProfilePreviewModal from "@/components/ProfilePreviewModal";
import { Icon, Silhouette } from "@/components/SoulIcons";
import type { Match, Message, Profile } from "@/lib/types";
import { ArrowLeft, ArrowUp } from "lucide-react";

const GOLD = "#D4AF37";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const GOLD_BTN = "linear-gradient(180deg, #f6e08a 0%, #D4AF37 48%, #a9801a 100%)";
const GOLD_BTN_SHADOW = "inset 0 1px 0 rgba(255,255,255,0.55), 0 8px 22px -6px rgba(212,175,55,0.5)";
const ONLINE = "#3ddc84";

// One signature hue per person, shared with the feed and likes pages.
const SIGNATURES = ["212,175,55", "205,96,58", "52,150,108", "112,92,205", "214,134,82", "46,156,176"];
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const sigOf = (id?: string) => SIGNATURES[hash(id ?? "x") % SIGNATURES.length];
const isOnline = (p?: Profile | null) => !!p?.online_at && Date.now() - new Date(p.online_at).getTime() < 300000;

type MatchX = Match & { consent_user1?: boolean; consent_user2?: boolean };

const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const CSS = `
  @keyframes chRise { from { opacity: 0; transform: translateY(18px); filter: blur(5px); } to { opacity: 1; transform: none; filter: blur(0); } }
  @keyframes chMsg { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
  @keyframes chShimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
  @keyframes chSpin { to { transform: rotate(360deg); } }
  @keyframes chBreathe { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.35); } }
  @keyframes chToast { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
  .ch-rise { animation: chRise 0.7s cubic-bezier(.2,.8,.2,1) backwards; }
  .ch-msg { animation: chMsg 0.35s cubic-bezier(.2,.8,.2,1) backwards; }
  .ch-skel { background: linear-gradient(90deg, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 80%); background-size: 200% 100%; animation: chShimmer 1.8s linear infinite; }
  .ch-dot { animation: chBreathe 2.6s ease-in-out infinite; }
  .ch-spin { animation: chSpin 48s linear infinite; }
  .ch-spin-rev { animation: chSpin 30s linear infinite reverse; }
  .ch-row { transition: background 0.25s ease; cursor: pointer; }
  .ch-row:hover { background: rgba(255,255,255,0.03); }
  .ch-row:active { background: rgba(255,255,255,0.06); }
  .ch-row:focus-visible, .ch-tap:focus-visible { outline: 2px solid #fff; outline-offset: -2px; }
  .ch-btn { transition: transform 0.2s ease, filter 0.25s ease, opacity 0.25s ease; cursor: pointer; }
  .ch-btn:hover:not(:disabled) { filter: brightness(1.08); }
  .ch-btn:active:not(:disabled) { transform: scale(0.95); }
  .ch-btn:disabled { opacity: 0.45; cursor: default; }
  .ch-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  .ch-link { background: none; border: none; cursor: pointer; transition: color 0.2s ease; }
  .ch-link:hover { color: #fff; }
  .ch-scroll { scrollbar-width: none; }
  .ch-scroll::-webkit-scrollbar { display: none; }
  .ch-input::placeholder { font-family: ${SERIF}; font-style: italic; font-size: 16px; color: rgba(255,255,255,0.4); }
  @media (prefers-reduced-motion: reduce) {
    .ch-rise, .ch-msg, .ch-skel, .ch-dot, .ch-spin, .ch-spin-rev { animation: none !important; }
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

function Grain() {
  return <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.05, mixBlendMode: "overlay", backgroundImage: GRAIN }} />;
}

function Avatar({ src, size, sig, online, ring }: { src?: string | null; size: number; sig: string; online?: boolean; ring?: "gold" | "soft" }) {
  const dot = Math.max(10, Math.round(size * 0.2));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {ring === "gold" && <div style={{ position: "absolute", inset: -5, borderRadius: "50%", border: "1px solid rgba(212,175,55,0.45)" }} />}
      <div style={{
        position: "relative", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#111",
        border: ring === "gold" ? `1.5px solid ${GOLD}` : "1px solid rgba(255,255,255,0.18)",
        boxShadow: ring === "gold" ? "0 0 24px rgba(212,175,55,0.3)" : "none",
      }}>
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

export default function ChatsPage() {
  const router = useRouter();
  const { user, profile: myProfile, loading: authLoading } = useAuth();

  const [matches, setMatches] = useState<MatchX[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeMatch, setActiveMatch] = useState<MatchX | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);
  const [consentSaving, setConsentSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

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
        .from("matches")
        .select("*")
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

  const bump = (matchId: string, content: string, at: string) =>
    setMatches(ms => ms.map(m => (m.id === matchId ? { ...m, last_message: content, last_message_at: at } : m)));

  useEffect(() => {
    if (!activeMatch || !user) return;
    prevCount.current = 0;

    (async () => {
      const { data } = await supabase
        .from("messages").select("*").eq("match_id", activeMatch.id).order("created_at");
      setMessages((data as Message[]) ?? []);

      const { error: markErr } = await supabase.from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("match_id", activeMatch.id).neq("sender_id", user.id).is("read_at", null);

      if (!markErr) {
        setMatches(ms => ms.map(m => m.id === activeMatch.id ? { ...m, unread_count: 0 } : m));
      }
    })();

    const channel = supabase
      .channel(`match:${activeMatch.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `match_id=eq.${activeMatch.id}`,
      }, payload => {
        const msg = payload.new as Message;
        setMessages(prev => (prev.some(x => x.id === msg.id) ? prev : [...prev, msg]));
        bump(activeMatch.id, msg.content, msg.created_at);
        if (msg.sender_id !== user.id) {
          supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", msg.id);
        }
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "messages",
        filter: `match_id=eq.${activeMatch.id}`,
      }, payload => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, read_at: updated.read_at } : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeMatch?.id, user]);

  // Jump straight to the latest on open; glide for new messages after that.
  useEffect(() => {
    const jump = messages.length - prevCount.current > 1;
    bottomRef.current?.scrollIntoView({ behavior: jump ? "auto" : "smooth" });
    prevCount.current = messages.length;
  }, [messages]);

  const sendMessage = async () => {
    if (!draft.trim() || !activeMatch || !user || sending) return;
    setSending(true);
    const content = draft.trim();
    setDraft("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ match_id: activeMatch.id, sender_id: user.id, content })
      .select("*")
      .single();
    setSending(false);
    if (error || !data) {
      setDraft(content);
      showToast("Couldn't send. Try again.");
      return;
    }
    const msg = data as Message;
    setMessages(prev => (prev.some(x => x.id === msg.id) ? prev : [...prev, msg]));
    bump(activeMatch.id, msg.content, msg.created_at);
  };

  // ── Match of the Week consent ──
  const giveConsent = async () => {
    if (!activeMatch || !user || consentSaving) return;
    setConsentSaving(true);
    const field = activeMatch.user1_id === user.id ? "consent_user1" : "consent_user2";
    const { error } = await supabase.from("matches").update({ [field]: true }).eq("id", activeMatch.id);
    setConsentSaving(false);
    if (error) { showToast("Couldn't save that. Try again."); return; }
    setActiveMatch(m => (m ? ({ ...m, [field]: true } as MatchX) : m));
    setMatches(ms => ms.map(m => (m.id === activeMatch.id ? ({ ...m, [field]: true } as MatchX) : m)));
  };

  const timeStr = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const timeAgo = (iso?: string) => {
    if (!iso) return "";
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };
  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yest = new Date();
    yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yest.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  };

  const toastEl = toast && (
    <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 400, background: "rgba(24,10,16,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,92,133,0.55)", color: "#ffc2d1", fontSize: 13, fontWeight: 600, padding: "11px 22px", borderRadius: 50, whiteSpace: "nowrap", animation: "chToast 0.3s ease both" }}>
      {toast}
    </div>
  );

  // ── loading ──
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

  // ══════════ conversation ══════════
  if (activeMatch) {
    const other = activeMatch.other_user;
    const photo = avatarUrl(other?.photos?.[0] ?? other?.avatar_url);
    const online = isOnline(other);
    const sig = sigOf(other?.id);

    const lastSeenId = [...messages].reverse().find(m => m.sender_id === user?.id && m.read_at)?.id ?? null;

    // Match of the Week: only offered to a Man + Woman pair. The database function is the real
    // source of truth; this just decides whether to show the invitation.
    const myGender = (myProfile as unknown as { gender?: string } | null)?.gender;
    const eligible = (other?.gender === "Man" || other?.gender === "Woman") && (!myGender || myGender !== other?.gender);
    const isUser1 = activeMatch.user1_id === user?.id;
    const iConsented = !!(isUser1 ? activeMatch.consent_user1 : activeMatch.consent_user2);
    const theyConsented = !!(isUser1 ? activeMatch.consent_user2 : activeMatch.consent_user1);

    const bannerTitle =
      iConsented && theyConsented ? "You are both in" :
      iConsented ? "You have said yes" :
      theyConsented ? `${other?.name} would love this` : "Match of the Week";
    const bannerText =
      iConsented && theyConsented ? "Keep an eye out for Match of the Week." :
      iConsented ? `Waiting for ${other?.name} to say yes too.` :
      theyConsented ? "Join them and you could be featured together." :
      "Feature you both? Nothing is shared unless you each say yes.";

    return (
      <main style={shell}>
        <style>{CSS}</style>
        <Grain />
        {toastEl}
        {previewProfile && <ProfilePreviewModal profile={previewProfile} onClose={() => setPreviewProfile(null)} />}

        {/* header */}
        <div style={{ position: "relative", padding: "calc(env(safe-area-inset-top, 0px) + 16px) 18px 14px", display: "flex", alignItems: "center", gap: 14 }}>
          <button className="ch-btn" onClick={() => setActiveMatch(null)} aria-label="Back to messages" style={{ ...glass, width: 40, height: 40, borderRadius: "50%", flexShrink: 0, color: "#fff" }}>
            <ArrowLeft size={18} />
          </button>
          <div
            className="ch-tap"
            role="button"
            tabIndex={0}
            onClick={() => other && setPreviewProfile(other)}
            onKeyDown={e => { if (e.key === "Enter" && other) setPreviewProfile(other); }}
            style={{ display: "flex", alignItems: "center", gap: 13, cursor: "pointer", minWidth: 0 }}
          >
            <Avatar src={photo} size={48} sig={sig} online={online} ring="gold" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 25, lineHeight: 1.05, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{other?.name}</div>
              <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, marginTop: 2, color: online ? "#7ee8ad" : "rgba(255,255,255,0.5)" }}>{online ? "Online now" : "Offline"}</div>
            </div>
          </div>
        </div>
        <div style={rule} />

        {/* Match of the Week invitation */}
        {eligible && (
          <div className="ch-rise" style={{ margin: "14px 16px 0", position: "relative", borderRadius: 20, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(135deg, rgba(212,175,55,0.14), rgba(212,175,55,0.04))", border: "1px solid rgba(212,175,55,0.35)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}>
            <Icon name="like" size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 18, lineHeight: 1.1, color: "#f6e08a" }}>{bannerTitle}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", lineHeight: 1.4, marginTop: 3 }}>{bannerText}</div>
            </div>
            {!iConsented && (
              <button className="ch-btn" onClick={giveConsent} disabled={consentSaving} style={{ flexShrink: 0, height: 36, padding: "0 18px", borderRadius: 50, border: "none", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", color: "#1a1204", background: GOLD_BTN, boxShadow: GOLD_BTN_SHADOW }}>
                {consentSaving ? "Saving" : "Yes"}
              </button>
            )}
          </div>
        )}

        {/* messages */}
        <div className="ch-scroll" style={{ position: "relative", flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 16px 8px", display: "flex", flexDirection: "column" }}>
          {messages.length === 0 ? (
            <div className="ch-rise" style={{ margin: "auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, paddingBottom: 40 }}>
              <Avatar src={photo} size={92} sig={sig} ring="gold" />
              <h2 style={{ margin: "10px 0 0", fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 30 }}>Say hello to {other?.name}</h2>
              <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: "rgba(255,255,255,0.55)", maxWidth: 250, lineHeight: 1.45 }}>A kind first line goes a long way.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const mine = msg.sender_id === user?.id;
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const near = (a?: Message, b?: Message) =>
                !!a && !!b && a.sender_id === b.sender_id && new Date(b.created_at).toDateString() === new Date(a.created_at).toDateString() &&
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime() < 5 * 60000;
              const joinsPrev = near(prev, msg);
              const joinsNext = near(msg, next);
              const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(msg.created_at).toDateString();
              const seen = mine && msg.id === lastSeenId;

              return (
                <div key={msg.id}>
                  {newDay && (
                    <div style={{ display: "flex", alignItems: "center", gap: 14, margin: i === 0 ? "0 0 16px" : "22px 0 16px" }}>
                      <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                      <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: "rgba(255,255,255,0.5)" }}>{dayLabel(msg.created_at)}</span>
                      <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                    </div>
                  )}
                  <div className="ch-msg" style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", marginTop: joinsPrev ? 3 : 10 }}>
                    <div
                      style={{
                        maxWidth: "76%", padding: "10px 15px", fontSize: 14.5, lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap",
                        color: mine ? "#1a1204" : "#fff",
                        background: mine ? "linear-gradient(180deg, #f6e08a 0%, #D4AF37 62%, #bf9722 100%)" : "rgba(255,255,255,0.07)",
                        border: mine ? "none" : "1px solid rgba(255,255,255,0.1)",
                        boxShadow: mine ? "inset 0 1px 0 rgba(255,255,255,0.5), 0 8px 20px -10px rgba(212,175,55,0.6)" : "none",
                        backdropFilter: mine ? undefined : "blur(10px)", WebkitBackdropFilter: mine ? undefined : "blur(10px)",
                        borderRadius: mine ? `20px ${joinsPrev ? 6 : 20}px 6px 20px` : `${joinsPrev ? 6 : 20}px 20px 20px 6px`,
                      }}
                    >
                      {msg.content}
                    </div>
                    {!joinsNext && (
                      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13.5, color: "rgba(255,255,255,0.42)", marginTop: 4, padding: "0 4px" }}>
                        {timeStr(msg.created_at)}{seen && msg.read_at ? `  ·  Seen ${timeStr(msg.read_at)}` : ""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* composer */}
        <div style={{ position: "relative", padding: "12px 16px calc(14px + env(safe-area-inset-bottom, 0px))", display: "flex", gap: 10, alignItems: "center", background: "rgba(7,7,12,0.72)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <input
            className="ch-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) sendMessage(); }}
            placeholder={`Write to ${other?.name}`}
            aria-label={`Message ${other?.name}`}
            style={{ flex: 1, height: 48, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 50, padding: "0 20px", fontSize: 15, color: "#fff", outline: "none", fontFamily: "system-ui" }}
          />
          <button
            className="ch-btn"
            onClick={sendMessage}
            disabled={sending || !draft.trim()}
            aria-label="Send"
            style={{ width: 48, height: 48, flexShrink: 0, borderRadius: "50%", border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: GOLD_BTN, boxShadow: GOLD_BTN_SHADOW, color: "#1a1204" }}
          >
            <ArrowUp size={20} strokeWidth={2.6} />
          </button>
        </div>
      </main>
    );
  }

  // ══════════ inbox ══════════
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
            <button className="ch-btn" onClick={() => router.push("/likes")} style={{ marginTop: 10, height: 46, padding: "0 28px", borderRadius: 50, border: "none", fontSize: 14, fontWeight: 700, letterSpacing: "0.02em", color: "#1a1204", background: GOLD_BTN, boxShadow: GOLD_BTN_SHADOW }}>
              See who likes you
            </button>
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
                    <button
                      key={m.id}
                      className="ch-btn ch-rise"
                      onClick={() => setActiveMatch(m)}
                      aria-label={`Start a conversation with ${m.other_user?.name}`}
                      style={{ background: "none", border: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0, color: "#fff", animationDelay: `${i * 0.06}s` }}
                    >
                      <Avatar src={avatarUrl(m.other_user?.photos?.[0] ?? m.other_user?.avatar_url)} size={68} sig={sigOf(m.other_user?.id)} online={isOnline(m.other_user)} ring="gold" />
                      <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 16, maxWidth: 76, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.other_user?.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section style={{ paddingTop: fresh.length > 0 ? 14 : 12 }}>
              {convos.length > 0 && (
                <h2 style={{ margin: 0, padding: "0 22px 6px", fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 22 }}>Conversations</h2>
              )}
              {convos.length === 0 ? (
                <p className="ch-rise" style={{ margin: 0, padding: "28px 32px", textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                  Choose someone above and say hello.
                </p>
              ) : (
                convos.map((m, i) => {
                  const photo = avatarUrl(m.other_user?.photos?.[0] ?? m.other_user?.avatar_url);
                  const unread = m.unread_count > 0;
                  return (
                    <div
                      key={m.id}
                      className="ch-row ch-rise"
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveMatch(m)}
                      onKeyDown={e => { if (e.key === "Enter") setActiveMatch(m); }}
                      style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 22px", animationDelay: `${Math.min(i, 8) * 0.05}s` }}
                    >
                      <div
                        onClick={e => { e.stopPropagation(); if (m.other_user) setPreviewProfile(m.other_user); }}
                        aria-label={`View ${m.other_user?.name}'s profile`}
                        role="button"
                        style={{ cursor: "pointer", padding: "14px 0" }}
                      >
                        <Avatar src={photo} size={58} sig={sigOf(m.other_user?.id)} online={isOnline(m.other_user)} ring={unread ? "gold" : "soft"} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, padding: "14px 0", borderBottom: i === convos.length - 1 ? "none" : "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                          <span style={{ fontFamily: SERIF, fontWeight: unread ? 700 : 600, fontSize: 22, lineHeight: 1.1, letterSpacing: "-0.005em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.other_user?.name}</span>
                          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, flexShrink: 0, color: unread ? "#f6e08a" : "rgba(255,255,255,0.45)", fontWeight: unread ? 700 : 500 }}>{timeAgo(m.last_message_at)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 5 }}>
                          <span style={{ fontSize: 13.5, color: unread ? "#fff" : "rgba(255,255,255,0.55)", fontWeight: unread ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.last_message}</span>
                          {unread && (
                            <span style={{ minWidth: 22, height: 22, padding: "0 7px", borderRadius: 50, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#1a1204", background: GOLD_BTN, boxShadow: "0 0 12px rgba(212,175,55,0.5)" }}>{m.unread_count}</span>
                          )}
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