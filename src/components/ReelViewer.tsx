"use client";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Sparkles, MessageCircle, Share2, Bookmark, Volume2, VolumeX, Play, MapPin, Plus } from "lucide-react";
import { avatarUrl, postMediaUrl } from "@/lib/supabase";
import type { Post } from "@/lib/types";

const GOLD = "#D4AF37";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SIGS = ["212,175,55", "205,96,58", "52,150,108", "112,92,205", "214,134,82", "46,156,176"];

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}
const compact = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n));

// Lighter than the author's colour, so hashtags stay readable on dark backgrounds.
const lift = (sig: string) => sig.split(",").map(n => Math.round(Number(n) + (255 - Number(n)) * 0.42)).join(",");

function Caption({ text, sig }: { text: string; sig: string }) {
  const c = lift(sig);
  return (
    <>
      {text.split(/(#\w+)/g).map((part, i) =>
        part.startsWith("#") ? <span key={i} style={{ color: `rgb(${c})`, fontWeight: 700 }}>{part}</span> : part
      )}
    </>
  );
}

const CSS = `
@keyframes rvIn{from{opacity:0}to{opacity:1}}
@keyframes rvBurst{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}25%{opacity:1}100%{opacity:0;transform:translate(-50%,-85%) scale(1.8)}}
@keyframes rvPause{0%{opacity:0;transform:translate(-50%,-50%) scale(.7)}30%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.2)}}
@keyframes rvDrift{0%,100%{transform:translate(0,0);opacity:.25}50%{transform:translate(var(--d),calc(var(--d) * -1));opacity:.9}}
.rv-scroll{scrollbar-width:none;overscroll-behavior-y:contain}
.rv-scroll::-webkit-scrollbar{display:none}
.rv-btn{background:none;border:0;padding:0;cursor:pointer;color:#fff;display:flex;flex-direction:column;align-items:center;gap:5px;font-family:system-ui;-webkit-tap-highlight-color:transparent;transition:transform .15s}
.rv-btn:active{transform:scale(.88)}
.rv-glass{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(14,14,20,.42);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.rv-btn:focus-visible{outline:2px solid ${GOLD};outline-offset:3px;border-radius:50%}
@media (prefers-reduced-motion:reduce){.rv-anim{animation:none!important}}
`;

export interface ReelActions {
  feel(p: Post): void;
  follow(p: Post): void;
  save(p: Post): void;
  talk(id: string): void;
  share(p: Post): void;
  profile(userId: string): void;
  toggleSound(): void;
  close(): void;
}

interface ItemProps {
  post: Post;
  index: number;
  active: boolean;
  isOwner: boolean;
  soundOn: boolean;
  originName?: string;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  onActive(i: number): void;
  actions: ReelActions;
}

function ReelItemBase(p: ItemProps) {
  const { post, actions: a } = p;
  const caption = post.caption ?? "";
  const media = postMediaUrl(post.media_url);
  const isVideo = post.type === "video";
  const isText = post.type === "text";
  const photo = avatarUrl(post.profile?.photos?.[0] ?? post.profile?.avatar_url);
  const sig = SIGS[hash(post.user_id) % SIGS.length];

  const secRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(p.active);
  const [ready, setReady] = useState(false);
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [bursts, setBursts] = useState<number[]>([]);
  const [pauseFlash, setPauseFlash] = useState(0);

  // Visible enough to count as "the one being watched".
  useEffect(() => {
    const el = secRef.current, root = p.scrollerRef.current;
    if (!el || !root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) p.onActive(p.index); }, { root, threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [p.index, p.scrollerRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // Media only exists about a screen either side of the viewer, so a long run of reels stays light.
  useEffect(() => {
    const el = secRef.current, root = p.scrollerRef.current;
    if (!el || !root || typeof IntersectionObserver === "undefined") { setNear(true); return; }
    const enter = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true); }, { root, rootMargin: "100% 0px 100% 0px" });
    const leave = new IntersectionObserver(([e]) => { if (!e.isIntersecting) setNear(false); }, { root, rootMargin: "250% 0px 250% 0px" });
    enter.observe(el); leave.observe(el);
    return () => { enter.disconnect(); leave.disconnect(); };
  }, [p.scrollerRef]);

  useEffect(() => { if (!near) { setReady(false); setProgress(0); } }, [near]);

  // Only the reel in front plays. Everything else is paused, and far-away video releases its decoder.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!near) { v.pause(); v.removeAttribute("src"); v.load(); return; }
    if (p.active && !paused) v.play().catch(() => {}); else v.pause();
    if (!p.active) { try { v.currentTime = 0; } catch { /* not ready yet */ } }
  }, [near, p.active, paused]);

  useEffect(() => { if (!p.active) { setPaused(false); setOpen(false); } }, [p.active]);

  const burst = () => { const id = Date.now() + Math.random(); setBursts(b => [...b, id]); setTimeout(() => setBursts(b => b.filter(x => x !== id)), 950); };
  const feel = () => { if (!post.user_liked) burst(); a.feel(post); };

  // single tap = pause or play, double tap = feel
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTap = () => {
    const now = Date.now();
    if (now - last.current < 260) {
      if (timer.current) clearTimeout(timer.current);
      last.current = 0;
      burst();
      if (!post.user_liked) a.feel(post);
    } else {
      last.current = now;
      timer.current = setTimeout(() => { if (isVideo) { setPaused(v => !v); setPauseFlash(k => k + 1); } }, 260);
    }
  };

  const world = useMemo(() => {
    let s = hash(post.id);
    const r = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return {
      x1: 15 + r() * 70, y1: 10 + r() * 35, x2: 15 + r() * 70, y2: 55 + r() * 35,
      dots: Array.from({ length: 10 }, () => ({ left: r() * 100, top: r() * 100, size: 2 + r() * 3, dur: 7 + r() * 9, delay: -r() * 12, drift: 20 + r() * 40 })),
    };
  }, [post.id]);

  const felt = post.likes_count;
  const long = caption.length > 110;

  return (
    <section ref={secRef} data-reel={post.id} style={{ position: "relative", height: "100%", scrollSnapAlign: "start", scrollSnapStop: "always", overflow: "hidden", background: "#07070c" }}>
      {/* backdrop: the author's colour, so any letterboxing looks intentional */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(80% 50% at 50% 30%, rgba(${sig},0.28), transparent 75%), radial-gradient(70% 45% at 50% 95%, rgba(${sig},0.16), transparent 75%), #07070c` }} />

      {isText ? (
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 45% at ${world.x1}% ${world.y1}%, rgba(${sig},0.36), transparent 70%), radial-gradient(55% 45% at ${world.x2}% ${world.y2}%, rgba(${sig},0.2), transparent 70%), ${post.bg_color || "#1a1a2e"}` }}>
          {near && p.active && world.dots.map((d, i) => (
            <span key={i} className="rv-anim" style={{ position: "absolute", left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size, borderRadius: "50%", background: `rgba(${sig},0.8)`, boxShadow: `0 0 8px rgba(${sig},0.7)`, animation: `rvDrift ${d.dur}s ease-in-out ${d.delay}s infinite`, ["--d" as string]: `${d.drift}px` }} />
          ))}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 34px" }}>
            <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: caption.length > 140 ? 26 : caption.length > 70 ? 32 : 40, lineHeight: 1.3, color: "#fff", textAlign: "center", textShadow: "0 2px 22px rgba(0,0,0,.5)" }}>
              “<Caption text={caption} sig={sig} />”
            </p>
          </div>
        </div>
      ) : media ? (
        <>
          {!isVideo && near && fit === "contain" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media} alt="" aria-hidden="true" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(34px) saturate(1.3)", transform: "scale(1.2)", opacity: 0.7 }} />
          )}
          {isVideo ? (
            <video
              ref={videoRef}
              src={near ? `${media}#t=0.001` : undefined}
              muted={!p.soundOn}
              loop
              playsInline
              preload={p.active ? "auto" : "metadata"}
              onLoadedMetadata={e => { const v = e.currentTarget; if (v.videoWidth && v.videoHeight) setFit(v.videoWidth / v.videoHeight < 0.62 ? "cover" : "contain"); }}
              onLoadedData={() => setReady(true)}
              onTimeUpdate={e => { const v = e.currentTarget; if (p.active && v.duration) setProgress(v.currentTime / v.duration); }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, opacity: ready ? 1 : 0, transition: "opacity .35s ease" }}
            />
          ) : near ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={el => { if (el && el.complete && el.naturalWidth > 0) { setReady(true); setFit(el.naturalWidth / el.naturalHeight < 0.62 ? "cover" : "contain"); } }}
              src={media}
              alt=""
              decoding="async"
              fetchPriority={p.active ? "high" : "auto"}
              onLoad={e => { const im = e.currentTarget; setReady(true); setFit(im.naturalWidth / im.naturalHeight < 0.62 ? "cover" : "contain"); }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, opacity: ready ? 1 : 0, transition: "opacity .35s ease" }}
            />
          ) : null}
        </>
      ) : null}

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to bottom, rgba(0,0,0,.55) 0%, transparent 20%, transparent 50%, rgba(0,0,0,.82) 100%)" }} />

      {/* tap surface */}
      <div onClick={onTap} style={{ position: "absolute", inset: 0, zIndex: 1, cursor: "pointer" }} />

      {bursts.map(id => (
        <span key={id} className="rv-anim" style={{ position: "absolute", left: "50%", top: "46%", zIndex: 4, pointerEvents: "none", animation: "rvBurst .95s ease-out forwards" }}>
          <Sparkles size={96} fill={`rgb(${sig})`} color={`rgb(${sig})`} style={{ filter: `drop-shadow(0 0 22px rgb(${sig}))` }} />
        </span>
      ))}
      {isVideo && pauseFlash > 0 && (
        <span key={pauseFlash} className="rv-anim" style={{ position: "absolute", left: "50%", top: "46%", zIndex: 4, pointerEvents: "none", width: 74, height: 74, borderRadius: "50%", background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", animation: "rvPause .7s ease-out forwards" }}>
          {paused ? <Play size={30} color="#fff" fill="#fff" /> : <span style={{ display: "flex", gap: 7 }}><i style={{ width: 8, height: 28, borderRadius: 3, background: "#fff" }} /><i style={{ width: 8, height: 28, borderRadius: 3, background: "#fff" }} /></span>}
        </span>
      )}

      {/* top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 3, padding: "calc(env(safe-area-inset-top, 0px) + 12px) 14px 0", display: "flex", alignItems: "center", justifyContent: "space-between", pointerEvents: "none" }}>
        <button className="rv-btn" onClick={a.close} aria-label="Back to the stream" style={{ pointerEvents: "auto" }}>
          <span className="rv-glass"><ChevronLeft size={24} /></span>
        </button>
        {isVideo && (
          <button className="rv-btn" onClick={a.toggleSound} aria-label={p.soundOn ? "Mute" : "Unmute"} style={{ pointerEvents: "auto" }}>
            <span className="rv-glass">{p.soundOn ? <Volume2 size={19} /> : <VolumeX size={19} />}</span>
          </button>
        )}
      </div>

      {/* action rail */}
      <div style={{ position: "absolute", right: 12, bottom: "calc(env(safe-area-inset-bottom, 0px) + 30px)", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <button className="rv-btn" onClick={feel} aria-label={post.user_liked ? "Felt" : "Feel"}>
          <span className="rv-glass" style={post.user_liked ? { background: `rgba(${sig},0.95)`, borderColor: `rgb(${sig})`, boxShadow: `0 0 22px rgba(${sig},0.6)` } : undefined}>
            <Sparkles size={22} color={post.user_liked ? "#000" : "#fff"} fill={post.user_liked ? "#000" : "none"} />
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, textShadow: "0 1px 6px rgba(0,0,0,.7)" }}>{compact(felt)}</span>
        </button>
        <button className="rv-btn" onClick={() => a.talk(post.id)} aria-label="Open conversation">
          <span className="rv-glass"><MessageCircle size={22} /></span>
          <span style={{ fontSize: 12, fontWeight: 700, textShadow: "0 1px 6px rgba(0,0,0,.7)" }}>{compact(post.comments_count)}</span>
        </button>
        <button className="rv-btn" onClick={() => a.share(post)} aria-label="Share">
          <span className="rv-glass"><Share2 size={21} /></span>
        </button>
        <button className="rv-btn" onClick={() => a.save(post)} aria-label={post.user_saved ? "Remove from saved" : "Save"}>
          <span className="rv-glass"><Bookmark size={21} color={post.user_saved ? GOLD : "#fff"} fill={post.user_saved ? GOLD : "none"} /></span>
        </button>
      </div>

      {/* who and what */}
      <div style={{ position: "absolute", left: 16, right: 84, bottom: "calc(env(safe-area-inset-bottom, 0px) + 30px)", zIndex: 3, pointerEvents: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, pointerEvents: "auto" }}>
          <button className="rv-btn" onClick={() => a.profile(post.user_id)} aria-label={`Open ${post.profile?.name ?? "profile"}`} style={{ flexShrink: 0 }}>
            <span style={{ width: 44, height: 44, borderRadius: "50%", padding: 2.5, background: `conic-gradient(rgb(${sig}), rgba(${sig},0.25), rgb(${sig}))`, boxShadow: `0 0 14px rgba(${sig},0.45)`, display: "block" }}>
              <span style={{ display: "flex", width: "100%", height: "100%", borderRadius: "50%", background: "#111", overflow: "hidden", alignItems: "center", justifyContent: "center", color: GOLD, fontWeight: 800 }}>
                {photo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={photo} alt="" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (post.profile?.name ?? "?").charAt(0)}
              </span>
            </span>
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15.5, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 1px 8px rgba(0,0,0,.7)" }}>{post.profile?.name}</span>
              {!p.isOwner && !post.user_following && (
                <button onClick={() => a.follow(post)} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.4)", backdropFilter: "blur(8px)", borderRadius: 50, padding: "3px 11px 3px 8px", fontSize: 11.5, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                  <Plus size={12} strokeWidth={3} /> Follow
                </button>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, fontSize: 12, color: "rgba(255,255,255,.78)", textShadow: "0 1px 6px rgba(0,0,0,.7)" }}>
              {post.profile?.location && <MapPin size={11} />}
              {[post.profile?.location, timeAgo(post.created_at)].filter(Boolean).join(" · ")}
              {p.originName && <span style={{ color: `rgb(${sig})`, fontWeight: 700 }}> · ↻ from {p.originName}</span>}
            </div>
          </div>
        </div>

        {!isText && caption && (
          <div style={{ marginTop: 11, pointerEvents: "auto", maxHeight: open ? "34dvh" : undefined, overflowY: open ? "auto" : undefined }}>
            <p
              onClick={() => long && setOpen(o => !o)}
              style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: "rgba(255,255,255,.96)", textShadow: "0 1px 8px rgba(0,0,0,.8)", cursor: long ? "pointer" : "default", ...(open ? {} : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }) }}
            >
              <Caption text={caption} sig={sig} />
            </p>
            {long && !open && <button onClick={() => setOpen(true)} style={{ background: "none", border: 0, padding: "2px 0 0", color: "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>more</button>}
          </div>
        )}
      </div>

      {isVideo && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, zIndex: 3, background: "rgba(255,255,255,.18)", pointerEvents: "none" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: `rgb(${sig})`, boxShadow: `0 0 8px rgb(${sig})`, transition: "width .25s linear" }} />
        </div>
      )}
    </section>
  );
}
const ReelItem = memo(ReelItemBase);

