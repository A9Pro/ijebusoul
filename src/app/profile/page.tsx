"use client";
import { useState, useRef } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl, uploadAvatar } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";

const INTEREST_SUGGESTIONS = ["Suya lover","Owanbe ready","AFC Ijebu","Egusi connoisseur","Owambe DJ","Yoruba culture","Beach trips","Deep convos","Food lover","Music head"];

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [activeTab, setActiveTab] = useState<"photos"|"about"|"activity">("photos");
  const [draft, setDraft]         = useState<any>(null);
  const [newInterest, setNewInterest] = useState("");

  const startEdit = () => {
    setDraft({ ...profile, interests: [...(profile?.interests ?? [])] });
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setDraft(null); };

  const saveEdit = async () => {
    if (!user || !draft) return;
    setSaving(true);
    await supabase.from("profiles").update({
      name:        draft.name,
      age:         draft.age,
      location:    draft.location,
      occupation:  draft.occupation,
      bio:         draft.bio,
      interests:   draft.interests,
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
    <div style={{ minHeight: "100dvh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontFamily: "system-ui" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>👤</div>
        <div style={{ fontSize: 14 }}>Loading profile...</div>
      </div>
    </div>
  );

  const photos  = profile.photos ?? [];
  const mainPic = avatarUrl(photos[0] ?? profile.avatar_url);

  if (editing && draft) return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui", display: "flex", flexDirection: "column", color: "#fff" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em" }}>Edit profile</h1>
        <button onClick={cancelEdit} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 50, padding: "7px 16px", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>Cancel</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#1a1a1a", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #D4AF37", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
            {mainPic ? <img src={mainPic} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 48 }}>🙂</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Tap to change photo</span>
        </div>

        {([["name","Name"],["age","Age"],["location","Location"],["occupation","Occupation"]] as [string,string][]).map(([key, label]) => (
          <div key={key}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>{label}</label>
            <input value={draft[key] ?? ""} onChange={e => setDraft((p: any) => ({ ...p, [key]: e.target.value }))} style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", fontFamily: "system-ui" }} />
          </div>
        ))}

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Bio</label>
          <textarea rows={4} value={draft.bio ?? ""} onChange={e => setDraft((p: any) => ({ ...p, bio: e.target.value }))} style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", resize: "none", lineHeight: 1.6, fontFamily: "system-ui" }} />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 12 }}>Interests</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {(draft.interests ?? []).map((tag: string, i: number) => (
              <div key={i} onClick={() => setDraft((p: any) => ({ ...p, interests: p.interests.filter((_: any, j: number) => j !== i) }))} style={{ display: "inline-flex", alignItems: "center", background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", color: "#D4AF37", borderRadius: 50, padding: "5px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {tag}<span style={{ marginLeft: 6, opacity: .6 }}>×</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newInterest} onChange={e => setNewInterest(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newInterest.trim()) { setDraft((p: any) => ({ ...p, interests: [...(p.interests ?? []), newInterest.trim()] })); setNewInterest(""); }}} placeholder="Add an interest..." style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "system-ui" }} />
            <button onClick={() => { if (newInterest.trim()) { setDraft((p: any) => ({ ...p, interests: [...(p.interests ?? []), newInterest.trim()] })); setNewInterest(""); }}} style={{ background: "#D4AF37", border: "none", borderRadius: 12, padding: "10px 16px", fontWeight: 700, color: "#000", cursor: "pointer", fontSize: 13 }}>Add</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {INTEREST_SUGGESTIONS.filter(s => !(draft.interests ?? []).includes(s)).map(s => (
              <div key={s} onClick={() => setDraft((p: any) => ({ ...p, interests: [...(p.interests ?? []), s] }))} style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: 50, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ {s}</div>
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

  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui", display: "flex", flexDirection: "column", color: "#fff" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 20px 16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em" }}>My profile</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={startEdit} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 50, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>✏️ Edit</button>
          <button onClick={handleSignOut} style={{ background: "rgba(255,51,102,0.12)", border: "1px solid rgba(255,51,102,0.25)", borderRadius: 50, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#FF3366", cursor: "pointer" }}>Sign out</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>

        <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 100, height: 100, borderRadius: "50%", background: "#1a1a1a", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #D4AF37" }}>
              {mainPic ? <img src={mainPic} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 52 }}>🙂</span>}
            </div>
            <div style={{ position: "absolute", bottom: 3, right: 3, width: 22, height: 22, borderRadius: "50%", background: "#22C55E", border: "2.5px solid #0a0a0a" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>{profile.name}, {profile.age}</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>📍 {profile.location}{profile.occupation ? ` · ${profile.occupation}` : ""}</p>
          </div>
          {profile.bio && <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, textAlign: "center", maxWidth: 320 }}>{profile.bio}</p>}
          {profile.interests?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {profile.interests.map((tag, i) => (
                <div key={i} style={{ display: "inline-flex", alignItems: "center", background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", color: "#D4AF37", borderRadius: 50, padding: "5px 13px", fontSize: 12, fontWeight: 600 }}>{tag}</div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 20px" }}>
          {(["photos","about"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, background: "none", border: "none", color: activeTab === tab ? "#D4AF37" : "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: activeTab === tab ? 700 : 500, padding: "10px 0 12px", cursor: "pointer", borderBottom: activeTab === tab ? "2px solid #D4AF37" : "2px solid transparent", textTransform: "capitalize" }}>{tab}</button>
          ))}
        </div>

        {activeTab === "photos" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "16px 20px" }}>
            {photos.map((path, i) => {
              const url = avatarUrl(path);
              return (
                <div key={i} style={{ borderRadius: 12, aspectRatio: "1", background: "#1a1a1a", overflow: "hidden", position: "relative" }}>
                  {url && <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  {i === 0 && <div style={{ position: "absolute", top: 6, left: 6, background: "#D4AF37", borderRadius: 50, padding: "2px 8px", fontSize: 10, fontWeight: 800, color: "#000" }}>Main</div>}
                </div>
              );
            })}
            <div onClick={() => fileRef.current?.click()} style={{ borderRadius: 12, aspectRatio: "1", background: "rgba(255,255,255,0.04)", border: "1.5px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "rgba(255,255,255,0.25)", cursor: "pointer" }}>+</div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
          </div>
        )}

        {activeTab === "about" && (
          <div style={{ padding: "20px" }}>
            {([
              { icon:"🎂", label:"Age",         val: profile.age ? `${profile.age} years old` : "—" },
              { icon:"📍", label:"Location",    val: profile.location ?? "—" },
              { icon:"💼", label:"Occupation",  val: profile.occupation ?? "—" },
              { icon:"💑", label:"Looking for", val: profile.looking_for ? profile.looking_for.charAt(0).toUpperCase() + profile.looking_for.slice(1) : "—" },
              { icon:"🌍", label:"Gender",      val: profile.gender ?? "—" },
            ]).map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 18, width: 26, textAlign: "center" }}>{row.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>{row.label}</div>
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