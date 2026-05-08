"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import type { Profile } from "@/lib/types";

const BADGE: Record<string, { bg: string; color: string; emoji: string }> = {
  relationship: { bg: "rgba(255,51,102,0.25)",  color: "#FF3366", emoji: "💍" },
  casual:       { bg: "rgba(96,165,250,0.25)",   color: "#60A5FA", emoji: "🌊" },
  friendship:   { bg: "rgba(212,175,55,0.25)",   color: "#D4AF37", emoji: "☕" },
  fwb:          { bg: "rgba(52,211,153,0.25)",   color: "#34D399", emoji: "🤙🏾" },
};

type Toast = { label: string; color: string } | null;

export default function HomePage() {
  const router = useRouter();
  const { user, profile: myProfile, loading: authLoading } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [index, setIndex]       = useState(0);
  const [toast, setToast]       = useState<Toast>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
    if (!authLoading && user && !myProfile) router.replace("/onboarding");
  }, [authLoading, user, myProfile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetching(true);
      const { data: swipes } = await supabase
        .from("swipes").select("swiped_id").eq("swiper_id", user.id);
      const swipedIds = swipes?.map(s => s.swiped_id) ?? [];

      let query = supabase.from("profiles").select("*").neq("id", user.id).limit(30);
      if (swipedIds.length > 0) query = query.not("id", "in", `(${swipedIds.join(",")})`);

      const { data } = await query;
      setProfiles((data as Profile[]) ?? []);
      setFetching(false);
    })();
  }, [user]);

  const showToast = (label: string, color: string) => {
    setToast({ label, color });
    setTimeout(() => setToast(null), 1200);
  };

  const advance = () => setIndex(i => i + 1);

  const swipe = async (action: "like" | "pass" | "superlike") => {
    if (!user || !current) return;
    await supabase.from("swipes").insert({ swiper_id: user.id, swiped_id: current.id, action });
    if (action === "like")      showToast("Liked! 💛", "#D4AF37");
    if (action === "pass")      showToast("Passed", "#888");
    if (action === "superlike") showToast("Super Liked! ⭐", "#60A5FA");
    setTimeout(advance, 350);
  };

  if (authLoading || fetching) return (
    <div style={{ minHeight: "100dvh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontFamily: "system-ui" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>✨</div>
        <div style={{ fontSize: 14 }}>Finding people near you...</div>
      </div>
    </div>
  );

  const current = profiles[index];

  if (!current) return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui", display: "flex", flexDirection: "column", color: "#fff" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "0 32px" }}>
        <div style={{ fontSize: 64 }}>👀</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, textAlign: "center", letterSpacing: "-0.02em" }}>You've seen everyone nearby</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>Check back soon — new people join daily.</p>
        <button onClick={() => setIndex(0)} style={{ background: "#D4AF37", border: "none", borderRadius: 50, padding: "12px 28px", fontSize: 14, fontWeight: 700, color: "#000", cursor: "pointer", marginTop: 8 }}>Refresh</button>
      </div>
      <BottomNav />
    </main>
  );

  const badge    = BADGE[current.looking_for ?? ""] ?? BADGE.relationship;
  const photoSrc = avatarUrl(current.photos?.[0] ?? current.avatar_url);

  return (
    <main style={{ minHeight: "100dvh", width: "100%", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui", display: "flex", flexDirection: "column" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 20px 12px", background: "#0a0a0a", zIndex: 10 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>ìjèbú<span style={{ color: "#D4AF37" }}>soul</span></span>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: "pointer" }}>🔔</button>
          <button onClick={() => router.push("/profile")} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: "pointer" }}>👤</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 20px 12px" }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>{profiles.length - index} profiles near you</span>
      </div>

      <div style={{ flex: 1, padding: "0 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ position: "relative", borderRadius: 28, overflow: "hidden", background: "#1a1a1a", flex: 1, minHeight: 500 }}>

          {photoSrc ? (
            <img src={photoSrc} alt={current.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 120 }}>🙂</div>
          )}

          {toast && (
            <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", background: toast.color, color: "#fff", fontSize: 17, fontWeight: 800, padding: "12px 28px", borderRadius: 50, whiteSpace: "nowrap", zIndex: 20 }}>{toast.label}</div>
          )}

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)", padding: "60px 20px 20px", zIndex: 5 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>{current.name}</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{current.age}</span>
              </div>
              <span style={{ background: badge.bg, color: badge.color, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 50, border: `1px solid ${badge.color}40` }}>
                {badge.emoji} {current.looking_for ? current.looking_for.charAt(0).toUpperCase() + current.looking_for.slice(1) : ""}
              </span>
            </div>
            {current.location && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>📍 {current.location}</div>}
            {current.bio && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.55, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{current.bio}</p>}
            <button onClick={() => router.push("/chats")} style={{ width: "100%", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "12px 0", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>💬 Send a message</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "4px 0 8px" }}>
          <button onClick={() => swipe("pass")}      style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>👎</button>
          <button onClick={() => swipe("superlike")} style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(96,165,250,0.12)", border: "1.5px solid rgba(96,165,250,0.3)", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⭐</button>
          <button onClick={() => swipe("like")}      style={{ width: 68, height: 68, borderRadius: "50%", background: "#D4AF37", border: "none", fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>❤️</button>
          <button onClick={advance}                  style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(167,139,250,0.12)", border: "1.5px solid rgba(167,139,250,0.3)", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🔖</button>
          <button onClick={() => swipe("like")}      style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(255,51,102,0.1)", border: "1.5px solid rgba(255,51,102,0.25)", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⚡</button>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}