export default function ReelViewer({
  posts, startId, myId, soundOn, originNames, hasMore, onNeedMore, onClosed, actions,
}: {
  posts: Post[];
  startId: string;
  myId: string;
  soundOn: boolean;
  originNames: Record<string, string>;
  hasMore: boolean;
  onNeedMore: () => void;
  /** Called with the post you ended on, so the stream can scroll to it. */
  onClosed?: (postId: string) => void;
  actions: ReelActions;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const startIndex = useMemo(() => Math.max(0, posts.findIndex(p => p.id === startId)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [active, setActive] = useState(startIndex);
  const pushed = useRef(false);
  const activeRef = useRef(startIndex);
  activeRef.current = active;
  const postsRef = useRef(posts);
  postsRef.current = posts;
  const closedRef = useRef(onClosed);
  closedRef.current = onClosed;
  useEffect(() => () => { const p = postsRef.current[activeRef.current]; if (p) closedRef.current?.(p.id); }, []);

  // Open on the post you tapped, with no visible scroll.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = startIndex * el.clientHeight;
  }, [startIndex]);

  // The phone's back button closes the reel instead of leaving the feed.
  useEffect(() => {
    if (!pushed.current) {
      try { window.history.pushState({ ...(window.history.state ?? {}), reel: true }, ""); pushed.current = true; } catch { /* history unavailable */ }
    }
    const onPop = () => { pushed.current = false; actions.close(); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const closeSelf = useMemo(() => () => { if (pushed.current) window.history.back(); else actions.close(); }, [actions]);

  useEffect(() => {
    const el = scrollerRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (!el) return;
      if (e.key === "Escape") closeSelf();
      if (e.key === "ArrowDown") { e.preventDefault(); el.scrollBy({ top: el.clientHeight, behavior: "smooth" }); }
      if (e.key === "ArrowUp") { e.preventDefault(); el.scrollBy({ top: -el.clientHeight, behavior: "smooth" }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSelf]);

  // Near the last few reels, bring in older posts.
  useEffect(() => {
    if (hasMore && active >= posts.length - 3) onNeedMore();
  }, [active, posts.length, hasMore]); // eslint-disable-line react-hooks/exhaustive-deps

  // Items get one stable actions object, so only the reel whose data changed redraws.
  const stable = useMemo<ReelActions>(() => ({ ...actions, close: closeSelf }), [actions, closeSelf]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Reels" style={{ position: "fixed", inset: 0, zIndex: 120, background: "#000", display: "flex", justifyContent: "center", animation: "rvIn .22s ease-out" }}>
      <style>{CSS}</style>
      <div ref={scrollerRef} className="rv-scroll" style={{ width: "100%", maxWidth: 430, height: "100dvh", overflowY: "auto", scrollSnapType: "y mandatory" }}>
        {posts.map((post, i) => (
          <ReelItem
            key={post.id}
            post={post}
            index={i}
            active={i === active}
            isOwner={post.user_id === myId}
            soundOn={soundOn}
            originName={post.origin_user ? originNames[post.origin_user] : undefined}
            scrollerRef={scrollerRef}
            onActive={setActive}
            actions={stable}
          />
        ))}
      </div>
    </div>
  );
}