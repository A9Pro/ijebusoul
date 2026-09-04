"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import ProfilePreviewModal from "@/components/ProfilePreviewModal";
import type { Profile } from "@/lib/types";

interface NotificationRow {
  id: string;
  actor_id: string | null;
  type: "post_like" | "post_comment" | "swipe_like" | "match" | "message" | "follow";
  post_id: string | null;
  read: boolean;
  created_at: string;
  actor?: Profile | null;
}

const COPY: Record<NotificationRow["type"], (name: string) => string> = {
  post_like:    (n) => `${n} liked your post`,
  post_comment: (n) => `${n} commented on your post`,
  swipe_like:   (n) => `${n} liked your profile`,
  match:        (n) => `You and ${n} matched! 🎉`,
  message:      (n) => `${n} sent you a message`,
  follow:       (n) => `${n} started following you`,
};

const ICON: Record<NotificationRow["type"], string> = {
  post_like: "❤️", post_comment: "💬", swipe_like: "💛", match: "🎉", message: "✉️", follow: "➕",
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { colors } = useTheme();

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [fetching, setFetching]           = useState(true);
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetching(true);
      const { data } = await supabase
        .from("notifications")
        .select("*, actor:profiles!notifications_actor_id_fkey(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications((data as NotificationRow[]) ?? []);
      setFetching(false);

      const unreadIds = (data ?? []).filter((n: NotificationRow) => !n.read).map((n: NotificationRow) => n.id);
      if (unreadIds.length) {
        await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
      }
    })();
  }, [user]);

  const goToTarget = (n: NotificationRow) => {
    if (n.type === "post_like" || n.type === "post_comment") router.push("/feed");
    else if (n.type === "swipe_like") router.push("/likes");
    else if (n.type === "match" || n.type === "message") router.push("/chats");
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)    return "Just now";
    if (mins < 60)   return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  if (authLoading || fetching) return (
    <div style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: colors.subtext }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔔</div>
          <div style={{ fontSize: 14 }}>Loading notifications...</div>
        </div>
      </div>
      <BottomNav />
    </div>
  );

  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", color: colors.text, display: "flex", flexDirection: "column" }}>
      <Header />

      {previewProfile && <ProfilePreviewModal profile={previewProfile} onClose={() => setPreviewProfile(null)} />}

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 20px 16px", borderBottom: `1px solid ${colors.border}` }}>
        <button onClick={() => router.back()} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "50%", width: 36, height: 36, color: colors.text, fontSize: 16, cursor: "pointer" }}>←</button>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", flex: 1 }}>Notifications</h1>
      </div>

      <div style={{ padding: "12px 16px 100px", flex: 1, overflowY: "auto" }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: "center", color: colors.subtext, fontSize: 14, paddingTop: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
            Nothing yet — activity on your posts and profile will show up here.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {notifications.map(n => {
              const photo = avatarUrl(n.actor?.photos?.[0] ?? n.actor?.avatar_url);
              const name  = n.actor?.name ?? "Someone";
              return (
                <div
                  key={n.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 10px", borderRadius: 14,
                    background: n.read ? "transparent" : "rgba(212,175,55,0.06)",
                  }}
                >
                  <div
                    onClick={() => n.actor && setPreviewProfile(n.actor)}
                    style={{ position: "relative", flexShrink: 0, cursor: n.actor ? "pointer" : "default" }}
                  >
                    <div style={{ width: 46, height: 46, borderRadius: "50%", background: colors.bg, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ fontSize: 22 }}>🙂</span>}
                    </div>
                    <span style={{ position: "absolute", bottom: -2, right: -2, fontSize: 16, background: colors.bg, borderRadius: "50%" }}>{ICON[n.type]}</span>
                  </div>
                  <div onClick={() => goToTarget(n)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                    <div style={{ fontSize: 14, color: colors.text, fontWeight: n.read ? 500 : 700 }}>{COPY[n.type](name)}</div>
                    <div style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4AF37", flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}