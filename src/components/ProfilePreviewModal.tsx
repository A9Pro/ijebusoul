"use client";
import { useRouter } from "next/navigation";
import { avatarUrl } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";
import type { Profile } from "@/lib/types";

export default function ProfilePreviewModal({ profile, onClose }: { profile: Profile | null; onClose: () => void }) {
  const router = useRouter();
  const { colors } = useTheme();

  if (!profile) return null;
  const photo = avatarUrl(profile.photos?.[0] ?? profile.avatar_url);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, background: colors.card, borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: colors.bg, border: "none", borderRadius: 50, width: 32, height: 32, fontSize: 15, color: colors.subtext, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: colors.bg, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #D4AF37" }}>
            {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={profile.name} /> : <span style={{ fontSize: 44 }}>🙂</span>}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: colors.text, letterSpacing: "-0.02em" }}>{profile.name}{profile.age ? `, ${profile.age}` : ""}</div>
            {profile.location && <div style={{ fontSize: 13, color: colors.subtext, marginTop: 4 }}>📍 {profile.location}</div>}
          </div>
          {profile.bio && <p style={{ fontSize: 13, color: colors.subtext, lineHeight: 1.55, maxWidth: 320 }}>{profile.bio}</p>}
          {(profile.interests as string[])?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {(profile.interests as string[]).slice(0, 6).map((tag, i) => (
                <div key={i} style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", color: "#D4AF37", borderRadius: 50, padding: "4px 12px", fontSize: 11, fontWeight: 600 }}>{tag}</div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => { onClose(); router.push(`/profile/${profile.id}`); }}
          style={{ width: "100%", background: "#D4AF37", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 14, fontWeight: 800, color: "#000", cursor: "pointer" }}
        >
          View full profile →
        </button>
      </div>
    </div>
  );
}