"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, avatarUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import BottomNav, { BOTTOM_NAV_HEIGHT } from "@/components/BottomNav";
import Header from "@/components/Header";
import ImageLightbox from "@/components/ImageLightbox";
import SoulCloth, { clothStripCount } from "@/components/SoulCloth";
import {
  AboutList,
  Avatar,
  GOLD,
  PhotoMosaic,
  PostsGrid,
  ProfileStyles,
  StatLink,
  Tabs,
  ThreadChips,
  Toast,
  capitalize,
  isPremium,
  memberSince,
  presenceOf,
  shareProfile,
  sharedThreads,
  type PostLite,
} from "@/components/ProfileParts";
import type { Profile } from "@/lib/types";

type TabId = "photos" | "posts" | "about";
type LoadState = "loading" | "ready" | "missing" | "error";

const glassChip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 36,
  padding: "0 14px",
  borderRadius: 50,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(0,0,0,0.38)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

export default function PublicProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user, profile: viewer } = useAuth();
  const { colors } = useTheme();
  const uid = user?.id;

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postsRequested = useRef(false);

  const [profile, setProfile]     = useState<Profile | null>(null);
  const [status, setStatus]       = useState<LoadState>("loading");
  const [attempt, setAttempt]     = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("photos");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy]   = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [toast, setToast]         = useState("");
  const [counts, setCounts]       = useState({ followers: 0, following: 0, posts: 0 });
  const [posts, setPosts]         = useState<PostLite[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* Moving from one profile to another keeps this component alive, so reset per-profile state. */
  useEffect(() => {
    postsRequested.current = false;
    setPosts([]);
    setActiveTab("photos");
    setLightboxIndex(null);
    setCounts({ followers: 0, following: 0, posts: 0 });
  }, [id]);

  /* ── profile ── */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setStatus("loading");
    (async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (error) { console.error("Profile load failed:", error); setStatus("error"); return; }
      if (!data) { setProfile(null); setStatus("missing"); return; }
      setProfile(data as Profile);
      setStatus("ready");
    })();
    return () => { cancelled = true; };
  }, [id, attempt]);

  /* ── follow state ── */
  useEffect(() => {
    if (!uid || !id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("follows").select("follower_id").eq("follower_id", uid).eq("following_id", id).maybeSingle();
      if (!cancelled) setIsFollowing(!!data);
    })();
    return () => { cancelled = true; };
  }, [uid, id]);

  /* ── counts ── */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const [followersRes, followingRes, postsRes] = await Promise.all([
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", id),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", id),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", id),
      ]);
      if (cancelled) return;
      setCounts({
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
        posts:     postsRes.count ?? 0,
      });
    })();
    return () => { cancelled = true; };
  }, [id]);

  /* ── posts load the first time the tab is opened ── */
  useEffect(() => {
    if (activeTab !== "posts" || !id || postsRequested.current) return;
    postsRequested.current = true;
    setPostsLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id,type,caption,media_url,bg_color,likes_count,comments_count,created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) console.error("Posts load failed:", error);
      setPosts(Array.isArray(data) ? (data as PostLite[]) : []);
      setPostsLoading(false);
    })();
  }, [activeTab, id]);

  const toggleFollow = async () => {
    if (!uid || !id || followBusy) return;
    setFollowBusy(true);
    const next = !isFollowing;
    setIsFollowing(next);
    setCounts(c => ({ ...c, followers: Math.max(0, c.followers + (next ? 1 : -1)) }));

    const { error } = next
      ? await supabase.from("follows").insert({ follower_id: uid, following_id: id })
      : await supabase.from("follows").delete().eq("follower_id", uid).eq("following_id", id);

    if (error) {
      console.error("Follow update failed:", error);
      setIsFollowing(!next);
      setCounts(c => ({ ...c, followers: Math.max(0, c.followers + (next ? -1 : 1)) }));
      showToast("Couldn't update. Try again.");
    }
    setFollowBusy(false);
  };

  const handleShare = async () => {
    if (!profile) return;
    const result = await shareProfile(profile.id, profile.name);
    if (result === "copied") showToast("Profile link copied");
    if (result === "failed") showToast("Couldn't share this profile");
  };

  const shell: React.CSSProperties = {
    minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg,
    fontFamily: "system-ui", display: "flex", flexDirection: "column", color: colors.text,
  };

  /* ── states ── */
  if (status === "loading") return (
    <div style={shell}>
      <Header />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: colors.subtext, fontSize: 14 }}>
        Loading profile...
      </div>
      <BottomNav />
    </div>
  );

  if (status !== "ready" || !profile) return (
    <main style={shell}>
      <ProfileStyles />
      <Header />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "0 32px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
          {status === "error" ? "This profile couldn't load" : "This profile doesn't exist"}
        </p>
        <p style={{ margin: 0, fontSize: 14, color: colors.subtext, lineHeight: 1.5 }}>
          {status === "error" ? "Check your connection and try again." : "It may have been removed."}
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          {status === "error" && (
            <button type="button" className="sp-btn" onClick={() => setAttempt(a => a + 1)}
              style={{ background: GOLD, border: 0, borderRadius: 50, padding: "10px 22px", fontSize: 13, fontWeight: 800, color: "#000", cursor: "pointer" }}>Try again</button>
          )}
          <button type="button" className="sp-btn" onClick={() => router.back()}
            style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 50, padding: "10px 22px", fontSize: 13, fontWeight: 700, color: colors.text, cursor: "pointer" }}>Go back</button>
        </div>
      </div>
      <BottomNav />
    </main>
  );

  /* ── ready ── */
  const photos    = profile.photos ?? [];
  const interests = profile.interests ?? [];
  const mainPic   = avatarUrl(photos[0] ?? profile.avatar_url);
  const isSelf    = uid === profile.id;
  const premium   = isPremium(profile);
  const presence  = presenceOf(profile.online_at);
  const firstName = (profile.name || "").trim().split(" ")[0] || "them";
  const shared    = isSelf ? [] : sharedThreads(viewer?.interests ?? [], interests);

  const lightboxPhotos: string[] = photos.length
    ? photos.map(p => avatarUrl(p)).filter((u): u is string => !!u)
    : (profile.avatar_url ? [avatarUrl(profile.avatar_url)].filter((u): u is string => !!u) : []);

  const tabs: { id: TabId; label: string }[] = [
    { id: "photos", label: `Photos ${photos.length}` },
    { id: "posts",  label: `Posts ${counts.posts}` },
    { id: "about",  label: "About" },
  ];

  return (
    <main style={shell}>
      <ProfileStyles />
      <Toast message={toast} />
      <Header />

      {lightboxIndex !== null && lightboxPhotos.length > 0 && (
        <ImageLightbox photos={lightboxPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: BOTTOM_NAV_HEIGHT + 16 }}>

        <SoulCloth seed={profile.id} strips={clothStripCount(interests.length)}>
          <button type="button" className="sp-btn" onClick={() => router.back()} aria-label="Go back" style={glassChip}>← Back</button>
          <button type="button" className="sp-btn" onClick={handleShare} aria-label="Share profile" style={glassChip}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12" /><path d="M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
            </svg>
            Share
          </button>
        </SoulCloth>

        <section style={{ padding: "0 20px" }}>
          <div style={{ marginTop: -52, position: "relative", zIndex: 2 }}>
            <button type="button" className="sp-tile" disabled={!lightboxPhotos.length} aria-label="Open photo"
              onClick={() => lightboxPhotos.length && setLightboxIndex(0)}
              style={{ background: "none", border: 0, padding: 0, borderRadius: "50%", cursor: lightboxPhotos.length ? "pointer" : "default" }}>
              <Avatar src={mainPic} name={profile.name} size={104} online={presence.online} />
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                {profile.name}{profile.age ? `, ${profile.age}` : ""}
              </h1>
              {premium && (
                <span style={{ background: GOLD, color: "#000", borderRadius: 50, padding: "2px 10px", fontSize: 11, fontWeight: 800 }}>Premium</span>
              )}
            </div>
            {profile.occupation && <p style={{ margin: "6px 0 0", fontSize: 14.5, fontWeight: 600 }}>{profile.occupation}</p>}
            {profile.location && <p style={{ margin: "2px 0 0", fontSize: 13.5, color: colors.subtext }}>{profile.location}</p>}
            <p style={{ margin: "6px 0 0", fontSize: 12.5, fontWeight: 600, color: presence.online ? "#22C55E" : colors.subtext }}>{presence.label}</p>
          </div>

          {profile.bio && <p style={{ margin: "14px 0 0", fontSize: 14.5, lineHeight: 1.65, maxWidth: "46ch" }}>{profile.bio}</p>}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 20px", marginTop: 16 }}>
            <StatLink value={counts.followers} label="followers" />
            <StatLink value={counts.following} label="following" />
            <StatLink value={counts.posts}     label="posts" onClick={() => setActiveTab("posts")} />
          </div>

          {isSelf ? (
            <div style={{ marginTop: 18, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 13.5, color: colors.subtext, lineHeight: 1.4 }}>This is how others see your profile.</span>
              <button type="button" className="sp-btn" onClick={() => router.push("/profile")}
                style={{ background: GOLD, border: 0, borderRadius: 50, padding: "9px 18px", fontSize: 13, fontWeight: 800, color: "#000", cursor: "pointer", flexShrink: 0 }}>Edit</button>
            </div>
          ) : user ? (
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button type="button" className="sp-btn" onClick={toggleFollow} disabled={followBusy} aria-pressed={isFollowing}
                style={{ flex: 1, background: isFollowing ? colors.card : GOLD, border: isFollowing ? `1px solid ${colors.border}` : "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 800, color: isFollowing ? colors.subtext : "#000", cursor: "pointer" }}>
                {isFollowing ? "Following" : "Follow"}
              </button>
              <button type="button" className="sp-btn" onClick={() => router.push("/chats")}
                style={{ flex: 1, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700, color: colors.text, cursor: "pointer" }}>
                Message
              </button>
            </div>
          ) : null}

          {interests.length > 0 && (
            <div style={{ marginTop: 18 }}>
              {shared.length > 0 && (
                <p style={{ margin: "0 0 10px", fontSize: 13.5, fontWeight: 700 }}>
                  You and {firstName} share {shared.length} {shared.length === 1 ? "interest" : "interests"}
                </p>
              )}
              <ThreadChips interests={interests} shared={shared} />
            </div>
          )}
        </section>

        <div style={{ marginTop: 22, padding: "0 20px" }}>
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>

        <div style={{ padding: "16px 20px 0" }}>
          {activeTab === "photos" && (
            <PhotoMosaic photos={photos} onOpen={setLightboxIndex} emptyText="No photos yet" />
          )}

          {activeTab === "posts" && <PostsGrid posts={posts} loading={postsLoading} />}

          {activeTab === "about" && (
            <AboutList rows={[
              { label: "Age",          value: profile.age ? `${profile.age} years old` : "—" },
              { label: "Location",     value: profile.location || "—" },
              { label: "Occupation",   value: profile.occupation || "—" },
              { label: "Looking for",  value: capitalize(profile.looking_for) },
              { label: "Gender",       value: capitalize(profile.gender) },
              { label: "Member since", value: memberSince(profile.created_at) },
            ]} />
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}