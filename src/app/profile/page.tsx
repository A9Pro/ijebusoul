"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl, uploadAvatar } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import type { Profile } from "@/lib/types";

const INTEREST_SUGGESTIONS = ["Suya lover","Owanbe ready","AFC Ijebu","Egusi connoisseur","Owambe DJ","Yoruba culture","Beach trips","Deep convos","Food lover","Music head"];

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [activeTab, setActiveTab]     = useState<"photos" | "about">("photos");
  const [draft, setDraft]             = useState<Record<string, any> | null>(null);
  const [newInterest, setNewInterest] = useState("");

  const [stats, setStats] = useState({ likes: 0, matches: 0, followers: 0, following: 0 });
  const [listModal, setListModal]       = useState<null | "followers" | "following">(null);
  const [listProfiles, setListProfiles] = useState<Profile[]>([]);
  const [listLoading, setListLoading]   = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [likesRes, matchesRes, followersRes, followingRes] = await Promise.all([
        supabase.from("swipes").select("id", { count: "exact", head: true }).eq("swiped_id", user.id).in("action", ["like", "superlike"]),
        supabase.from("matches").select("id", { count: "exact", head: true }).or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", user.id),
      ]);
      setStats({
        likes:     likesRes.count ?? 0,
        matches:   matchesRes.count ?? 0,
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
      });
    })();
  }, [user]);

  const openList = async (kind: "followers" | "following") => {
    if (!user) return;
    setListModal(kind);
    setListLoading(true);
    const filterCol = kind === "followers" ? "following_id" : "follower_id";
    const idCol      = kind === "followers" ? "follower_id" : "following_id";
    const { data: rows } = await supabase.from("follows").select(idCol).eq(filterCol, user.id);
    const ids = (rows ?? []).map((r: any) => r[idCol]);
    if (!ids.length) { setListProfiles([]); setListLoading(false); return; }
    const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
    setListProfiles((profs as Profile[]) ?? []);
    setListLoading(false);
  };

  const startEdit = () => {
    setDraft({ ...profile, interests: [...(profile?.interests ?? [])] });
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setDraft(null); };

  const saveEdit = async () => {
    if (!user || !draft) return;
    setSaving(true);
    await supabase.from("profiles").update({
      name:       draft.name,
      age:        draft.age,
      location:   draft.location,
      occupation: draft.occupation,
      bio:        draft.bio,
      interests:  draft.interests,
    }).eq("id", user.id);
    await refreshProfile();
    setSaving(false);
    setEditing(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const path = await uploadAvatar(file, user.id);
    const newPhotos = [...(profile?.photos ?? []), path];
    await supabase.from("profiles").update({ photos: newPhotos, avatar_url: newPhotos[0] }).eq("id", user.id);
    await refreshProfile();
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user]);

  if (authLoading || !profile) return (
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

  const photos  = profile.photos ?? [];
  const mainPic = avatarUrl(photos[0] ?? profile.avatar_url);

  const statBtnStyle: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: 4 };
  const statNumStyle: React.CSSProperties = { fontSize: 18, fontWeight: 900, color: colors.text };
  const statLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: colors.subtext };

  const StatsRow = (
    <div style={{ display: "flex", justifyContent: "center", gap: 30, padding: "4px 20px 20px" }}>
      <button onClick={() => router.push("/likes")} style={statBtnStyle}>
        <div style={statNumStyle}>{stats.likes}</div>
        <div style={statLabelStyle}>Likes</div>
      </button>
      <button onClick={() => router.push("/chats")} style={statBtnStyle}>
        <div style={statNumStyle}>{stats.matches}</div>
        <div style={statLabelStyle}>Matches</div>
      </button>
      <button onClick={() => openList("followers")} style={statBtnStyle}>
        <div style={statNumStyle}>{stats.followers}</div>
        <div style={statLabelStyle}>Followers</div>
      </button>
      <button onClick={() => openList("following")} style={statBtnStyle}>
        <div style={statNumStyle}>{stats.following}</div>
        <div style={statLabelStyle}>Following</div>
      </button>
    </div>
  );

  const ListModal = listModal && (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, maxHeight: "70vh", background: colors.card, borderRadius: "24px 24px 0 0", padding: "20px 20px 40px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 900, color: colors.text, textTransform: "capitalize" }}>{listModal}</h2>
          <button onClick={() => setListModal(null)} style={{ background: colors.bg, border: "none", borderRadius: 50, width: 32, height: 32, fontSize: 15, color: colors.subtext, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {listLoading ? (
            <div style={{ fontSize: 13, color: colors.subtext, textAlign: "center", padding: 20 }}>Loading...</div>
          ) : listProfiles.length === 0 ? (
            <div style={{ fontSize: 13, color: colors.subtext, textAlign: "center", padding: 20 }}>Nobody here yet.</div>
          ) : listProfiles.map(p => {
            const photo = avatarUrl(p.photos?.[0] ?? p.avatar_url);
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 4px" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: colors.bg, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ fontSize: 20 }}>🙂</span>}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{p.name}</div>
                  {p.location && <div style={{ fontSize: 12, color: colors.subtext }}>📍 {p.location}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── Edit mode ────────────────────────────────────────────────────────────────
  if (editing && draft) return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column", color: colors.text }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 20px 16px", borderBottom: `1px solid ${colors.border}` }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em" }}>Edit profile</h1>
        <button onClick={cancelEdit} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 50, padding: "7px 16px", fontSize: 13, fontWeight: 600, color: colors.subtext, cursor: "pointer" }}>Cancel</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: colors.card, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #D4AF37", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
            {mainPic ? <img src={mainPic} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ fontSize: 48 }}>🙂</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
          <span style={{ fontSize: 12, color: colors.subtext }}>Tap to change photo</span>
        </div>

        {(["name","age","location","occupation"] as const).map((key) => (
          <div key={key}>
            <label style={{ fontSize: 11, fontWeight: 700, color: colors.subtext, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
            <input
              value={draft[key] ?? ""}
              onChange={e => setDraft(p => ({ ...p!, [key]: e.target.value }))}
              style={{ width: "100%", background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "11px 14px", color: colors.text, fontSize: 14, outline: "none", fontFamily: "system-ui" }}
            />
          </div>
        ))}

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: colors.subtext, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Bio</label>
          <textarea
            rows={4}
            value={draft.bio ?? ""}
            onChange={e => setDraft(p => ({ ...p!, bio: e.target.value }))}
            style={{ width: "100%", background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14, padding: "11px 14px", color: colors.text, fontSize: 14, outline: "none", resize: "none", lineHeight: 1.6, fontFamily: "system-ui" }}
          />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: colors.subtext, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 12 }}>Interests</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {(draft.interests as string[] ?? []).map((tag: string, i: number) => (
              <div key={i} onClick={() => setDraft(p => ({ ...p!, interests: (p!.interests as string[]).filter((_: string, j: number) => j !== i) }))} style={{ display: "inline-flex", alignItems: "center", background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", color: "#D4AF37", borderRadius: 50, padding: "5px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {tag}<span style={{ marginLeft: 6, opacity: .6 }}>×</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newInterest}
              onChange={e => setNewInterest(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newInterest.trim()) {
                  setDraft(p => ({ ...p!, interests: [...(p!.interests as string[] ?? []), newInterest.trim()] }));
                  setNewInterest("");
                }
              }}
              placeholder="Add an interest..."
              style={{ flex: 1, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "10px 14px", color: colors.text, fontSize: 13, outline: "none", fontFamily: "system-ui" }}
            />
            <button onClick={() => {
              if (newInterest.trim()) {
                setDraft(p => ({ ...p!, interests: [...(p!.interests as string[] ?? []), newInterest.trim()] }));
                setNewInterest("");
              }
            }} style={{ background: "#D4AF37", border: "none", borderRadius: 12, padding: "10px 16px", fontWeight: 700, color: "#000", cursor: "pointer", fontSize: 13 }}>Add</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {INTEREST_SUGGESTIONS.filter(s => !(draft.interests as string[] ?? []).includes(s)).map((s: string) => (
              <div key={s} onClick={() => setDraft(p => ({ ...p!, interests: [...(p!.interests as string[] ?? []), s] }))} style={{ display: "inline-flex", alignItems: "center", background: colors.card, border: `1px solid ${colors.border}`, color: colors.subtext, borderRadius: 50, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ {s}</div>
            ))}
          </div>
        </div>

        <button onClick={saveEdit} disabled={saving} style={{ width: "100%", background: saving ? "rgba(212,175,55,0.5)" : "#D4AF37", border: "none", borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 800, color: "#000", cursor: saving ? "not-allowed" : "pointer", marginBottom: 20 }}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <BottomNav />
    </main>
  );

  // ── View mode ────────────────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column", color: colors.text }}>

      {ListModal}
      <Header />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em" }}>My profile</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={startEdit} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 50, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: colors.subtext, cursor: "pointer" }}>✏️ Edit</button>
          <button onClick={handleSignOut} style={{ background: "rgba(255,51,102,0.12)", border: "1px solid rgba(255,51,102,0.25)", borderRadius: 50, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#FF3366", cursor: "pointer" }}>Sign out</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>

        <div style={{ padding: "0 20px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 100, height: 100, borderRadius: "50%", background: colors.card, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #D4AF37" }}>
              {mainPic ? <img src={mainPic} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={profile.name} /> : <span style={{ fontSize: 52 }}>🙂</span>}
            </div>
            <div style={{ position: "absolute", bottom: 3, right: 3, width: 22, height: 22, borderRadius: "50%", background: "#22C55E", border: `2.5px solid ${colors.bg}` }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>{profile.name}, {profile.age}</h2>
            <p style={{ fontSize: 13, color: colors.subtext, marginTop: 4 }}>📍 {profile.location}{profile.occupation ? ` · ${profile.occupation}` : ""}</p>
          </div>
          {profile.bio && <p style={{ fontSize: 14, color: colors.subtext, lineHeight: 1.65, textAlign: "center", maxWidth: 320 }}>{profile.bio}</p>}
          {profile.interests?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {(profile.interests as string[]).map((tag: string, i: number) => (
                <div key={i} style={{ display: "inline-flex", alignItems: "center", background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", color: "#D4AF37", borderRadius: 50, padding: "5px 13px", fontSize: 12, fontWeight: 600 }}>{tag}</div>
              ))}
            </div>
          )}
        </div>

        {StatsRow}

        <div style={{ display: "flex", borderBottom: `1px solid ${colors.border}`, padding: "0 20px" }}>
          {(["photos", "about"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, background: "none", border: "none", color: activeTab === tab ? "#D4AF37" : colors.subtext, fontSize: 13, fontWeight: activeTab === tab ? 700 : 500, padding: "10px 0 12px", cursor: "pointer", borderBottom: activeTab === tab ? "2px solid #D4AF37" : "2px solid transparent", textTransform: "capitalize" }}>{tab}</button>
          ))}
        </div>

        {activeTab === "photos" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "16px 20px" }}>
            {(photos as string[]).map((path: string, i: number) => {
              const url = avatarUrl(path);
              return (
                <div key={i} style={{ borderRadius: 12, aspectRatio: "1", background: colors.card, overflow: "hidden", position: "relative" }}>
                  {url && <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />}
                  {i === 0 && <div style={{ position: "absolute", top: 6, left: 6, background: "#D4AF37", borderRadius: 50, padding: "2px 8px", fontSize: 10, fontWeight: 800, color: "#000" }}>Main</div>}
                </div>
              );
            })}
            <div onClick={() => fileRef.current?.click()} style={{ borderRadius: 12, aspectRatio: "1", background: colors.card, border: `1.5px dashed ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: colors.subtext, cursor: "pointer" }}>+</div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
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
            ]).map((row, i: number) => (
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