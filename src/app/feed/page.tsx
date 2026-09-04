"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl, postMediaUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme, type Theme } from "@/context/ThemeContext";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import type { Post } from "@/lib/types";

interface CommentItem {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { name: string; avatar_url?: string | null; photos?: string[] } | null;
}

const BG_COLORS = ["#1a1a2e", "#2e1a1a", "#1a2e1e", "#2e2a1a", "#241a2e", "#1a2830", "#000000", "#3a2a1a"];

interface CreatePostModalProps {
  userId: string;
  editingPost?: Post | null;
  onClose: () => void;
  onCreated: (post: Post) => void;
  onUpdated: (post: Post) => void;
  colors: ReturnType<typeof useTheme>["colors"];
}

const CreatePostModal = ({ userId, editingPost, onClose, onCreated, onUpdated, colors }: CreatePostModalProps) => {
  const fileRef                   = useRef<HTMLInputElement>(null);
  const isEditing                 = !!editingPost;
  const [caption, setCaption]     = useState(editingPost?.caption ?? "");
  const [postType, setPostType]   = useState<"text" | "photo">(editingPost?.type === "photo" ? "photo" : "text");
  const [bgColor, setBgColor]     = useState(editingPost?.bg_color ?? BG_COLORS[0]);
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(
    editingPost?.type === "photo" ? postMediaUrl(editingPost.media_url) : null
  );
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setPostType("photo");
    setRemoveExistingPhoto(false);
  };

  const handleRemovePhoto = () => {
    setFile(null);
    setPreview(null);
    setRemoveExistingPhoto(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!caption.trim() && !file && !(editingPost?.media_url && !removeExistingPhoto)) {
      setError("Add a caption or photo.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      if (isEditing && editingPost) {
        let mediaPath: string | null = editingPost.media_url ?? null;
        const oldPath = editingPost.media_url;

        if (file) {
          const ext  = file.name.split(".").pop();
          const path = `${userId}/${Date.now()}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from("posts").upload(path, file, { upsert: true });
          if (uploadErr) throw uploadErr;
          mediaPath = path;
        } else if (removeExistingPhoto) {
          mediaPath = null;
        }

        const { data, error: updateErr } = await supabase
          .from("posts")
          .update({
            type:      postType === "photo" && mediaPath ? "photo" : "text",
            caption:   caption.trim(),
            media_url: postType === "photo" ? mediaPath : null,
            bg_color:  bgColor,
          })
          .eq("id", editingPost.id)
          .select("*, profile:profiles!posts_user_id_fkey(*)")
          .single();

        if (updateErr) throw updateErr;

        if (oldPath && (file || removeExistingPhoto)) {
          await supabase.storage.from("posts").remove([oldPath]).catch(() => {});
        }

        onUpdated({ ...(data as Post), user_liked: editingPost.user_liked, user_following: editingPost.user_following, user_saved: editingPost.user_saved });
        onClose();
        return;
      }

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
          user_id:        userId,
          type:            file ? "photo" : "text",
          caption:         caption.trim(),
          media_url:       mediaPath,
          bg_color:        bgColor,
          likes_count:     0,
          comments_count:  0,
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

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, background: colors.card, borderRadius: "24px 24px 0 0", padding: "24px 20px 48px", display: "flex", flexDirection: "column", gap: 16 }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: colors.text }}>{isEditing ? "Edit post" : "New post"}</h2>
          <button onClick={onClose} style={{ background: colors.bg, border: "none", borderRadius: 50, width: 34, height: 34, fontSize: 16, color: colors.subtext, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {(["text", "photo"] as const).map(t => (
            <button key={t} onClick={() => setPostType(t)} style={{ flex: 1, background: postType === t ? "#D4AF37" : colors.bg, border: "none", borderRadius: 12, padding: "10px 0", fontSize: 13, fontWeight: 700, color: postType === t ? "#000" : colors.subtext, cursor: "pointer" }}>
              {t === "text" ? "✍️ Text" : "📷 Photo"}
            </button>
          ))}
        </div>

        {postType === "text" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: bgColor, borderRadius: 16, padding: "20px 18px", minHeight: 90, display: "flex", alignItems: "center", transition: "background 0.15s" }}>
              <p style={{ fontSize: 15, color: "#fff", lineHeight: 1.5, fontWeight: 500, fontStyle: "italic" }}>
                {caption.trim() ? `"${caption}"` : "Preview your text post..."}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {BG_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setBgColor(c)}
                  aria-label={`Background ${c}`}
                  style={{
                    width: 30, height: 30, borderRadius: "50%", background: c, cursor: "pointer",
                    border: bgColor === c ? "2px solid #D4AF37" : `2px solid ${colors.border}`,
                    boxShadow: bgColor === c ? "0 0 0 2px rgba(212,175,55,0.3)" : "none",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {postType === "photo" && (
          <div style={{ position: "relative" }}>
            <div onClick={() => fileRef.current?.click()} style={{ borderRadius: 16, background: preview ? "transparent" : colors.bg, border: `2px dashed ${preview ? "transparent" : colors.border}`, height: 180, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>
              {preview
                ? <img src={preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                : <div style={{ textAlign: "center", color: colors.subtext }}><div style={{ fontSize: 36, marginBottom: 8 }}>📷</div><div style={{ fontSize: 13 }}>Tap to choose photo</div></div>
              }
            </div>
            {preview && (
              <button
                onClick={(e) => { e.stopPropagation(); handleRemovePhoto(); }}
                style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.65)", border: "none", borderRadius: 50, width: 30, height: 30, fontSize: 14, color: "#fff", cursor: "pointer" }}
              >✕</button>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: "none" }} />

        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder={postType === "text" ? "What's on your mind? 🌍" : "Add a caption..."}
          maxLength={300}
          rows={postType === "text" ? 5 : 3}
          style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 14, padding: "14px 16px", fontSize: 15, color: colors.text, outline: "none", resize: "none", lineHeight: 1.6, fontFamily: "system-ui" }}
        />
        <div style={{ textAlign: "right", fontSize: 11, color: colors.subtext, marginTop: -10 }}>{caption.length}/300</div>

        {error && <div style={{ background: "rgba(255,51,102,0.15)", border: "1px solid rgba(255,51,102,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#FF3366" }}>{error}</div>}

        <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", background: saving ? "rgba(212,175,55,0.4)" : "#D4AF37", border: "none", borderRadius: 14, padding: "16px 0", fontSize: 15, fontWeight: 800, color: saving ? "rgba(0,0,0,0.4)" : "#000", cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? (isEditing ? "Saving..." : "Posting...") : (isEditing ? "Save changes ✓" : "Share post 🚀")}
        </button>
      </div>
    </div>
  );
};

export default function FeedPage() {
  const router = useRouter();
  const { user, profile: myProfile, loading: authLoading } = useAuth();
  const { colors } = useTheme();

  const [posts, setPosts]                   = useState<Post[]>([]);
  const [fetching, setFetching]             = useState(true);
  const [showCreate, setShowCreate]         = useState(false);
  const [editingPost, setEditingPost]       = useState<Post | null>(null);
  const [menuOpenFor, setMenuOpenFor]       = useState<string | null>(null);
  const menuRef                             = useRef<HTMLDivElement>(null);

  const [commenting, setCommenting]         = useState<string | null>(null);
  const [commentDraft, setCommentDraft]     = useState("");
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentItem[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<string | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const [toast, setToast]                   = useState<{ label: string; color: string } | null>(null);

  const showToast = (label: string, color: string) => {
    setToast({ label, color });
    setTimeout(() => setToast(null), 1600);
  };

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user]);

  useEffect(() => {
    if (!menuOpenFor) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenFor(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpenFor]);

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

      const { data: myLikes } = await supabase
        .from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      const likedSet = new Set(myLikes?.map(l => l.post_id) ?? []);

      const { data: myFollows } = await supabase
        .from("follows").select("following_id").eq("follower_id", user.id);
      const followedSet = new Set(myFollows?.map(f => f.following_id) ?? []);

      const { data: mySaves } = await supabase
        .from("saved_posts").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      const savedSet = new Set(mySaves?.map(s => s.post_id) ?? []);

      setPosts(rawPosts.map(p => ({
        ...p,
        user_liked:     likedSet.has(p.id),
        user_following: followedSet.has(p.user_id),
        user_saved:     savedSet.has(p.id),
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
    if (commenting === postId) { setCommenting(null); return; }
    setCommenting(postId);
    setCommentDraft("");
    if (commentsByPost[postId]) return;

    setCommentsLoading(postId);
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
    setPosts(ps => ps.map(p => p.id === post.id ? { ...p, comments_count: p.comments_count + 1 } : p));
    setCommentDraft("");
  };

  const sharePost = async (post: Post) => {
    const url = `${window.location.origin}/feed?post=${post.id}`;
    const text = post.caption || "Check this out on ìjèbúsoul";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "ìjèbúsoul", text, url });
      } catch {
        /* user cancelled share sheet — no-op */
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      showToast("Link copied! 🔗", "#D4AF37");
    }
  };

  const startEdit = (post: Post) => {
    setMenuOpenFor(null);
    setEditingPost(post);
  };

  const deletePost = async (post: Post) => {
    setMenuOpenFor(null);
    if (!window.confirm("Delete this post? This can't be undone.")) return;

    if (post.media_url) {
      await supabase.storage.from("posts").remove([post.media_url]).catch(() => {});
    }

    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) { showToast("Couldn't delete post", "#FF3366"); return; }
    setPosts(ps => ps.filter(p => p.id !== post.id));
    showToast("Post deleted", "#888");
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
    <div style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: colors.subtext }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>▶️</div>
          <div style={{ fontSize: 14 }}>Loading feed...</div>
        </div>
      </div>
      <BottomNav />
    </div>
  );

  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column", position: "relative" }}>

      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: toast.color, color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 20px", borderRadius: 50, zIndex: 200, whiteSpace: "nowrap" }}>
          {toast.label}
        </div>
      )}

      {(showCreate || editingPost) && user && myProfile && (
        <CreatePostModal
          userId={user.id}
          editingPost={editingPost}
          onClose={() => { setShowCreate(false); setEditingPost(null); }}
          onCreated={post => setPosts(ps => [post, ...ps])}
          onUpdated={updated => setPosts(ps => ps.map(p => p.id === updated.id ? { ...p, ...updated } : p))}
          colors={colors}
        />
      )}

      <Header />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: colors.bg, borderBottom: `1px solid ${colors.border}`, position: "sticky", top: 0, zIndex: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: colors.text, letterSpacing: "-0.03em" }}>ìjèbú <span style={{ color: "#D4AF37" }}>feed</span></h1>
        <button onClick={() => setShowCreate(true)} style={{ background: "#D4AF37", border: "none", borderRadius: 50, padding: "8px 18px", fontSize: 13, fontWeight: 700, color: "#000", cursor: "pointer" }}>+ Post</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: "center", color: colors.subtext, fontSize: 14, paddingTop: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            No posts yet. Be the first to share!
            <br />
            <button onClick={() => setShowCreate(true)} style={{ marginTop: 20, background: "#D4AF37", border: "none", borderRadius: 50, padding: "12px 28px", fontSize: 14, fontWeight: 700, color: "#000", cursor: "pointer" }}>Create first post</button>
          </div>
        ) : posts.map(post => {
          const photo    = avatarUrl(post.profile?.photos?.[0] ?? post.profile?.avatar_url);
          const media    = postMediaUrl(post.media_url);
          const isOwner  = post.user_id === user?.id;
          const comments = commentsByPost[post.id] ?? [];

          return (
            <div key={post.id} style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: 4, marginBottom: 4, position: "relative" }}>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: colors.card, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ fontSize: 22 }}>🙂</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: colors.text }}>{post.profile?.name}</div>
                    <div style={{ fontSize: 12, color: colors.subtext }}>📍 {post.profile?.location} · {timeAgo(post.created_at)}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {!isOwner && (
                    <button onClick={() => toggleFollow(post)} style={{ background: post.user_following ? colors.card : "#D4AF37", border: post.user_following ? `1px solid ${colors.border}` : "none", borderRadius: 50, padding: "6px 16px", fontSize: 12, fontWeight: 700, color: post.user_following ? colors.subtext : "#000", cursor: "pointer" }}>
                      {post.user_following ? "Following" : "Follow"}
                    </button>
                  )}
                  {isOwner && (
                    <div style={{ position: "relative" }} ref={menuOpenFor === post.id ? menuRef : undefined}>
                      <button onClick={() => setMenuOpenFor(menuOpenFor === post.id ? null : post.id)} style={{ background: "none", border: "none", fontSize: 18, color: colors.subtext, cursor: "pointer", padding: 4 }}>⋯</button>
                      {menuOpenFor === post.id && (
                        <div style={{ position: "absolute", top: 28, right: 0, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden", zIndex: 20, minWidth: 120 }}>
                          <button onClick={() => startEdit(post)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 14px", fontSize: 13, color: colors.text, cursor: "pointer" }}>✏️ Edit</button>
                          <button onClick={() => deletePost(post)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 14px", fontSize: 13, color: "#FF3366", cursor: "pointer" }}>🗑️ Delete</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {post.type === "text" ? (
                <div style={{ margin: "0 16px 12px", background: post.bg_color || "#1a1a2e", borderRadius: 18, padding: "24px 20px", minHeight: 120, display: "flex", alignItems: "center" }}>
                  <p style={{ fontSize: 16, color: "#fff", lineHeight: 1.6, fontWeight: 500, fontStyle: "italic" }}>"{post.caption}"</p>
                </div>
              ) : media ? (
                <div style={{ margin: "0 16px 12px", borderRadius: 18, overflow: "hidden", height: 280, background: colors.card }}>
                  {post.type === "video"
                    ? <video src={media} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls />
                    : <img src={media} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                  }
                </div>
              ) : (
                <div style={{ margin: "0 16px 12px", borderRadius: 18, background: colors.card, height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 64 }}>📷</span>
                </div>
              )}

              {post.type !== "text" && post.caption && (
                <p style={{ padding: "0 16px 10px", fontSize: 14, color: colors.subtext, lineHeight: 1.55 }}>
                  <span style={{ fontWeight: 700, color: colors.text }}>{post.profile?.name} </span>{post.caption}
                </p>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 16px 14px" }}>
                <div style={{ display: "flex", gap: 20 }}>
                  <button onClick={() => toggleLike(post)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <span style={{ fontSize: 20 }}>{post.user_liked ? "❤️" : "🤍"}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: post.user_liked ? "#FF3366" : colors.subtext }}>{post.likes_count.toLocaleString()}</span>
                  </button>
                  <button onClick={() => openComments(post.id)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <span style={{ fontSize: 20 }}>💬</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: colors.subtext }}>{post.comments_count.toLocaleString()}</span>
                  </button>
                  <button onClick={() => sharePost(post)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <span style={{ fontSize: 20 }}>↗️</span>
                  </button>
                </div>
                <button
                  onClick={() => toggleSave(post)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 20,
                    cursor: "pointer",
                    opacity: post.user_saved ? 1 : 0.35,
                    filter: post.user_saved ? "none" : "grayscale(1)",
                  }}
                >📌</button>
              </div>

              {commenting === post.id && (
                <div style={{ padding: "0 16px 16px" }}>

                  {commentsLoading === post.id ? (
                    <div style={{ fontSize: 12, color: colors.subtext, padding: "8px 0" }}>Loading comments...</div>
                  ) : comments.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                      {comments.map(c => {
                        const cPhoto = avatarUrl(c.profile?.photos?.[0] ?? c.profile?.avatar_url);
                        return (
                          <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: colors.card, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {cPhoto ? <img src={cPhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ fontSize: 13 }}>🙂</span>}
                            </div>
                            <div style={{ background: colors.card, borderRadius: 14, padding: "8px 12px", flex: 1 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{c.profile?.name ?? "Someone"} </span>
                              <span style={{ fontSize: 12, color: colors.subtext }}>{c.content}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: colors.subtext, padding: "4px 0 12px" }}>No comments yet — be the first.</div>
                  )}

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      value={commentDraft}
                      onChange={e => setCommentDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") submitComment(post); }}
                      placeholder="Add a comment..."
                      style={{ flex: 1, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 50, padding: "11px 16px", fontSize: 13, color: colors.text, outline: "none", fontFamily: "system-ui" }}
                    />
                    <button
                      onClick={() => submitComment(post)}
                      disabled={!commentDraft.trim() || commentSubmitting}
                      style={{ width: 40, height: 40, borderRadius: "50%", background: "#D4AF37", border: "none", fontSize: 16, cursor: commentDraft.trim() ? "pointer" : "not-allowed", opacity: commentDraft.trim() ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 700 }}
                    >↑</button>
                  </div>
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