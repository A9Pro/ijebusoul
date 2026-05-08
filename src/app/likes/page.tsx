"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import type { Profile } from "@/lib/types";

const BADGE: Record<string, { bg: string; color: string }> = {
  relationship: { bg: "rgba(255,51,102,0.2)",  color: "#FF3366" },
  casual:       { bg: "rgba(59,130,246,0.2)",   color: "#60A5FA" },
  friendship:   { bg: "rgba(212,175,55,0.2)",   color: "#D4AF37" },
  fwb:          { bg: "rgba(16,185,129,0.2)",   color: "#34D399" },
};

type LikeEntry = { profile: Profile; action: string; created_at: string; matched: boolean; passed: boolean };

export default function LikesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [likes, setLikes]       = useState<LikeEntry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter]     = useState<"all" | "new" | "matched">("all");
  const [toast, setToast]       = useState<{ msg: string; color: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetching(true);

      // People who liked me
      const { data: rawLikes } = await supabase
        .from("swipes")
        .select("swiper_id, action, created_at")
        .eq("swiped_id", user.id)
        .in("action", ["like", "superlike"])
        .order("created_at", { ascending: false });

      if (!rawLikes?.length) { setLikes([]); setFetching(false); return; }

      // Get their profiles
      const ids = rawLikes.map(l => l.swiper_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
      const profileMap: Record<string, Profile> = {};
      profiles?.forEach(p => { profileMap[p.id] = p as Profile; });

      // Check existing matches
      const { data: myMatches } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      const matchedIds = new Set<string>();
      myMatches?.forEach(m => {
        matchedIds.add(m.user1_id === user.id ? m.user2_id : m.user1_id);
      });

      setLikes(
        rawLikes
          .map(l => ({
            profile:    profileMap[l.swiper_id],
            action:     l.action,
            created_at: l.created_at,
            matched:    matchedIds.has(l.swiper_id),
            passed:     false,
          }))
          .filter(l => l.profile)
      );

      setFetching(false);
    })();
  }, [user]);

  const showToast = (msg: string, color: string) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 1400);
  };

  const handleLikeBack = async (entry: LikeEntry) => {
    if (!user) return;

    // 1. Record the swipe
    await supabase.from("swipes").insert({
      swiper_id: user.id,
      swiped_id: entry.profile.id,
      action:    "like",
    });

    // 2. Create a match record (user1 = lower id alphabetically for uniqueness)
    const [u1, u2] = [user.id, entry.profile.id].sort();
    await supabase.from("matches").insert({
      user1_id:   u1,
      user2_id:   u2,
      created_at: new Date().toISOString(),
    });

    setLikes(l => l.map(e =>
      e.profile.id === entry.profile.id ? { ...e, matched: true } : e
    ));
    showToast("It's a match! 🎉", "#D4AF37");
  };

  const handlePass = (entry: LikeEntry) => {
    setLikes(l => l.map(e =>
      e.profile.id === entry.profile.id ? { ...e, passed: true } : e
    ));
  };

  const visible  = likes.filter(e =>
    filter === "new"     ? !e.matched && !e.passed :
    filter === "matched" ? e.matched :
    !e.passed
  );
  const newCount = likes.filter(e => !e.matched && !e.passed).length;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60)   return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  if (authLoading || fetching) return (
    <div style={{ minHeight: "100dvh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontFamily: "system-ui" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>💛</div>
        <div style={{ fontSize: 14 }}>Loading likes...</div>
      </div>
    </div>
  );

  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui", display: "flex", flexDirection: "column", color: "#fff", position: "relative" }}>

      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: toast.color, color: "#000", fontWeight: 800, fontSize: 15, padding: "12px 28px", borderRadius: 50, zIndex: 99, whiteSpace: "nowrap" }}>
          {toast.msg}
        </div>
      )}

      <div style={{ padding: "52px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em" }}>Likes</h1>
          {newCount > 0 && <div style={{ background: "#FF3366", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 50 }}>{newCount} new</div>}
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>People who liked your profile</p>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "0 20px 20px" }}>
        {(["all", "new", "matched"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? "#D4AF37" : "rgba(255,255,255,0.07)", border: filter === f ? "none" : "1px solid rgba(255,255,255,0.1)", borderRadius: 50, padding: "7px 18px", fontSize: 13, fontWeight: 700, color: filter === f ? "#000" : "rgba(255,255,255,0.5)", cursor: "pointer", textTransform: "capitalize" }}>{f}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {visible.length === 0 && (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 14, paddingTop: 60 }}>
            {filter === "new" ? "No new likes yet 👀" : filter === "matched" ? "No matches yet — like someone back!" : "Nothing here yet 👀"}
          </div>
        )}

        {visible.map(entry => {
          const p     = entry.profile;
          const badge = BADGE[p.looking_for ?? ""] ?? BADGE.relationship;
          const photo = avatarUrl(p.photos?.[0] ?? p.avatar_url);

          return (
            <div key={p.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 16px 12px" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 62, height: 62, borderRadius: "50%", background: "#1a1a1a", overflow: "hidden", border: entry.matched ? "3px solid #D4AF37" : "3px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ fontSize: 28 }}>🙂</span>}
                  </div>
                  {entry.matched && (
                    <div style={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20, borderRadius: "50%", background: "#D4AF37", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, border: "2px solid #0a0a0a" }}>✓</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 800 }}>{p.name}, {p.age}</span>
                      {p.looking_for && (
                        <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50 }}>
                          {p.looking_for.charAt(0).toUpperCase() + p.looking_for.slice(1)}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{timeAgo(entry.created_at)}</span>
                  </div>
                  {p.location && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>📍 {p.location}</div>}
                  {p.bio && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.bio}</p>}
                </div>
              </div>

              {!entry.matched ? (
                <div style={{ display: "flex", gap: 10, padding: "0 16px 16px" }}>
                  <button onClick={() => handlePass(entry)} style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "11px 0", color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Pass</button>
                  <button onClick={() => handleLikeBack(entry)} style={{ flex: 2, background: "#D4AF37", border: "none", borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 800, color: "#000", cursor: "pointer" }}>❤️ Like back</button>
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