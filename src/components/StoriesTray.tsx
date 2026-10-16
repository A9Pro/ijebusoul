"use client";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { avatarUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { buildStrips } from "@/components/SoulCloth";
import { loadStoryFeed, type StoryFeed } from "@/lib/stories";
import StoryViewer from "@/components/StoryViewer";
import StoryComposer from "@/components/StoryComposer";

const GOLD = "#D4AF37";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const EMPTY: StoryFeed = { groups: [], names: {}, matchByUser: {} };
const SIZE = 42;

// Remembered between visits, so the header never flashes empty when you come back to a page.
let remembered: StoryFeed | null = null;

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * Stories, shaped to live inside the header: one row of rings, no labels.
 * It loads when the browser is idle, so the page itself never waits for it.
 * The viewer and composer open on top of everything (through a portal), so nothing covers their buttons.
 */
export default function StoriesTray() {
  const { user, profile } = useAuth();
  const uid = user?.id;
  const [feed, setFeed] = useState<StoryFeed>(remembered ?? EMPTY);
  const [loaded, setLoaded] = useState(remembered !== null);
  const [open, setOpen] = useState<{ g: number; s: number } | null>(null);
  const [composing, setComposing] = useState(false);

  const reload = useCallback(async () => {
    if (!uid) return;
    try {
      const f = await loadStoryFeed(uid);
      remembered = f;
      setFeed(f);
    } catch { /* the row simply stays as it was */ }
    setLoaded(true);
  }, [uid]);

  // First load: wait for an idle moment so the feed underneath gets the network first.
  useEffect(() => {
    if (!uid) return;
    const w = window as IdleWindow;
    let idleId = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(() => { void reload(); }, { timeout: 1500 });
    else timer = setTimeout(() => { void reload(); }, 350);
    return () => {
      if (idleId && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      if (timer) clearTimeout(timer);
    };
  }, [uid, reload]);

  // Sharing to your story from anywhere in the app refreshes the row.
  useEffect(() => {
    const onChanged = () => { void reload(); };
    window.addEventListener("stories:changed", onChanged);
    return () => window.removeEventListener("stories:changed", onChanged);
  }, [reload]);

  if (!uid) return null;

  const mineGroup = feed.groups.find(g => g.mine);
  const others = feed.groups.filter(g => !g.mine);
  const myPhoto = avatarUrl(profile?.photos?.[0] ?? profile?.avatar_url);

  const openGroup = (userId: string) => {
    const g = feed.groups.findIndex(x => x.user.id === userId);
    if (g < 0) return;
    const firstUnseen = feed.groups[g].stories.findIndex(s => !s.viewed);
    setOpen({ g, s: firstUnseen < 0 ? 0 : firstUnseen });
  };

  const ring = (unseen: boolean) =>
    unseen ? `conic-gradient(from 200deg, #f6e08a, ${GOLD}, #b8412b, #f6e08a)` : "rgba(255,255,255,0.32)";

  const circle = (unseen: boolean, children: React.ReactNode) => (
    <span style={{ width: SIZE, height: SIZE, borderRadius: "50%", padding: 2.5, background: ring(unseen), display: "block", boxShadow: unseen ? "0 0 14px rgba(212,175,55,.45)" : "none" }}>
      <span style={{ display: "flex", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "2px solid #0a0a10", background: "#14141c", alignItems: "center", justifyContent: "center" }}>{children}</span>
    </span>
  );

  return (
    <>
      <style>{`
        .st-row{display:flex;align-items:center;gap:10px;overflow-x:auto;scrollbar-width:none;padding:2px 14px 2px 2px;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 22px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 22px),transparent)}
        .st-row::-webkit-scrollbar{display:none}
        .st-item{position:relative;display:block;background:none;border:0;padding:0;cursor:pointer;flex-shrink:0;transition:transform .15s;-webkit-tap-highlight-color:transparent}
        .st-item:active{transform:scale(.92)}
        .st-item:focus-visible{outline:2px solid ${GOLD};outline-offset:3px;border-radius:50%}
        @keyframes stPulse{0%,100%{opacity:.35}50%{opacity:.7}}
        @media (prefers-reduced-motion:reduce){.st-skel{animation:none!important}}
      `}</style>

      <div className="st-row" role="list" aria-label="Stories">
        {/* your own */}
        <div role="listitem" style={{ position: "relative", flexShrink: 0 }}>
          <button className="st-item" onClick={() => (mineGroup ? openGroup(uid) : setComposing(true))} aria-label={mineGroup ? "View your story" : "Add to your story"} title="Your story">
            {circle(!!mineGroup && mineGroup.hasUnseen, myPhoto ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={myPhoto} alt="" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null)}
          </button>
          <button onClick={() => setComposing(true)} aria-label="Add a story" style={{ position: "absolute", right: -3, bottom: -2, width: 20, height: 20, borderRadius: "50%", border: "2px solid #0a0a10", background: "linear-gradient(180deg,#f6e08a,#D4AF37)", color: "#1a1204", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
            <Plus size={12} strokeWidth={3.4} />
          </button>
        </div>

        {!loaded && [0, 1, 2].map(i => (
          <span key={i} className="st-skel" aria-hidden="true" style={{ width: SIZE, height: SIZE, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,.14)", animation: `stPulse 1.3s ease-in-out ${i * 0.15}s infinite` }} />
        ))}

        {others.map(g => {
          const photo = avatarUrl(g.user.photos?.[0] ?? g.user.avatar_url);
          return (
            <div role="listitem" key={g.user.id} style={{ position: "relative", flexShrink: 0 }}>
              <button className="st-item" onClick={() => openGroup(g.user.id)} aria-label={`View ${g.user.name}'s story`} title={g.user.name}>
                {circle(g.hasUnseen, photo
                  ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={photo} alt="" decoding="async" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontWeight: 900, color: GOLD }}>{g.user.name.charAt(0)}</span>)}
              </button>
              {/* Thread Bloom: you matched, and you both posted within the hour */}
              {g.bloom && (
                <span title="You are both here right now" aria-label="You both posted within the hour" style={{ position: "absolute", right: -3, top: -3, width: 16, height: 16, borderRadius: 6, transform: "rotate(10deg)", border: "1.5px solid #0a0a10", boxShadow: "0 0 8px rgba(212,175,55,.7)", backgroundImage: buildStrips(`${uid}|${g.user.id}`, 1)[0], backgroundSize: "200% 200%", pointerEvents: "none" }} />
              )}
            </div>
          );
        })}

        {loaded && others.length === 0 && !mineGroup && (
          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: "rgba(255,255,255,.7)", whiteSpace: "nowrap", paddingLeft: 4 }}>Share today</span>
        )}
      </div>

      {open && typeof document !== "undefined" && createPortal(
        <StoryViewer
          groups={feed.groups} startGroup={open.g} startStory={open.s} myId={uid}
          names={feed.names} matchByUser={feed.matchByUser}
          onClose={() => { setOpen(null); void reload(); }}
        />,
        document.body,
      )}
      {composing && typeof document !== "undefined" && createPortal(
        <StoryComposer userId={uid} onClose={() => setComposing(false)} onCreated={() => void reload()} />,
        document.body,
      )}
    </>
  );
}