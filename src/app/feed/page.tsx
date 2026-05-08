"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl, postMediaUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import type { Post } from "@/lib/types";

// ── Post creation modal ───────────────────────────────────────────────────────
interface CreatePostModalProps {
  userId: string;
  userProfile: { name: string; avatar_url?: string | null; photos?: string[] };
  onClose: () => void;
  onCreated: (post: Post) => void;
}

const CreatePostModal = ({ userId, userProfile, onClose, onCreated }: CreatePostModalProps) => {
  const fileRef                   = useRef<HTMLInputElement>(null);
  const [caption, setCaption]     = useState("");
  const [postType, setPostType]   = useState<"text" | "photo">("text");
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setPostType("photo");
  };

  const handleSubmit = async () => {
    if (!caption.trim() && !file) { setError("Add a caption or photo."); return; }
    setSaving(true);
    setError("");

    try {
      let mediaPath: string | null = null;

      if (file) {
        const ext  = file.name.split(".").pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("posts").upload(path, file, { upsert: true });
        if (uploadErr) throw uploadErr;
        mediaPath = path;
      }

      const { data, error: insertErr } = await supabase
        .from("posts")
        .insert({
          user_id:     userId,
          type:        file ? "photo" : "text",
          caption:     caption.trim(),
          media_url:   mediaPath,
          likes_count: 0,
        })
        .select("*, profile:profiles(*)")
        .single();

      if (insertErr) throw insertErr;

      onCreated({ ...(data as Post), user_liked: false, user_following: false });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, background: "#111", borderRadius: "24px 24px 0 0", padding: "24px 20px 48px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>New post</h2>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 50, width: 34, height: 34, fontSize: 16, color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>✕</button>
        </div>

        {/* Type toggle */}
        <div style={{ display: "flex", gap: 8 }}>
          {(["text", "photo"] as const).map(t => (
            <button key={t} onClick={() => setPostType(t)} style={{ flex: 1, background: postType === t ? "#D4AF37" : "rgba(255,255,255,0.07)", border: "none", borderRadius: 12, padding: "10px 0", fontSize: 13, fontWeight: 700, color: postType === t ? "#000" : "rgba(255,255,255,0.5)", cursor: "pointer" }}>
              {t === "text" ? "✍️ Text" : "📷 Photo"}
            </button>
          ))}
        </div>

        {/* Photo picker */}
        {postType === "photo" && (
          <div onClick={() => fileRef.current?.click()} style={{ borderRadius: 16, background: preview ? "transparent" : "rgba(255,255,255,0.05)", border: `2px dashed ${preview ? "transparent" : "rgba(255,255,255,0.15)"}`, height: 180, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>
            {preview
              ? <img src={preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
              : <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)" }}><div style={{ fontSize: 36, marginBottom: 8 }}>📷</div><div style={{ fontSize: 13 }}>Tap to choose photo</div></div>
            }
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: "none" }} />

        {/* Caption */}
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder={postType === "text" ? "What's on your mind? 🌍" : "Add a caption..."}
          maxLength={300}
          rows={postType === "text" ? 5 : 3}
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 16px", fontSize: 15, color: "#fff", outline: "none", resize: "none", lineHeight: 1.6, fontFamily: "system-ui" }}
        />
        <div style={{ textAlign: "right", fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: -10 }}>{caption.length}/300</div>

        {error && <div style={{ background: "rgba(255,51,102,0.15)", border: "1px solid rgba(255,51,102,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#FF3366" }}>{error}</div>}

        <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", background: saving ? "rgba(212,175,55,0.4)" : "#D4AF37", border: "none", borderRadius: 14, padding: "16px 0", fontSize: 15, fontWeight: 800, color: saving ? "rgba(0,0,0,0.4)" : "#000", cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Posting..." : "Share post 🚀"}
        </button>
      </div>
    </div>
  );
};

// ── Feed page ─────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const router = useRouter();
  const { user, profile: myProfile, loading: authLoading } = useAuth();

  const [posts, setPosts]               = useState<Post[]>([]);
  const [fetching, setFetching]         = useState(true);
  const [showCreate, setShowCreate]     = useState(false);
  const [commenting, setCommenting]     = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetching(true);
      const { data: rawPosts } = await supabase
        .from("posts")
        .select("*, profile:profiles(*)")
        .order("created_at", { ascending: false })
        .limit(30);

      if (!rawPosts?.length) { setPosts([]); setFetching(false); return; }

      const postIds = rawPosts.map(p => p.id);
      const { data: myLikes } = await supabase
        .from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      const likedSet = new Set(myLikes?.map(l => l.post_id) ?? []);

      const { data: myFollows } = await supabase
        .from("follows").select("following_id").eq("follower_id", user.id);
      const followedSet = new Set(myFollows?.map(f => f.following_id) ?? []);

      setPosts(rawPosts.map(p => ({
        ...p,
        user_liked:     likedSet.has(p.id),
        user_following: followedSet.has(p.user_id),
      } as Post)));

      setFetching(false);
    })();
  }, [user]);

  const toggleLike = async (post: Post) => {
    if (!user) return;
    if (post.user_liked) {
      await supabase.from("post_likes").delete().eq("user_id", user.id).eq("post_id", post.id);
      setPosts(ps => ps.map(p => p.id === post.id ? { ...p, user_liked: false, likes_count: p.likes_count - 1 } : p));
    } else {
      await supabase.from("post_likes").insert({ user_id: user.id, post_id: post.id });
      setPosts(ps => ps.map(p => p.id === post.id ? { ...p, user_liked: true, likes_count: p.likes_count + 1 } : p));
    }
  };

  const toggleFollow = async (post: Post) => {
    if (!user) return;
    if (post.user_following) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", post.user_id);
      setPosts(ps => ps.map(p => p.user_id === post.user_id ? { ...p, user_following: false } : p));
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: post.user_id });
      setPosts(ps => ps.map(p => p.user_id === post.user_id ? { ...p, user_following: true } : p));
    }
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)    return "Just now";
    if (mins < 60)   return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  if (authLoading || fetching) return (
    <div style={{ minHeight: "100dvh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontFamily: "system-ui" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>▶️</div>
        <div style={{ fontSize: 14 }}>Loading feed...</div>
      </div>
    </div>
  );

  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui", display: "flex", flexDirection: "column" }}>

      {/* ── Post creation modal ── */}
      {showCreate && user && myProfile && (
        <CreatePostModal
          userId={user.id}
          userProfile={myProfile}
          onClose={() => setShowCreate(false)}
          onCreated={post => setPosts(ps => [post, ...ps])}
        />
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 20px 16px", background: "#0a0a0a", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>ìjèbú <span style={{ color: "#D4AF37" }}>feed</span></h1>
        <button onClick={() => setShowCreate(true)} style={{ background: "#D4AF37", border: "none", borderRadius: 50, padding: "8px 18px", fontSize: 13, fontWeight: 700, color: "#000", cursor: "pointer" }}>+ Post</button>
      </div>

      {/* ── Posts ── */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 14, paddingTop: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            No posts yet. Be the first to share!
            <br />
            <button onClick={() => setShowCreate(true)} style={{ marginTop: 20, background: "#D4AF37", border: "none", borderRadius: 50, padding: "12px 28px", fontSize: 14, fontWeight: 700, color: "#000", cursor: "pointer" }}>Create first post</button>
          </div>
        ) : posts.map(post => {
          const photo = avatarUrl(post.profile?.photos?.[0] ?? post.profile?.avatar_url);
          const media = postMediaUrl(post.media_url);

          return (
            <div key={post.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 4, marginBottom: 4 }}>

              {/* Author row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1a1a1a", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ fontSize: 22 }}>🙂</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{post.profile?.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>📍 {post.profile?.location} · {timeAgo(post.created_at)}</div>
                  </div>
                </div>
                {post.user_id !== user?.id && (
                  <button onClick={() => toggleFollow(post)} style={{ background: post.user_following ? "rgba(255,255,255,0.08)" : "#D4AF37", border: post.user_following ? "1px solid rgba(255,255,255,0.15)" : "none", borderRadius: 50, padding: "6px 16px", fontSize: 12, fontWeight: 700, color: post.user_following ? "rgba(255,255,255,0.6)" : "#000", cursor: "pointer" }}>
                    {post.user_following ? "Following" : "Follow"}
                  </button>
                )}
              </div>

              {/* Content */}
              {post.type === "text" ? (
                <div style={{ margin: "0 16px 12px", background: "#1a1a2e", borderRadius: 18, padding: "24px 20px", minHeight: 120, display: "flex", alignItems: "center" }}>
                  <p style={{ fontSize: 16, color: "#fff", lineHeight: 1.6, fontWeight: 500, fontStyle: "italic" }}>"{post.caption}"</p>
                </div>
              ) : media ? (
                <div style={{ margin: "0 16px 12px", borderRadius: 18, overflow: "hidden", height: 280, background: "#111" }}>
                  {post.type === "video"
                    ? <video src={media} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls />
                    : <img src={media} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                  }
                </div>
              ) : (
                <div style={{ margin: "0 16px 12px", borderRadius: 18, background: "#1a1a1a", height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 64 }}>📷</span>
                </div>
              )}

              {post.type !== "text" && post.caption && (
                <p style={{ padding: "0 16px 10px", fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.55 }}>
                  <span style={{ fontWeight: 700, color: "#fff" }}>{post.profile?.name} </span>{post.caption}
                </p>
              )}

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 16px 14px" }}>
                <div style={{ display: "flex", gap: 20 }}>
                  <button onClick={() => toggleLike(post)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <span style={{ fontSize: 20 }}>{post.user_liked ? "❤️" : "🤍"}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: post.user_liked ? "#FF3366" : "rgba(255,255,255,0.4)" }}>{post.likes_count.toLocaleString()}</span>
                  </button>
                  <button onClick={() => setCommenting(commenting === post.id ? null : post.id)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <span style={{ fontSize: 20 }}>💬</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>0</span>
                  </button>
                  <button style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <span style={{ fontSize: 20 }}>↗️</span>
                  </button>
                </div>
                <button style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>📌</button>
              </div>

              {/* Comment input */}
              {commenting === post.id && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "0 16px 16px" }}>
                  <input
                    value={commentDraft}
                    onChange={e => setCommentDraft(e.target.value)}
                    placeholder="Add a comment..."
                    style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 50, padding: "11px 16px", fontSize: 13, color: "#fff", outline: "none", fontFamily: "system-ui" }}
                  />
                  <button onClick={() => { setCommentDraft(""); setCommenting(null); }} style={{ width: 40, height: 40, borderRadius: "50%", background: "#D4AF37", border: "none", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 700 }}>↑</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BottomNav />
    </main>
  );
}