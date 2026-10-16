"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Heart, Send, Eye, Trash2, Repeat2, Volume2, VolumeX, LayoutGrid } from "lucide-react";
import { supabase, avatarUrl } from "@/lib/supabase";
import { buildStrips } from "@/components/SoulCloth";
import {
  agoShort, deleteStory, hoursLeft, isLive, loadViewers, markViewed, repostStoryToFeed, reshareStory, setLiked, storyMediaUrl,
  type Story, type StoryGroup, type Viewer,
} from "@/lib/stories";

const GOLD = "#D4AF37";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const PHOTO_MS = 6000;
const SIGS = ["212,175,55", "205,96,58", "52,150,108", "112,92,205", "214,134,82", "46,156,176"];
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

const CSS = `
@keyframes svIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}
@keyframes svBurst{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}30%{opacity:1}100%{opacity:0;transform:translate(-50%,-90%) scale(1.8)}}
@keyframes svEcho{0%{opacity:0;transform:translateY(20px) scale(.9)}15%{opacity:1}100%{opacity:0;transform:translateY(-140px) scale(1.04)}}
@keyframes svPulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.5)}}
@keyframes svSheet{from{transform:translateY(100%)}to{transform:none}}
.sv-in{animation:svIn .28s cubic-bezier(.2,.8,.2,1)}
.sv-sheet{animation:svSheet .32s cubic-bezier(.2,.8,.2,1)}
.sv-btn{background:none;border:0;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;transition:transform .15s}
.sv-btn:active{transform:scale(.88)}
.sv-input::placeholder{color:rgba(255,255,255,.55);font-family:${SERIF};font-style:italic;font-size:16px}
@media (prefers-reduced-motion:reduce){.sv-in,.sv-sheet{animation:none!important}}
`;

