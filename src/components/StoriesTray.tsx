"use client";
import { useCallback, useEffect, useState } from "react";
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

/** Drop this anywhere (the Feed header is the natural home). It loads and refreshes itself. */
export default function StoriesTray() {
  const { user, profile } = useAuth();
  const uid = user?.id;
  const [feed, setFeed] = useState<StoryFeed>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<{ g: number; s: number } | null>(null);
  const [composing, setComposing] = useState(false);

  const reload = useCallback(async () => {
    if (!uid) return;
    try { setFeed(await loadStoryFeed(uid)); } catch { /* tray simply stays as it was */ }
    setLoaded(true);
  }, [uid]);

  useEffect(() => { void reload(); }, [reload]);

  // Sharing to your story from anywhere in the app (the feed, a reel) refreshes the tray.
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
    unseen ? `conic-gradient(from 200deg, #f6e08a, ${GOLD}, #b8412b, #f6e08a)` : "rgba(255,255,255,0.22)";

  return (
    <>
      <style>{`.st-scroll{scrollbar-width:none}.st-scroll::-webkit-scrollbar{display:none}.st-item{background:none;border:0;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;color:#fff;transition:transform .15s}.st-item:active{transform:scale(.94)}`}</style>
      <div className="st-scroll" role="list" aria-label="Stories" style={{ display: "flex", gap: 14, overflowX: "auto", padding: "10px 2px 4px" }}>

        {/* your own */}
        <div role="listitem" style={{ position: "relative", flexShrink: 0 }}>
          <button className="st-item" onClick={() => (mineGroup ? openGroup(uid) : setComposing(true))} aria-label={mineGroup ? "View your story" : "Add to your story"}>
            <span style={{ width: 66, height: 66, borderRadius: "50%", padding: 2.5, background: mineGroup ? ring(mineGroup.hasUnseen) : "rgba(255,255,255,0.22)", display: "block" }}>
              <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "2.5px solid #07070c", background: "#111" }}>
                {myPhoto && <img src={myPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </span>
            </span>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 14, color: "rgba(255,255,255,.85)" }}>Your story</span>
          </button>
          <button onClick={() => setComposing(true)} aria-label="Add a story" style={{ position: "absolute", right: -2, top: 44, width: 24, height: 24, borderRadius: "50%", border: "2px solid #07070c", background: "linear-gradient(180deg,#f6e08a,#D4AF37)", color: "#1a1204", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
            <Plus size={14} strokeWidth={3} />
          </button>
        </div>

        {others.map(g => {
          const photo = avatarUrl(g.user.photos?.[0] ?? g.user.avatar_url);
          return (
            <div role="listitem" key={g.user.id} style={{ position: "relative", flexShrink: 0 }}>
              <button className="st-item" onClick={() => openGroup(g.user.id)} aria-label={`View ${g.user.name}'s story`}>
                <span style={{ width: 66, height: 66, borderRadius: "50%", padding: 2.5, background: ring(g.hasUnseen), display: "block", boxShadow: g.hasUnseen ? "0 0 18px rgba(212,175,55,.35)" : "none" }}>
                  <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "2.5px solid #07070c", background: "#111" }}>
                    {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontWeight: 900, color: GOLD }}>{g.user.name.charAt(0)}</span>}
                  </span>
                </span>
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: g.hasUnseen ? 700 : 500, fontSize: 14, maxWidth: 70, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: g.hasUnseen ? "#fff" : "rgba(255,255,255,.55)" }}>{g.user.name.split(" ")[0]}</span>
              </button>
              {/* Thread Bloom: you matched, and you are both here right now */}
              {g.bloom && (
                <span title="You are both here right now" aria-label="You both posted within the hour" style={{ position: "absolute", right: -2, top: 44, width: 22, height: 22, borderRadius: 8, transform: "rotate(10deg)", border: "1.5px solid #07070c", boxShadow: "0 0 10px rgba(212,175,55,.6)", backgroundImage: buildStrips(`${uid}|${g.user.id}`, 1)[0], backgroundSize: "200% 200%" }} />
              )}
            </div>
          );
        })}

        {loaded && others.length === 0 && !mineGroup && (
          <div style={{ alignSelf: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: "rgba(255,255,255,.45)", paddingLeft: 4 }}>Be the first to share today</div>
        )}
      </div>

      {open && (
        <StoryViewer
          groups={feed.groups} startGroup={open.g} startStory={open.s} myId={uid}
          names={feed.names} matchByUser={feed.matchByUser}
          onClose={() => { setOpen(null); void reload(); }}
        />
      )}
      {composing && <StoryComposer userId={uid} onClose={() => setComposing(false)} onCreated={() => void reload()} />}
    </>
  );
}