"use client";
import { CirclePlus, Link2, X } from "lucide-react";
import { postMediaUrl } from "@/lib/supabase";
import type { Post } from "@/lib/types";

const GOLD = "#D4AF37";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";

const CSS = `
@keyframes shUp{from{transform:translateY(100%)}to{transform:none}}
@keyframes shFade{from{opacity:0}to{opacity:1}}
.sh-row{display:flex;align-items:center;gap:14px;width:100%;text-align:left;cursor:pointer;color:#fff;border-radius:18px;padding:14px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);transition:transform .15s,background .15s}
.sh-row:hover{background:rgba(255,255,255,.08)}
.sh-row:active{transform:scale(.985)}
.sh-row:disabled{opacity:.55;cursor:default}
@media (prefers-reduced-motion:reduce){.sh-sheet,.sh-back{animation:none!important}}
`;

/** Bottom sheet for sharing a feed post: to your own story, or as a link. */
export default function ShareSheet({
  post, busy, onStory, onLink, onClose,
}: {
  post: Post;
  busy: boolean;
  onStory: () => void;
  onLink: () => void;
  onClose: () => void;
}) {
  const media = post.type === "photo" ? postMediaUrl(post.media_url) : null;
  const caption = (post.caption ?? "").trim();
  const name = post.profile?.name ?? "this soul";

  return (
    <div onClick={onClose} className="sh-back" style={{ position: "fixed", inset: 0, zIndex: 170, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "shFade .2s ease-out" }}>
      <style>{CSS}</style>
      <div
        role="dialog"
        aria-label="Share this post"
        onClick={e => e.stopPropagation()}
        className="sh-sheet"
        style={{ width: "100%", maxWidth: 430, borderRadius: "28px 28px 0 0", background: "linear-gradient(180deg,#15130d,#0b0a0e)", borderTop: "1px solid rgba(212,175,55,.45)", padding: "20px 18px calc(24px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", gap: 12, fontFamily: "system-ui", animation: "shUp .3s cubic-bezier(.2,.8,.2,1)" }}
      >
        <div style={{ width: 38, height: 4, borderRadius: 4, background: "rgba(255,255,255,.2)", alignSelf: "center", marginBottom: 2 }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 28, lineHeight: 1.05, color: "#fff" }}>Share this post</div>
          <button onClick={onClose} aria-label="Close" style={{ width: 34, height: 34, borderRadius: "50%", border: 0, background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
        </div>

        {/* a small preview of what is being shared */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 16, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: post.type === "text" ? (post.bg_color || "#1a1a2e") : "#14141c", color: GOLD, fontFamily: SERIF, fontStyle: "italic", fontSize: 26 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {media ? <img src={media} alt="" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : post.type === "video" ? "▶" : "“"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "#fff" }}>{name}</div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.62)", marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{caption || (post.type === "video" ? "A video" : "A photo")}</div>
          </div>
        </div>

        <button className="sh-row" onClick={onStory} disabled={busy} style={{ borderColor: "rgba(212,175,55,.4)" }}>
          <CirclePlus size={22} color={GOLD} />
          <span>
            <span style={{ display: "block", fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 21, lineHeight: 1.1 }}>{busy ? "Adding to your story…" : "Add to my story"}</span>
            <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 2 }}>Stays for 24 hours, with {name.split(" ")[0]} credited</span>
          </span>
        </button>
        <button className="sh-row" onClick={onLink} disabled={busy}>
          <Link2 size={22} color={GOLD} />
          <span>
            <span style={{ display: "block", fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 21, lineHeight: 1.1 }}>Send as a link</span>
            <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 2 }}>Share anywhere, or copy it</span>
          </span>
        </button>
      </div>
    </div>
  );
}