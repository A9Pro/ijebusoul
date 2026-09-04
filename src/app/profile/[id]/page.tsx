"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, avatarUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import type { Profile } from "@/lib/types";

export default function PublicProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [profile, setProfile]     = useState<Profile | null>(null);
  const [fetching, setFetching]   = useState(true);
  const [activeTab, setActiveTab] = useState<"photos" | "about">("photos");
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setFetching(true);
      const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
      setProfile((data as Profile) ?? null);
      setFetching(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data } = await supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", id).maybeSingle();
      setIsFollowing(!!data);
    })();
  }, [user, id]);

  const toggleFollow = async () => {
    if (!user || !id) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id);
      setIsFollowing(false);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
      setIsFollowing(true);
    }
  };

  if (fetching) return (
    <div style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: colors.subtext }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>👤</div>
          <div style={{ fontSize: 14 }}>Loading profile...</div>
        </div>
      </div>
      <BottomNav />
    </div>
  );

  if (!profile) return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column", color: colors.text }}>
      <Header />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "0 32px" }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <p style={{ fontSize: 14, color: colors.subtext, textAlign: "center" }}>This profile doesn't exist or was removed.</p>
        <button onClick={() => router.back()} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 50, padding: "10px 22px", fontSize: 13, fontWeight: 700, color: colors.text, cursor: "pointer", marginTop: 8 }}>← Go back</button>
      </div>
      <BottomNav />
    </main>
  );

  const photos  = profile.photos ?? [];
  const mainPic = avatarUrl(photos[0] ?? profile.avatar_url);
  const isSelf  = user?.id === profile.id;

  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column", color: colors.text }}>
      <Header />

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 20px 8px" }}>
        <button onClick={() => router.back()} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "50%", width: 36, height: 36, color: colors.text, fontSize: 16, cursor: "pointer" }}>←</button>
        <h1 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em" }}>Profile</h1>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
        <div style={{ padding: "8px 20px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 100, height: 100, borderRadius: "50%", background: colors.card, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #D4AF37" }}>
            {mainPic ? <img src={mainPic} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={profile.name} /> : <span style={{ fontSize: 52 }}>🙂</span>}
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>{profile.name}, {profile.age}</h2>
            <p style={{ fontSize: 13, color: colors.subtext, marginTop: 4 }}>📍 {profile.location}{profile.occupation ? ` · ${profile.occupation}` : ""}</p>
          </div>
          {profile.bio && <p style={{ fontSize: 14, color: colors.subtext, lineHeight: 1.65, textAlign: "center", maxWidth: 320 }}>{profile.bio}</p>}
          {(profile.interests as string[])?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {(profile.interests as string[]).map((tag, i) => (
                <div key={i} style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", color: "#D4AF37", borderRadius: 50, padding: "5px 13px", fontSize: 12, fontWeight: 600 }}>{tag}</div>
              ))}
            </div>
          )}

          {!isSelf && user && (
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button onClick={toggleFollow} style={{ flex: 1, background: isFollowing ? colors.card : "#D4AF37", border: isFollowing ? `1px solid ${colors.border}` : "none", borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 700, color: isFollowing ? colors.subtext : "#000", cursor: "pointer" }}>
                {isFollowing ? "Following" : "+ Follow"}
              </button>
              <button onClick={() => router.push("/chats")} style={{ flex: 1, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 700, color: colors.text, cursor: "pointer" }}>
                💬 Message
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", borderBottom: `1px solid ${colors.border}`, padding: "0 20px", marginTop: 12 }}>
          {(["photos", "about"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, background: "none", border: "none", color: activeTab === tab ? "#D4AF37" : colors.subtext, fontSize: 13, fontWeight: activeTab === tab ? 700 : 500, padding: "10px 0 12px", cursor: "pointer", borderBottom: activeTab === tab ? "2px solid #D4AF37" : "2px solid transparent", textTransform: "capitalize" }}>{tab}</button>
          ))}
        </div>

        {activeTab === "photos" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "16px 20px" }}>
            {photos.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", color: colors.subtext, fontSize: 13, padding: "30px 0" }}>No photos yet</div>
            ) : (photos as string[]).map((path, i) => {
              const url = avatarUrl(path);
              return (
                <div key={i} style={{ borderRadius: 12, aspectRatio: "1", background: colors.card, overflow: "hidden", position: "relative" }}>
                  {url && <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />}
                  {i === 0 && <div style={{ position: "absolute", top: 6, left: 6, background: "#D4AF37", borderRadius: 50, padding: "2px 8px", fontSize: 10, fontWeight: 800, color: "#000" }}>Main</div>}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "about" && (
          <div style={{ padding: "20px" }}>
            {([
              { icon: "🎂", label: "Age",         val: profile.age ? `${profile.age} years old` : "—" },
              { icon: "📍", label: "Location",    val: profile.location ?? "—" },
              { icon: "💼", label: "Occupation",  val: profile.occupation ?? "—" },
              { icon: "💑", label: "Looking for", val: profile.looking_for ? profile.looking_for.charAt(0).toUpperCase() + profile.looking_for.slice(1) : "—" },
              { icon: "🌍", label: "Gender",      val: profile.gender ?? "—" },
            ]).map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${colors.border}` }}>
                <span style={{ fontSize: 18, width: 26, textAlign: "center" }}>{row.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: colors.subtext, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>{row.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{row.val}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}