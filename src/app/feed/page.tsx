"use client";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";

const POSTS = [
  { id: 1, user: { name: "Adunola", emoji: "👩🏾", bg: "#FFDEE9", location: "Ijebu Ode",  following: false }, type: "photo", bg: "#FFDEE9", emoji: "🌺", caption: "Ijebu sunset hits different. Can't believe I almost moved to Lagos 😌✨",                                                                          likes: 142, comments: 18, shares: 7,   time: "2m ago",  liked: false, saved: false },
  { id: 2, user: { name: "Segun",   emoji: "👨🏿", bg: "#D0E8FF", location: "Sagamu",      following: true  }, type: "text",  bg: "#1a1a2e", emoji: "",    caption: "The way Ijebu people will drive 2 hours to attend an owanbe but won't walk 5 minutes to visit their neighbour 😂😂 We are a special breed fr", likes: 389, comments: 54, shares: 112, time: "15m ago", liked: true,  saved: false },
  { id: 3, user: { name: "Temi",    emoji: "👩🏿", bg: "#D1FAE5", location: "Ijebu Igbo",  following: false }, type: "photo", bg: "#D1FAE5", emoji: "🍲", caption: "Made egusi soup from scratch today. Grandma said it's almost as good as hers 👵🏾🙌🏾 #IjebuFood",                                                likes: 67,  comments: 9,  shares: 3,   time: "1h ago",  liked: false, saved: true  },
  { id: 4, user: { name: "Kemi",    emoji: "👩🏾", bg: "#EDE9FF", location: "Odogbolu",    following: false }, type: "video", bg: "#2d1b4e", emoji: "🎶", caption: "Just vibing in Ijebu 🎵 The culture never gets old. Drop a 🔥 if you know this song!",                                                             likes: 521, comments: 73, shares: 44,  time: "3h ago",  liked: false, saved: false },
  { id: 5, user: { name: "Dare",    emoji: "👨🏾", bg: "#FFE4CC", location: "Ago-Iwoye",   following: true  }, type: "text",  bg: "#1a0a00", emoji: "",    caption: "Reminder that Ijebu-Ode is one of the oldest cities in West Africa and we don't talk about it enough. Our history is DEEP 🏛️ Thread incoming...", likes: 204, comments: 31, shares: 89,  time: "5h ago",  liked: false, saved: false },
];

export default function FeedPage() {
  const [posts, setPosts]               = useState(POSTS);
  const [commenting, setCommenting]     = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  const toggleLike   = (id: number) => setPosts((prev) => prev.map((p) => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
  const toggleSave   = (id: number) => setPosts((prev) => prev.map((p) => p.id === id ? { ...p, saved: !p.saved } : p));
  const toggleFollow = (id: number) => setPosts((prev) => prev.map((p) => p.id === id ? { ...p, user: { ...p.user, following: !p.user.following } } : p));

  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 20px 16px", background: "#0a0a0a", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>ìjèbú <span style={{ color: "#D4AF37" }}>feed</span></h1>
        <button style={{ background: "#D4AF37", border: "none", borderRadius: 50, padding: "8px 18px", fontSize: 13, fontWeight: 700, color: "#000", cursor: "pointer" }}>+ Post</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
        {posts.map((post) => (
          <div key={post.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 4, marginBottom: 4 }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: post.user.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{post.user.emoji}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{post.user.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>📍 {post.user.location} · {post.time}</div>
                </div>
              </div>
              <button onClick={() => toggleFollow(post.id)} style={{ background: post.user.following ? "rgba(255,255,255,0.08)" : "#D4AF37", border: post.user.following ? "1px solid rgba(255,255,255,0.15)" : "none", borderRadius: 50, padding: "6px 16px", fontSize: 12, fontWeight: 700, color: post.user.following ? "rgba(255,255,255,0.6)" : "#000", cursor: "pointer" }}>{post.user.following ? "Following" : "Follow"}</button>
            </div>

            {post.type === "text" ? (
              <div style={{ margin: "0 16px 12px", background: post.bg, borderRadius: 18, padding: "24px 20px", minHeight: 120, display: "flex", alignItems: "center" }}>
                <p style={{ fontSize: 16, color: "#fff", lineHeight: 1.6, fontWeight: 500, fontStyle: "italic" }}>"{post.caption}"</p>
              </div>
            ) : post.type === "video" ? (
              <div style={{ margin: "0 16px 12px", borderRadius: 18, background: post.bg, height: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ fontSize: 72 }}>{post.emoji}</div>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff" }}>▶</div>
                </div>
                <div style={{ position: "absolute", bottom: 12, left: 14, background: "rgba(0,0,0,0.5)", borderRadius: 50, padding: "3px 10px", fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>📹 Video</div>
              </div>
            ) : (
              <div style={{ margin: "0 16px 12px", borderRadius: 18, background: post.bg, height: 260, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 96 }}>{post.emoji}</div>
            )}

            {post.type !== "text" && (
              <p style={{ padding: "0 16px 10px", fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.55 }}>
                <span style={{ fontWeight: 700, color: "#fff" }}>{post.user.name} </span>{post.caption}
              </p>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 16px 14px" }}>
              <div style={{ display: "flex", gap: 20 }}>
                <button onClick={() => toggleLike(post.id)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <span style={{ fontSize: 20 }}>{post.liked ? "❤️" : "🤍"}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: post.liked ? "#FF3366" : "rgba(255,255,255,0.4)" }}>{post.likes.toLocaleString()}</span>
                </button>
                <button onClick={() => setCommenting(commenting === post.id ? null : post.id)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <span style={{ fontSize: 20 }}>💬</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>{post.comments}</span>
                </button>
                <button style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <span style={{ fontSize: 20 }}>↗️</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>{post.shares}</span>
                </button>
              </div>
              <button onClick={() => toggleSave(post.id)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>{post.saved ? "🔖" : "📌"}</button>
            </div>

            {commenting === post.id && (
              <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "0 16px 16px" }}>
                <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="Add a comment..." style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 50, padding: "11px 16px", fontSize: 13, color: "#fff", outline: "none", fontFamily: "system-ui, sans-serif" }} />
                <button onClick={() => { setCommentDraft(""); setCommenting(null); }} style={{ width: 40, height: 40, borderRadius: "50%", background: "#D4AF37", border: "none", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 700 }}>↑</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}