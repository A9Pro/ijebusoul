"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl, uploadAvatar } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import BottomNav, { BOTTOM_NAV_HEIGHT } from "@/components/BottomNav";
import Header from "@/components/Header";
import InviteCard from "@/components/InviteCard";
import ImageLightbox from "@/components/ImageLightbox";
import SoulCloth, { CLOTH, clothStripCount } from "@/components/SoulCloth";
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
  completeness,
  isPremium,
  memberSince,
  shareProfile,
  type PostLite,
} from "@/components/ProfileParts";
import BirthdayCard from "@/components/BirthdayCard";
import { isBirthdayToday, latestAdultBirthDate, parseBirthDate, ageFromBirthDate, validateBirthDate } from "@/lib/birthday";
import type { Profile } from "@/lib/types";

const INTEREST_SUGGESTIONS = ["Suya lover", "Owanbe ready", "AFC Ijebu", "Egusi connoisseur", "Owambe DJ", "Yoruba culture", "Beach trips", "Deep convos", "Food lover", "Music head"];

const MAX_PHOTOS = 9;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_INTERESTS = 12;
const BIO_MAX = 300;

type TabId = "photos" | "posts" | "about";
type Draft = {
  name: string; age: string; location: string; occupation: string; bio: string; interests: string[];
  birthDate: string;   // "YYYY-MM-DD" or ""
  shoutout: boolean;   // post a birthday shout-out for me
};