export default function StoryViewer({
  groups, startGroup, startStory, myId, names, matchByUser, onClose,
}: {
  groups: StoryGroup[]; startGroup: number; startStory: number; myId: string;
  names: Record<string, string>; matchByUser: Record<string, string>; onClose: () => void;
}) {
  const [data, setData] = useState(groups);
  const [gi, setGi] = useState(startGroup);
  const [si, setSi] = useState(startStory);
  const [progress, setProgress] = useState(0);
  const [held, setHeld] = useState(false);
  const [muted, setMuted] = useState(true);
  const [reply, setReply] = useState("");
  const [typing, setTyping] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [bursts, setBursts] = useState<number[]>([]);
  const [echoes, setEchoes] = useState<{ id: number; text: string }[]>([]);
  const [note, setNote] = useState("");

  const group = data[gi];
  const story = group?.stories[si];
  const mine = group?.mine ?? false;
  const matchId = group ? matchByUser[group.user.id] : undefined;

  const videoRef = useRef<HTMLVideoElement>(null);
  const elapsed = useRef(0);
  const down = useRef<{ t: number; x: number; y: number } | null>(null);
  const paused = held || typing || viewersOpen || shareOpen;

  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 1800); };
  const patch = useCallback((id: string, p: Partial<Story>) => {
    setData(d => d.map(g => ({ ...g, stories: g.stories.map(s => (s.id === id ? { ...s, ...p } : s)) })));
  }, []);

  const next = useCallback(() => {
    if (!group) return;
    if (si < group.stories.length - 1) setSi(si + 1);
    else if (gi < data.length - 1) { setGi(gi + 1); setSi(0); }
    else onClose();
  }, [group, si, gi, data.length, onClose]);

  const prev = useCallback(() => {
    if (progress > 0.12) { elapsed.current = 0; setProgress(0); if (videoRef.current) videoRef.current.currentTime = 0; return; }
    if (si > 0) setSi(si - 1);
    else if (gi > 0) { setGi(gi - 1); setSi(Math.max(0, data[gi - 1].stories.length - 1)); }
  }, [progress, si, gi, data]);

  // reset on story change, and record the view
  useEffect(() => {
    elapsed.current = 0; setProgress(0); setReply(""); setViewersOpen(false); setShareOpen(false);
    if (story && !story.viewed && !mine) { patch(story.id, { viewed: true }); void markViewed(story.id, myId); }
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // timer for photo / text stories
  useEffect(() => {
    if (!story || story.type === "video") return;
    let raf = 0, last = performance.now();
    const tick = (t: number) => {
      const dt = t - last; last = t;
      if (!paused) {
        elapsed.current += dt;
        const p = Math.min(1, elapsed.current / PHOTO_MS);
        setProgress(p);
        if (p >= 1) { next(); return; }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [story?.id, paused, next]); // eslint-disable-line react-hooks/exhaustive-deps

  // video: pause and play with the same hold logic
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) v.pause(); else v.play().catch(() => {});
  }, [paused, story?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  useEffect(() => {
    if (viewersOpen && story) loadViewers(story.id).then(setViewers);
  }, [viewersOpen, story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const burst = () => { const id = Date.now(); setBursts(b => [...b, id]); setTimeout(() => setBursts(b => b.filter(x => x !== id)), 900); };

  const like = async () => {
    if (!story || mine) return;
    const liking = !story.liked;
    patch(story.id, { liked: liking, likes: Math.max(0, story.likes + (liking ? 1 : -1)) });
    if (liking) burst();
    const ok = await setLiked(story.id, myId, liking);
    if (!ok) { patch(story.id, { liked: !liking, likes: Math.max(0, story.likes) }); flash("Couldn't save that"); }
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || !story || !matchId) return;
    setReply("");
    const quote = story.caption ? ` “${story.caption.slice(0, 40)}${story.caption.length > 40 ? "…" : ""}”` : "";
    const { error } = await supabase.from("messages").insert({ match_id: matchId, sender_id: myId, content: `↩ Replied to your story${quote}\n${text}` });
    if (error) { flash("Couldn't send"); setReply(text); return; }
    const id = Date.now();
    setEchoes(e => [...e, { id, text }]);
    setTimeout(() => setEchoes(e => e.filter(x => x.id !== id)), 2600);
  };

  const remove = async () => {
    if (!story || !window.confirm("Delete this story?")) return;
    const ok = await deleteStory(story);
    if (!ok) { flash("Couldn't delete"); return; }
    const g = data[gi];
    if (g.stories.length === 1) {
      if (data.length === 1) { onClose(); return; }
      setData(d => d.filter((_, i) => i !== gi)); setSi(0); setGi(Math.min(gi, data.length - 2));
    } else {
      setData(d => d.map((x, i) => (i === gi ? { ...x, stories: x.stories.filter(s => s.id !== story.id) } : x)));
      setSi(Math.min(si, g.stories.length - 2));
    }
  };

  const reshare = async () => {
    if (!story) return;
    setShareOpen(false);
    const ok = await reshareStory(story, myId);
    flash(ok ? "Added to your story" : "Couldn't reshare");
  };

  const toFeed = async () => {
    if (!story) return;
    setShareOpen(false);
    flash("Posting to your feed…");
    const r = await repostStoryToFeed(story, myId);
    flash(r.ok ? "Posted to your feed" : r.reason === "sql" ? "Run supabase/reposts.sql first" : "Couldn't post it");
  };

  const copyLink = async () => {
    setShareOpen(false);
    const url = `${window.location.origin}/profile/${story?.user_id}`;
    try {
      if (navigator.share) await navigator.share({ title: "ìjèbú soul story", url });
      else { await navigator.clipboard.writeText(url); flash("Link copied"); }
    } catch { /* cancelled */ }
  };

  const shared = !!(story?.reshared_from || story?.source_post);
  const frame = useMemo(() => (shared ? buildStrips(story!.user_id, 1)[0] : null), [shared, story?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps
  const sig = SIGS[hash(story?.user_id ?? "x") % SIGS.length];
  if (!group || !story) return null;

  const photo = avatarUrl(group.user.photos?.[0] ?? group.user.avatar_url);
  const media = storyMediaUrl(story.media_url);
  const origin = shared && story.origin_user ? names[story.origin_user] : null;

  const onDown = (e: React.PointerEvent) => { down.current = { t: Date.now(), x: e.clientX, y: e.clientY }; setHeld(true); };
  const onUp = (e: React.PointerEvent) => {
    setHeld(false);
    const d = down.current; down.current = null;
    if (!d) return;
    if (e.clientY - d.y > 110) { onClose(); return; }
    if (Date.now() - d.t < 220 && Math.abs(e.clientX - d.x) < 12) {
      const w = (e.currentTarget as HTMLElement).clientWidth;
      if (e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left < w * 0.3) prev(); else next();
    }
  };

  return (
    <div className="sv-in" style={{ position: "fixed", inset: 0, zIndex: 500, background: "#000", display: "flex", justifyContent: "center", fontFamily: "system-ui" }}>
      <style>{CSS}</style>
      <div style={{ position: "relative", width: "100%", maxWidth: 430, height: "100dvh", overflow: "hidden", background: "#07070c", padding: frame ? 4 : 0, backgroundImage: frame ?? undefined }}>
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: frame ? 18 : 0, background: "#07070c" }}>

          {/* surface */}
          {story.type === "text" ? (
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 45% at 25% 20%, rgba(${sig},0.38), transparent 70%), radial-gradient(55% 45% at 75% 80%, rgba(${sig},0.2), transparent 70%), ${story.bg_color || "#1a1a2e"}`, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 34px" }}>
              <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: (story.caption?.length ?? 0) > 90 ? 26 : 34, lineHeight: 1.35, color: "#fff", textAlign: "center", textShadow: "0 2px 18px rgba(0,0,0,.45)" }}>“{story.caption}”</p>
            </div>
          ) : story.type === "video" && media ? (
            <video ref={videoRef} key={story.id} src={media} muted={muted} playsInline autoPlay
              onTimeUpdate={e => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
              onEnded={next}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : media ? (
            <img src={media} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}

          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to bottom, rgba(0,0,0,.6), transparent 22%, transparent 62%, rgba(0,0,0,.78))" }} />

          {/* gesture layer */}
          <div onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { setHeld(false); down.current = null; }}
            style={{ position: "absolute", inset: 0, zIndex: 2, touchAction: "none", cursor: "pointer" }} />

          {/* caption on media stories */}
          {story.type !== "text" && story.caption && (
            <div style={{ position: "absolute", left: 18, right: 18, bottom: 108, zIndex: 3, pointerEvents: "none", fontFamily: SERIF, fontStyle: "italic", fontSize: 22, lineHeight: 1.3, color: "#fff", textShadow: "0 2px 14px rgba(0,0,0,.8)" }}>{story.caption}</div>
          )}

          {/* progress + header */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 4, padding: "calc(env(safe-area-inset-top,0px) + 10px) 12px 0", pointerEvents: "none" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {group.stories.map((s, i) => (
                <div key={s.id} style={{ flex: 1, height: 3, borderRadius: 3, background: "rgba(255,255,255,.28)", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#fff", width: `${i < si ? 100 : i === si ? progress * 100 : 0}%` }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, pointerEvents: "auto" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", border: `1.5px solid rgb(${sig})`, background: "#111", flexShrink: 0 }}>
                {photo && <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 19, lineHeight: 1.05, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mine ? "Your story" : group.user.name}</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.72)", marginTop: 2 }}>
                  {agoShort(story.created_at)} · {hoursLeft(story.expires_at)}
                  {origin ? <span style={{ color: `rgb(${sig})`, fontWeight: 700 }}> · ↻ from {origin}</span> : story.source_post ? <span style={{ color: `rgb(${sig})`, fontWeight: 700 }}> · from the feed</span> : null}
                </div>
              </div>
              {story.type === "video" && (
                <button className="sv-btn" aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(m => !m)} style={{ width: 36, height: 36 }}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
              )}
              <button className="sv-btn" aria-label="Close stories" onClick={onClose} style={{ width: 36, height: 36 }}><X size={22} /></button>
            </div>
          </div>

          {/* heart burst + echo replies */}
          {bursts.map(id => (
            <span key={id} style={{ position: "absolute", left: "50%", top: "52%", zIndex: 5, pointerEvents: "none", animation: "svBurst .9s ease-out forwards" }}><Heart size={90} fill={`rgb(${sig})`} color={`rgb(${sig})`} /></span>
          ))}
          {echoes.map(e => (
            <div key={e.id} style={{ position: "absolute", right: 16, bottom: 120, zIndex: 5, pointerEvents: "none", maxWidth: "70%", padding: "9px 15px", borderRadius: "18px 18px 4px 18px", background: "linear-gradient(180deg,#f6e08a,#D4AF37)", color: "#1a1204", fontSize: 14, fontWeight: 600, animation: "svEcho 2.6s ease-out forwards" }}>{e.text}</div>
          ))}

          {note && <div style={{ position: "absolute", top: 100, left: "50%", transform: "translateX(-50%)", zIndex: 8, background: "rgba(16,14,20,.95)", border: `1px solid ${GOLD}`, color: "#fff", borderRadius: 50, padding: "8px 18px", fontSize: 13, fontWeight: 600 }}>{note}</div>}

          {/* footer */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 4, padding: "0 14px calc(env(safe-area-inset-bottom,0px) + 16px)", display: "flex", alignItems: "center", gap: 10 }}>
            {mine ? (
              <>
                <button className="sv-btn" onClick={() => setViewersOpen(true)} style={{ gap: 8, height: 46, padding: "0 20px", borderRadius: 50, background: "rgba(16,14,20,.7)", border: "1px solid rgba(255,255,255,.2)", backdropFilter: "blur(12px)", fontFamily: SERIF, fontStyle: "italic", fontSize: 18 }}>
                  <Eye size={18} color={GOLD} /> {story.views} {story.views === 1 ? "view" : "views"}
                </button>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>♥ {story.likes}</span>
                <button className="sv-btn" aria-label="Share" onClick={() => setShareOpen(true)} style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(16,14,20,.7)", border: "1px solid rgba(255,255,255,.2)" }}><Repeat2 size={18} /></button>
                <button className="sv-btn" aria-label="Delete story" onClick={remove} style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(16,14,20,.7)", border: "1px solid rgba(255,255,255,.2)" }}><Trash2 size={18} color="#ff6b88" /></button>
              </>
            ) : (
              <>
                {matchId ? (
                  <input className="sv-input" value={reply} onChange={e => setReply(e.target.value)}
                    onFocus={() => setTyping(true)} onBlur={() => setTyping(false)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) void sendReply(); }}
                    placeholder={`Reply to ${group.user.name.split(" ")[0]}`}
                    style={{ flex: 1, minWidth: 0, height: 46, borderRadius: 50, padding: "0 20px", color: "#fff", fontSize: 15, outline: "none", background: "rgba(16,14,20,.6)", border: "1px solid rgba(255,255,255,.3)", backdropFilter: "blur(12px)" }} />
                ) : (
                  <div style={{ flex: 1, fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: "rgba(255,255,255,.6)" }}>Replies open when you match</div>
                )}
                {reply.trim() ? (
                  <button className="sv-btn" aria-label="Send reply" onClick={sendReply} style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(180deg,#f6e08a,#D4AF37)", color: "#1a1204" }}><Send size={18} /></button>
                ) : (
                  <>
                    <button className="sv-btn" aria-label={story.liked ? "Unlike" : "Like"} onClick={like} style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(16,14,20,.6)", border: "1px solid rgba(255,255,255,.25)" }}>
                      <Heart size={20} fill={story.liked ? `rgb(${sig})` : "none"} color={story.liked ? `rgb(${sig})` : "#fff"} />
                    </button>
                    <button className="sv-btn" aria-label="Share" onClick={() => setShareOpen(true)} style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(16,14,20,.6)", border: "1px solid rgba(255,255,255,.25)" }}><Repeat2 size={20} /></button>
                  </>
                )}
              </>
            )}
          </div>

          {/* viewers sheet: a pulse beside anyone still here */}
          {viewersOpen && (
            <div onClick={() => setViewersOpen(false)} style={{ position: "absolute", inset: 0, zIndex: 9, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end" }}>
              <div onClick={e => e.stopPropagation()} className="sv-sheet" style={{ width: "100%", maxHeight: "62%", overflowY: "auto", borderRadius: "26px 26px 0 0", background: "linear-gradient(180deg,#14120d,#0b0a0e)", borderTop: "1px solid rgba(212,175,55,.45)", padding: "22px 20px 30px" }}>
                <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 26, color: "#fff" }}>Seen by {viewers.length}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", margin: "2px 0 14px" }}>{story.likes} {story.likes === 1 ? "like" : "likes"} · a glowing dot means they are here right now</div>
                {viewers.length === 0 && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: "rgba(255,255,255,.5)", padding: "18px 0" }}>No one yet.</div>}
                {viewers.map(v => {
                  const p = avatarUrl(v.user.photos?.[0] ?? v.user.avatar_url);
                  return (
                    <div key={v.user.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0" }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", background: "#111", border: "1px solid rgba(255,255,255,.18)" }}>{p && <img src={p} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
                      <div style={{ flex: 1, fontFamily: SERIF, fontWeight: 600, fontSize: 19, color: "#fff" }}>{v.user.name}</div>
                      {isLive(v.user) && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#3ddc84", boxShadow: "0 0 10px #3ddc84", animation: "svPulse 1.6s ease-in-out infinite" }} />}
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>{agoShort(v.at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* share sheet */}
          {shareOpen && (
            <div onClick={() => setShareOpen(false)} style={{ position: "absolute", inset: 0, zIndex: 9, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end" }}>
              <div onClick={e => e.stopPropagation()} className="sv-sheet" style={{ width: "100%", borderRadius: "26px 26px 0 0", background: "linear-gradient(180deg,#14120d,#0b0a0e)", borderTop: "1px solid rgba(212,175,55,.45)", padding: "22px 20px 30px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 26, color: "#fff", marginBottom: 6 }}>Share this story</div>
                {!mine && (
                  <button className="sv-btn" onClick={reshare} style={{ justifyContent: "flex-start", gap: 12, height: 54, padding: "0 20px", borderRadius: 18, background: "rgba(255,255,255,.06)", border: "1px solid rgba(212,175,55,.35)", fontFamily: SERIF, fontStyle: "italic", fontSize: 19 }}><Repeat2 size={20} color={GOLD} /> Add to my story, stitched in your cloth</button>
                )}
                <button className="sv-btn" onClick={toFeed} style={{ justifyContent: "flex-start", gap: 12, height: 54, padding: "0 20px", borderRadius: 18, background: "rgba(255,255,255,.06)", border: "1px solid rgba(212,175,55,.35)", fontFamily: SERIF, fontStyle: "italic", fontSize: 19 }}><LayoutGrid size={20} color={GOLD} /> Post to my feed</button>
                {!mine && (
                  <button className="sv-btn" onClick={copyLink} style={{ justifyContent: "flex-start", gap: 12, height: 54, padding: "0 20px", borderRadius: 18, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.15)", fontFamily: SERIF, fontStyle: "italic", fontSize: 19 }}><Send size={20} color={GOLD} /> Send their profile link</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}