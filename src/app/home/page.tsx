"use client";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";

const PROFILES = [
  { id: 1, name: "Adunola", age: 26, location: "Ijebu Ode", distance: "2km", lookingFor: "Relationship", lookingForEmoji: "💍", bio: "Ijebu girl through and through 🌺 I love suya nights, beach trips and deep convos. Looking for something real.", bg: "#FFDEE9", emoji: "👩🏾" },
  { id: 2, name: "Segun",   age: 30, location: "Sagamu",    distance: "8km",  lookingFor: "Casual",       lookingForEmoji: "🌊", bio: "Engineer by day, chef by night 🍳 Fluent in Ijebu proverbs and bad jokes. Swipe right if you can handle both.", bg: "#D0E8FF", emoji: "👨🏿" },
  { id: 3, name: "Temi",    age: 24, location: "Ijebu Igbo",distance: "14km", lookingFor: "Friendship",   lookingForEmoji: "☕", bio: "Creative, loud, unapologetically Ijebu 💛 Looking for my person or at least someone to eat pounded yam with.", bg: "#D1FAE5", emoji: "👩🏿" },
  { id: 4, name: "Femi",    age: 28, location: "Ago-Iwoye", distance: "22km", lookingFor: "FWB",          lookingForEmoji: "🤙🏾", bio: "No pressure, good vibes only ✌🏾 I work hard and play harder. Ijebu blood runs deep.", bg: "#FEF3C7", emoji: "🧑🏾" },
  { id: 5, name: "Kemi",    age: 25, location: "Odogbolu",  distance: "31km", lookingFor: "Relationship", lookingForEmoji: "💍", bio: "Yoruba girl with Lagos energy 🔥 Love art, music and long walks through Ijebu markets on Saturdays.", bg: "#EDE9FF", emoji: "👩🏾" },
];

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  Relationship: { bg: "rgba(255,51,102,0.25)", color: "#FF3366" },
  Casual:       { bg: "rgba(96,165,250,0.25)",  color: "#60A5FA" },
  Friendship:   { bg: "rgba(212,175,55,0.25)",  color: "#D4AF37" },
  FWB:          { bg: "rgba(52,211,153,0.25)",  color: "#34D399" },
};

type ActionToast = { label: string; color: string } | null;

export default function HomePage() {
  const [index, setIndex] = useState(0);
  const [toast, setToast]  = useState<ActionToast>(null);
  const [saved, setSaved]  = useState<number[]>([]);

  const profile = PROFILES[index];
  const badge   = BADGE_COLORS[profile.lookingFor];

  const showToast = (label: string, color: string) => {
    setToast({ label, color });
    setTimeout(() => setToast(null), 1200);
  };

  const advance = () => setIndex((i) => (i < PROFILES.length - 1 ? i + 1 : 0));

  const handlePass      = () => { showToast("Passed", "#888");             setTimeout(advance, 350); };
  const handleLike      = () => { showToast("Liked! 💛", "#D4AF37");       setTimeout(advance, 350); };
  const handleSuperLike = () => { showToast("Super Liked! ⭐", "#60A5FA"); setTimeout(advance, 350); };
  const handleSave      = () => { setSaved((s) => s.includes(profile.id) ? s : [...s, profile.id]); showToast("Saved 🔖", "#A78BFA"); };
  const handleMessage   = () => showToast("Message sent! 💬", "#34D399");

  return (
    <main style={{ minHeight: "100dvh", width: "100%", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", flexDirection: "column" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 20px 12px", background: "#0a0a0a", zIndex: 10 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>
          ìjèbú<span style={{ color: "#D4AF37" }}>soul</span>
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: "pointer" }}>🔔</button>
          <button style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: "pointer" }}>👤</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 20px 12px" }}>
        {PROFILES.map((_, i) => (
          <div key={i} style={{ width: i === index ? 22 : 6, height: 6, borderRadius: 3, background: i === index ? "#D4AF37" : "rgba(255,255,255,0.15)", transition: "width 0.3s ease" }} />
        ))}
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginLeft: 6, fontWeight: 500 }}>{PROFILES.length - index} near you</span>
      </div>

      <div style={{ flex: 1, padding: "0 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ position: "relative", borderRadius: 28, overflow: "hidden", background: profile.bg, flex: 1, minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>

          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 160 }}>{profile.emoji}</div>

          {toast && (
            <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)", background: toast.color, color: "#fff", fontSize: 17, fontWeight: 800, padding: "12px 28px", borderRadius: 50, whiteSpace: "nowrap", zIndex: 20 }}>{toast.label}</div>
          )}

          {saved.includes(profile.id) && (
            <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, background: "rgba(167,139,250,0.85)", borderRadius: 50, padding: "5px 14px", fontSize: 12, fontWeight: 700, color: "#fff" }}>🔖 Saved</div>
          )}

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)", padding: "60px 20px 20px", zIndex: 5 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>{profile.name}</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{profile.age}</span>
              </div>
              <span style={{ background: badge.bg, color: badge.color, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 50, border: `1px solid ${badge.color}40` }}>{profile.lookingForEmoji} {profile.lookingFor}</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>📍 {profile.location} · {profile.distance} away</div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.55, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{profile.bio}</p>
            <button onClick={handleMessage} style={{ width: "100%", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "12px 0", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>💬 Send a message</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "4px 0 8px" }}>
          <button onClick={handlePass}      style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>👎</button>
          <button onClick={handleSuperLike} style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(96,165,250,0.12)", border: "1.5px solid rgba(96,165,250,0.3)", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⭐</button>
          <button onClick={handleLike}      style={{ width: 68, height: 68, borderRadius: "50%", background: "#D4AF37", border: "none", fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>❤️</button>
          <button onClick={handleSave}      style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(167,139,250,0.12)", border: "1.5px solid rgba(167,139,250,0.3)", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🔖</button>
          <button onClick={() => { showToast("⚡ Boost!", "#FF3366"); setTimeout(advance, 350); }} style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(255,51,102,0.1)", border: "1.5px solid rgba(255,51,102,0.25)", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⚡</button>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}