function birthdayLabel(iso?: string | null): string {
  const b = parseBirthDate(iso);
  if (!b) return "—";
  return new Date(2000, b.m - 1, b.d).toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const { theme, colors } = useTheme();
  const uid = user?.id;

  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postsRequested = useRef(false);

  const [editing, setEditing]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState("");
  const [draft, setDraft]             = useState<Draft | null>(null);
  const [newInterest, setNewInterest] = useState("");
  const [activeTab, setActiveTab]     = useState<TabId>("photos");
  const [photoBusy, setPhotoBusy]     = useState(false);
  const [toast, setToast]             = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [stats, setStats] = useState({ likes: 0, matches: 0, followers: 0, following: 0, posts: 0 });
  const [posts, setPosts]               = useState<PostLite[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const [listModal, setListModal]       = useState<null | "followers" | "following">(null);
  const [listProfiles, setListProfiles] = useState<Profile[]>([]);
  const [listLoading, setListLoading]   = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  /* ── counts ── */
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      const [likesRes, matchesRes, followersRes, followingRes, postsRes] = await Promise.all([
        supabase.from("swipes").select("id", { count: "exact", head: true }).eq("swiped_id", uid).in("action", ["like", "superlike"]),
        supabase.from("matches").select("id", { count: "exact", head: true }).or(`user1_id.eq.${uid},user2_id.eq.${uid}`),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", uid),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", uid),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", uid),
      ]);
      if (cancelled) return;
      setStats({
        likes:     likesRes.count ?? 0,
        matches:   matchesRes.count ?? 0,
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
        posts:     postsRes.count ?? 0,
      });
    })();
    return () => { cancelled = true; };
  }, [uid]);

  /* ── posts load the first time the tab is opened ── */
  useEffect(() => {
    if (activeTab !== "posts" || !uid || postsRequested.current) return;
    postsRequested.current = true;
    setPostsLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id,type,caption,media_url,bg_color,likes_count,comments_count,created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) console.error("Posts load failed:", error);
      setPosts(Array.isArray(data) ? (data as PostLite[]) : []);
      setPostsLoading(false);
    })();
  }, [activeTab, uid]);

  /* ── followers / following sheet ── */
  const openList = async (kind: "followers" | "following") => {
    if (!uid) return;
    setListModal(kind);
    setListLoading(true);
    setListProfiles([]);
    const filterCol = kind === "followers" ? "following_id" : "follower_id";
    const idCol     = kind === "followers" ? "follower_id" : "following_id";
    const { data: rows, error } = await supabase.from("follows").select(idCol).eq(filterCol, uid);
    if (error) console.error("Follow list failed:", error);
    const ids = ((rows ?? []) as any[]).map((r: any) => r[idCol]);
    if (!ids.length) { setListLoading(false); return; }
    const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
    setListProfiles((profs as Profile[]) ?? []);
    setListLoading(false);
  };

  useEffect(() => {
    if (!listModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setListModal(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listModal]);

  /* ── photos (saved straight away, like before) ── */
  const savePhotos = async (next: string[]): Promise<boolean> => {
    if (!uid) return false;
    const { error } = await supabase
      .from("profiles")
      .update({ photos: next, avatar_url: next[0] ?? null })
      .eq("id", uid);
    if (error) { console.error("Saving photos failed:", error); return false; }
    await refreshProfile();
    return true;
  };

  const addPhotos = async (files: FileList | null) => {
    if (!uid || !files || !files.length || photoBusy) return;
    const current = profile?.photos ?? [];
    const room = MAX_PHOTOS - current.length;
    if (room <= 0) { showToast(`You can add up to ${MAX_PHOTOS} photos`); return; }

    setPhotoBusy(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, room)) {
        if (!file.type.startsWith("image/")) { showToast("Only image files can be added"); continue; }
        if (file.size > MAX_PHOTO_BYTES)    { showToast("Each photo must be under 8 MB"); continue; }
        added.push(await uploadAvatar(file, uid));
      }
      if (added.length) {
        const ok = await savePhotos([...current, ...added]);
        showToast(ok ? (added.length === 1 ? "Photo added" : `${added.length} photos added`) : "Photo upload failed. Try again.");
      }
    } catch (err) {
      console.error("Photo upload failed:", err);
      showToast("Photo upload failed. Check your connection and try again.");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const makeMain = async (index: number) => {
    if (photoBusy || !profile) return;
    const photos = profile.photos ?? [];
    if (index <= 0 || index >= photos.length) return;
    setPhotoBusy(true);
    const next = [photos[index], ...photos.filter((_, i) => i !== index)];
    const ok = await savePhotos(next);
    showToast(ok ? "Main photo changed" : "Couldn't change the main photo. Try again.");
    setPhotoBusy(false);
  };

  const removePhoto = async (index: number) => {
    if (photoBusy || !profile) return;
    if (!window.confirm("Remove this photo?")) return;
    const photos = profile.photos ?? [];
    setPhotoBusy(true);
    const ok = await savePhotos(photos.filter((_, i) => i !== index));
    showToast(ok ? "Photo removed" : "Couldn't remove the photo. Try again.");
    setPhotoBusy(false);
  };

  /* ── editing ── */
  const startEdit = () => {
    if (!profile) return;
    setDraft({
      name:       profile.name ?? "",
      age:        profile.age ? String(profile.age) : "",
      location:   profile.location ?? "",
      occupation: profile.occupation ?? "",
      bio:        profile.bio ?? "",
      interests:  [...(profile.interests ?? [])],
      birthDate:  profile.birth_date ?? "",
      shoutout:   profile.birthday_shoutout !== false,
    });
    setFormError("");
    setNewInterest("");
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setDraft(null); setFormError(""); };

  const addInterest = (raw: string) => {
    const tag = raw.trim().slice(0, 30);
    if (!tag || !draft) return;
    if (draft.interests.some(t => t.toLowerCase() === tag.toLowerCase())) { setNewInterest(""); return; }
    if (draft.interests.length >= MAX_INTERESTS) { setFormError(`You can add up to ${MAX_INTERESTS} interests.`); return; }
    setFormError("");
    setDraft({ ...draft, interests: [...draft.interests, tag] });
    setNewInterest("");
  };

  const saveEdit = async () => {
    if (!uid || !draft) return;

    const name      = draft.name.trim();
    const birthDate = draft.birthDate.trim();
    let age         = Number(draft.age);
    if (!name) { setFormError("Enter your name."); return; }
    if (birthDate) {
      const birthError = validateBirthDate(birthDate);
      if (birthError) { setFormError(birthError); return; }
      age = ageFromBirthDate(birthDate) ?? age;   // age is worked out from the birthday
    } else if (!Number.isInteger(age) || age < 18 || age > 99) {
      setFormError("Age must be a number between 18 and 99.");
      return;
    }
    if (draft.bio.length > BIO_MAX) { setFormError(`Your bio can be up to ${BIO_MAX} characters.`); return; }

    // Only send the birthday columns when they changed, so saving still works before birthdays.sql has been run.
    const birthChanged =
      birthDate !== (profile?.birth_date ?? "") ||
      draft.shoutout !== (profile?.birthday_shoutout !== false);

    const payload: Record<string, unknown> = {
      name,
      age,
      location:   draft.location.trim(),
      occupation: draft.occupation.trim(),
      bio:        draft.bio.trim(),
      interests:  draft.interests,
    };
    if (birthChanged) {
      payload.birth_date        = birthDate || null;
      payload.birthday_shoutout = draft.shoutout;
    }

    setSaving(true);
    setFormError("");
    const { error } = await supabase.from("profiles").update(payload).eq("id", uid);

    if (error) {
      console.error("Saving profile failed:", {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
        name: (error as any).name,
      });
      setFormError(
        /birth/i.test(error.message ?? "")
          ? "Birthdays aren't set up yet. Run supabase/birthdays.sql in Supabase first."
          : `Your changes weren't saved: ${error.message || "unknown error"}`
      );
      setSaving(false);
      return;
    }

    // Birthday is today: make the shout-out now instead of waiting for tonight's job.
    if (birthDate && draft.shoutout && isBirthdayToday({ birth_date: birthDate, birthday_shoutout: draft.shoutout })) {
      const { error: postError } = await supabase.rpc("create_my_birthday_post");
      if (postError) console.error("Birthday shout-out failed:", postError);
    }
    await refreshProfile();
    setSaving(false);
    setEditing(false);
    setDraft(null);
    showToast("Profile saved");
  };

  const handleShare = async () => {
    if (!profile) return;
    const result = await shareProfile(profile.id, profile.name);
    if (result === "copied") showToast("Profile link copied");
    if (result === "failed") showToast("Couldn't share. Copy the link from the address bar of your profile.");
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  /* ── loading ── */
  if (authLoading || !profile) return (
    <div style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: colors.subtext, fontSize: 14 }}>Loading profile...</div>
      </div>
      <BottomNav />
    </div>
  );

  const photos    = profile.photos ?? [];
  const interests = profile.interests ?? [];
  const mainPic   = avatarUrl(photos[0] ?? profile.avatar_url);
  const premium   = isPremium(profile);
  const { percent, tips } = completeness(profile);

  const lightboxPhotos: string[] = photos.length
    ? photos.map(p => avatarUrl(p)).filter((u): u is string => !!u)
    : (profile.avatar_url ? [avatarUrl(profile.avatar_url)].filter((u): u is string => !!u) : []);

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", background: colors.card, border: `1px solid ${colors.border}`,
    borderRadius: 12, padding: "12px 14px", color: colors.text, fontSize: 15, outline: "none", fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: colors.subtext, marginBottom: 8 };

  const shell: React.CSSProperties = {
    minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg,
    fontFamily: "system-ui", display: "flex", flexDirection: "column", color: colors.text,
  };

  /* ───────────────────────── edit mode ───────────────────────── */
  if (editing && draft) return (
    <main style={shell}>
      <ProfileStyles />
      <Toast message={toast} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px", borderBottom: `1px solid ${colors.border}` }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>Edit profile</h1>
        <button type="button" className="sp-btn" onClick={cancelEdit} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 50, padding: "8px 18px", fontSize: 13, fontWeight: 600, color: colors.subtext, cursor: "pointer" }}>Cancel</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: `24px 20px ${BOTTOM_NAV_HEIGHT + 24}px`, display: "flex", flexDirection: "column", gap: 22 }}>

        <section aria-label="Photos">
          <span style={labelStyle}>Photos ({photos.length}/{MAX_PHOTOS}). The first one is your main photo.</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {photos.map((path, i) => {
              const url = avatarUrl(path);
              return (
                <div key={`${path}-${i}`} style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", background: colors.card }}>
                  {url && <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                  <button type="button" className="sp-btn" aria-label={`Remove photo ${i + 1}`} onClick={() => removePhoto(i)} disabled={photoBusy}
                    style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", border: 0, background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 13, cursor: "pointer" }}>✕</button>
                  {i === 0 ? (
                    <span style={{ position: "absolute", left: 6, bottom: 6, background: GOLD, color: "#000", borderRadius: 50, padding: "2px 9px", fontSize: 10.5, fontWeight: 800 }}>Main</span>
                  ) : (
                    <button type="button" className="sp-btn" onClick={() => makeMain(i)} disabled={photoBusy}
                      style={{ position: "absolute", left: 6, bottom: 6, background: "rgba(0,0,0,0.65)", color: "#fff", border: 0, borderRadius: 50, padding: "3px 9px", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>Make main</button>
                  )}
                </div>
              );
            })}
            {photos.length < MAX_PHOTOS && (
              <button type="button" className="sp-btn" onClick={() => fileRef.current?.click()} disabled={photoBusy}
                style={{ aspectRatio: "1", borderRadius: 12, background: colors.card, border: `1.5px dashed ${colors.border}`, color: colors.subtext, fontSize: photoBusy ? 12 : 28, cursor: "pointer" }}>
                {photoBusy ? "Uploading..." : "+"}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => addPhotos(e.target.files)} style={{ display: "none" }} />
        </section>

        <div>
          <label htmlFor="pf-name" style={labelStyle}>Name</label>
          <input id="pf-name" maxLength={40} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="pf-birth" style={labelStyle}>Birthday</label>
          <input
            id="pf-birth"
            type="date"
            min="1900-01-01"
            max={latestAdultBirthDate()}
            value={draft.birthDate}
            onChange={e => {
              const v = e.target.value;
              const worked = v ? ageFromBirthDate(v) : null;
              setDraft({ ...draft, birthDate: v, age: worked !== null && worked >= 0 ? String(worked) : draft.age });
            }}
            style={{ ...inputStyle, colorScheme: theme === "light" ? "light" : "dark" }}
          />
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 12, fontSize: 13.5, lineHeight: 1.45, color: colors.text, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={draft.shoutout}
              onChange={e => setDraft({ ...draft, shoutout: e.target.checked })}
              style={{ width: 18, height: 18, marginTop: 1, accentColor: GOLD, flexShrink: 0 }}
            />
            <span>Post a birthday shout-out for me on my birthday.</span>
          </label>
        </div>
        <div>
          <label htmlFor="pf-age" style={labelStyle}>Age{draft.birthDate ? " (worked out from your birthday)" : ""}</label>
          <input id="pf-age" inputMode="numeric" maxLength={2} readOnly={!!draft.birthDate} value={draft.age} onChange={e => setDraft({ ...draft, age: e.target.value.replace(/\D/g, "") })} style={{ ...inputStyle, opacity: draft.birthDate ? 0.7 : 1 }} />
        </div>
        <div>
          <label htmlFor="pf-loc" style={labelStyle}>Location</label>
          <input id="pf-loc" maxLength={60} value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="pf-job" style={labelStyle}>Occupation</label>
          <input id="pf-job" maxLength={60} value={draft.occupation} onChange={e => setDraft({ ...draft, occupation: e.target.value })} style={inputStyle} />
        </div>

        <div>
          <label htmlFor="pf-bio" style={labelStyle}>Bio</label>
          <textarea id="pf-bio" rows={4} value={draft.bio} onChange={e => setDraft({ ...draft, bio: e.target.value.slice(0, BIO_MAX) })}
            style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }} />
          <div style={{ textAlign: "right", fontSize: 12, color: colors.subtext, marginTop: 6 }}>{draft.bio.length}/{BIO_MAX}</div>
        </div>

        <div>
          <span style={labelStyle}>Interests ({draft.interests.length}/{MAX_INTERESTS})</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {draft.interests.map((tag, i) => (
              <button key={`${tag}-${i}`} type="button" className="sp-btn" aria-label={`Remove ${tag}`}
                onClick={() => setDraft({ ...draft, interests: draft.interests.filter((_, j) => j !== i) })}
                style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", color: colors.text, borderRadius: 50, padding: "6px 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {tag}<span aria-hidden="true" style={{ marginLeft: 7, opacity: 0.6 }}>×</span>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newInterest} onChange={e => setNewInterest(e.target.value)} maxLength={30} placeholder="Add an interest"
              aria-label="New interest"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addInterest(newInterest); } }}
              style={{ ...inputStyle, flex: 1, width: "auto", padding: "11px 14px", fontSize: 14 }} />
            <button type="button" className="sp-btn" onClick={() => addInterest(newInterest)}
              style={{ background: GOLD, border: 0, borderRadius: 12, padding: "0 18px", fontWeight: 800, color: "#000", cursor: "pointer", fontSize: 14 }}>Add</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {INTEREST_SUGGESTIONS.filter(s => !draft.interests.some(t => t.toLowerCase() === s.toLowerCase())).map(s => (
              <button key={s} type="button" className="sp-btn" onClick={() => addInterest(s)}
                style={{ background: colors.card, border: `1px solid ${colors.border}`, color: colors.subtext, borderRadius: 50, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ {s}</button>
            ))}
          </div>
        </div>

        {formError && <p role="alert" style={{ margin: 0, color: "#FF6B88", fontSize: 13.5, lineHeight: 1.4 }}>{formError}</p>}

        <button type="button" className="sp-btn" onClick={saveEdit} disabled={saving}
          style={{ width: "100%", background: GOLD, border: 0, borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 800, color: "#000", cursor: "pointer" }}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <BottomNav />
    </main>
  );

  /* ───────────────────────── view mode ───────────────────────── */
  const tabs: { id: TabId; label: string }[] = [
    { id: "photos", label: `Photos ${photos.length}` },
    { id: "posts",  label: `Posts ${stats.posts}` },
    { id: "about",  label: "About" },
  ];

  const addTile = photos.length < MAX_PHOTOS ? (
    <button type="button" className="sp-tile" onClick={() => fileRef.current?.click()} disabled={photoBusy} aria-label="Add photos"
      style={{ aspectRatio: "1", borderRadius: 12, background: colors.card, border: `1.5px dashed ${colors.border}`, color: colors.subtext, fontSize: photoBusy ? 12 : 28, cursor: "pointer" }}>
      {photoBusy ? "Uploading..." : "+"}
    </button>
  ) : null;

  return (
    <main style={shell}>
      <ProfileStyles />
      <Toast message={toast} />
      <Header />

      {lightboxIndex !== null && lightboxPhotos.length > 0 && (
        <ImageLightbox photos={lightboxPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      {listModal && (
        <div onClick={() => setListModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div role="dialog" aria-modal="true" aria-label={listModal} onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 430, maxHeight: "70vh", background: colors.card, borderRadius: "24px 24px 0 0", padding: "20px 20px 40px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: colors.text, textTransform: "capitalize", margin: 0 }}>{listModal}</h2>
              <button type="button" className="sp-btn" aria-label="Close" onClick={() => setListModal(null)} style={{ background: colors.bg, border: 0, borderRadius: 50, width: 34, height: 34, fontSize: 15, color: colors.subtext, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {listLoading ? (
                <div style={{ fontSize: 13, color: colors.subtext, textAlign: "center", padding: 20 }}>Loading...</div>
              ) : listProfiles.length === 0 ? (
                <div style={{ fontSize: 13, color: colors.subtext, textAlign: "center", padding: 20 }}>Nobody here yet.</div>
              ) : listProfiles.map(p => {
                const photo = avatarUrl(p.photos?.[0] ?? p.avatar_url);
                return (
                  <button key={p.id} type="button" className="sp-btn" onClick={() => { setListModal(null); router.push(`/profile/${p.id}`); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 4px", background: "none", border: 0, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: colors.bg, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 18, fontWeight: 900, color: GOLD }}>{(p.name || "?").charAt(0).toUpperCase()}</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{p.name}</div>
                      {p.location && <div style={{ fontSize: 12, color: colors.subtext }}>{p.location}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: BOTTOM_NAV_HEIGHT + 16 }}>

        <SoulCloth seed={profile.id} strips={clothStripCount(interests.length)} />

        <section style={{ padding: "0 20px" }}>
          <div style={{ marginTop: -52, position: "relative", zIndex: 2 }}>
            <Avatar src={mainPic} name={profile.name} size={104} online />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                {profile.name}{profile.occupation ? `, ${profile.occupation}` : ""}
              </h1>
              {premium && (
                <span style={{ background: GOLD, color: "#000", borderRadius: 50, padding: "2px 10px", fontSize: 11, fontWeight: 800 }}>Premium</span>
              )}
            </div>
            {profile.location && <p style={{ margin: "2px 0 0", fontSize: 13.5, color: colors.subtext }}>{profile.location}</p>}
            <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#22C55E", fontWeight: 600 }}>Online now</p>
          </div>

          {profile.bio && <p style={{ margin: "14px 0 0", fontSize: 14.5, lineHeight: 1.65, maxWidth: "46ch" }}>{profile.bio}</p>}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 20px", marginTop: 16 }}>
            <StatLink value={stats.followers} label="followers" onClick={() => openList("followers")} />
            <StatLink value={stats.following} label="following" onClick={() => openList("following")} />
            <StatLink value={stats.matches}   label="matches"   onClick={() => router.push("/chats")} />
            <StatLink value={stats.likes}     label="likes"     onClick={() => router.push("/likes")} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button type="button" className="sp-btn" onClick={startEdit}
              style={{ flex: 1, background: GOLD, border: 0, borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 800, color: "#000", cursor: "pointer" }}>Edit profile</button>
            <button type="button" className="sp-btn" onClick={handleShare}
              style={{ flex: 1, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700, color: colors.text, cursor: "pointer" }}>Share profile</button>
          </div>

          {isBirthdayToday(profile) && (
            <BirthdayCard name={profile.name} userId={profile.id} onMessage={showToast} />
          )}

          {!profile.birth_date && (
            <div style={{ marginTop: 18, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Add your birthday 🎂</div>
              <p style={{ margin: "4px 0 10px", fontSize: 13.5, lineHeight: 1.45, color: colors.subtext }}>
                We'll post a shout-out on your day so the community can celebrate you.
              </p>
              <button type="button" className="sp-link" onClick={startEdit}
                style={{ background: "none", border: 0, padding: 0, color: GOLD, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Add birthday
              </button>
            </div>
          )}

          {percent < 100 && (
            <div style={{ marginTop: 18, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Your cloth is {percent}% woven</div>
              <div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness"
                style={{ display: "flex", gap: 3, margin: "10px 0 12px" }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <span key={i} style={{ flex: 1, height: 8, borderRadius: 2, background: i < Math.round(percent / 10) ? `linear-gradient(90deg, ${CLOTH.gold}, ${CLOTH.camwood})` : colors.border }} />
                ))}
              </div>
              {tips[0] && (
                <button type="button" className="sp-link" onClick={startEdit}
                  style={{ background: "none", border: 0, padding: 0, color: GOLD, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Next: {tips[0]}
                </button>
              )}
            </div>
          )}

          <div style={{ marginTop: 18 }}><InviteCard /></div>

          {interests.length > 0 && <div style={{ marginTop: 18 }}><ThreadChips interests={interests} /></div>}
        </section>

        <div style={{ marginTop: 22, padding: "0 20px" }}>
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>

        <div style={{ padding: "16px 20px 0" }}>
          {activeTab === "photos" && (
            <>
              <PhotoMosaic
                photos={photos}
                onOpen={setLightboxIndex}
                trailing={addTile}
                emptyText="No photos yet"
              />
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => addPhotos(e.target.files)} style={{ display: "none" }} />
            </>
          )}

          {activeTab === "posts" && <PostsGrid posts={posts} loading={postsLoading} />}

          {activeTab === "about" && (
            <AboutList rows={[
              { label: "Age",          value: profile.age ? `${profile.age} years old` : "—" },
              { label: "Location",     value: profile.location || "—" },
              { label: "Occupation",   value: profile.occupation || "—" },
              { label: "Birthday",     value: birthdayLabel(profile.birth_date) },
              { label: "Looking for",  value: capitalize(profile.looking_for) },
              { label: "Gender",       value: capitalize(profile.gender) },
              { label: "Member since", value: memberSince(profile.created_at) },
            ]} />
          )}

          <div style={{ textAlign: "center", marginTop: 28 }}>
            <button type="button" className="sp-btn" onClick={handleSignOut}
              style={{ background: "rgba(255,51,102,0.12)", border: "1px solid rgba(255,51,102,0.25)", borderRadius: 50, padding: "10px 26px", fontSize: 13.5, fontWeight: 700, color: "#FF3366", cursor: "pointer" }}>Sign out</button>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}