"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

const LIKED_YOU = [
  { id: 1, name: "Segun",  age: 30, location: "Sagamu",    distance: "8km",  bio: "Engineer by day, chef by night 🍳 Fluent in Ijebu proverbs and bad jokes.", bg: "#D0E8FF", emoji: "👨🏿", lookingFor: "Casual",       time: "2m ago"     },
  { id: 2, name: "Femi",   age: 28, location: "Ago-Iwoye", distance: "22km", bio: "No pressure, good vibes only ✌🏾 Ijebu blood runs deep.",                   bg: "#FEF3C7", emoji: "🧑🏾", lookingFor: "FWB",          time: "1h ago"     },
  { id: 3, name: "Dare",   age: 32, location: "Ijebu Ode", distance: "4km",  bio: "History nerd meets music lover. Let's talk culture over suya 🔥",            bg: "#FFE4CC", emoji: "👨🏾", lookingFor: "Relationship", time: "3h ago"     },
  { id: 4, name: "Bode",   age: 27, location: "Ijebu Igbo",distance: "14km", bio: "Sunday jollof or weekday amala? Both. Always both. 😂",                      bg: "#D1FAE5", emoji: "👨🏾", lookingFor: "Friendship",   time: "Yesterday"  },
  { id: 5, name: "Kolade", age: 29, location: "Odogbolu",  distance: "31km", bio: "Architect, foodie, weekend footballer. Ijebu pride ⚽",                       bg: "#EDE9FF", emoji: "👨🏿", lookingFor: "Relationship", time: "2 days ago" },
];

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  Relationship: { bg: "rgba(255,51,102,0.2)", color: "#FF3366" },
  Casual:       { bg: "rgba(59,130,246,0.2)", color: "#60A5FA" },
  Friendship:   { bg: "rgba(212,175,55,0.2)", color: "#D4AF37" },
  FWB:          { bg: "rgba(16,185,129,0.2)", color: "#34D399" },
};

type LikeEntry = typeof LIKED_YOU[number] & { matched: boolean; passed: boolean };

export default function LikesPage() {
  const router = useRouter();
  const [likes, setLikes]   = useState<LikeEntry[]>(LIKED_YOU.map((p) => ({ ...p, matched: false, passed: false })));
  const [toast, setToast]   = useState<{ msg: string; color: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "matched">("all");

  const showToast   = (msg: string, color: string) => { setToast({ msg, color }); setTimeout(() => setToast(null), 1400); };
  const handleMatch = (id: number) => { setLikes((l) => l.map((p) => p.id === id ? { ...p, matched: true } : p)); showToast("It's a match! 🎉", "#D4AF37"); };
  const handlePass  = (id: number) =>   setLikes((l) => l.map((p) => p.id === id ? { ...p, passed: true }  : p));

  const visible  = likes.filter((p) => filter === "new" ? !p.matched && !p.passed : filter === "matched" ? p.matched : !p.passed);
  const newCount = likes.filter((p) => !p.matched && !p.passed).length;

  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", color: "#fff", position: "relative" }}>

      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: toast.color, color: "#000", fontWeight: 800, fontSize: 15, padding: "12px 28px", borderRadius: 50, zIndex: 99, whiteSpace: "nowrap" }}>{toast.msg}</div>
      )}

      <div style={{ padding: "52px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em" }}>Likes</h1>
          {newCount > 0 && <div style={{ background: "#FF3366", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 50 }}>{newCount} new</div>}
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>People who liked your profile</p>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "0 20px 20px" }}>
        {(["all", "new", "matched"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "#D4AF37" : "rgba(255,255,255,0.07)", border: filter === f ? "none" : "1px solid rgba(255,255,255,0.1)", borderRadius: 50, padding: "7px 18px", fontSize: 13, fontWeight: 700, color: filter === f ? "#000" : "rgba(255,255,255,0.5)", cursor: "pointer", textTransform: "capitalize" }}>{f}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {visible.length === 0 && <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 14, paddingTop: 60 }}>Nothing here yet 👀</div>}

        {visible.map((p) => {
          const badge = BADGE_COLORS[p.lookingFor] ?? BADGE_COLORS.Casual;
          return (
            <div key={p.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 16px 12px" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 62, height: 62, borderRadius: "50%", background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, border: p.matched ? "3px solid #D4AF37" : "3px solid rgba(255,255,255,0.08)" }}>{p.emoji}</div>
                  {p.matched && <div style={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20, borderRadius: "50%", background: "#D4AF37", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, border: "2px solid #0a0a0a" }}>✓</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 800 }}>{p.name}, {p.age}</span>
                      <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50 }}>{p.lookingFor}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{p.time}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>📍 {p.location} · {p.distance}</div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.bio}</p>
                </div>
              </div>

              {!p.matched ? (
                <div style={{ display: "flex", gap: 10, padding: "0 16px 16px" }}>
                  <button onClick={() => handlePass(p.id)}  style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "11px 0", color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Pass</button>
                  <button onClick={() => handleMatch(p.id)} style={{ flex: 2, background: "#D4AF37", border: "none", borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 800, color: "#000", cursor: "pointer" }}>❤️ Like back</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, padding: "0 16px 16px" }}>
                  <div style={{ flex: 1, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 12, padding: "10px 0", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#D4AF37" }}>🎉 Matched!</div>
                  <button onClick={() => router.push("/chats")} style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 0", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>💬 Message</button>
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