"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import type { Profile } from "@/lib/types";

interface NotificationRow {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: "post_like" | "post_comment" | "swipe_like" | "match" | "message" | "follow";
  post_id: string | null;
  message_id: string | null;
  read: boolean;
  created_at: string;
  actor?: Profile | null;
}

const COPY: Record<NotificationRow["type"], (name: string) => string> = {
  post_like:    (name) => `${name} liked your post`,
  post_comment: (name) => `${name} commented on your post`,
  swipe_like:   (name) => `${name} liked your profile`,
  match:        (name) => `You and ${name} matched! 🎉`,
  message:      (name) => `${name} sent you a message`,
  follow:       (name) => `${name} started following you`,
};

const ICON: Record<NotificationRow["type"], string> = {
  post_like: "❤️",
  post_comment: "💬",
  swipe_like: "💛",
  match: "🎉",
  message: "✉️",
  follow: "➕",
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [fetching, setFetching] = useState(true);

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

  const handleClick = (n: NotificationRow) => {
    if (n.type === "post_like" || n.type === "post_comment") router.push("/feed");
    else if (n.type === "swipe_like") router.push("/likes");
    else if (n.type === "match" || n.type === "message") router.push("/chats");
    else if (n.type === "follow") router.push("/feed");
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
    <div style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔔</div>
          <div style={{ fontSize: 14 }}>Loading notifications...</div>
        </div>
      </div>
      <BottomNav />
    </div>
  );

  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui", color: "#fff" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "52px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => router.back()} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 16, cursor: "pointer" }}>←</button>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", flex: 1 }}>Notifications</h1>
        <button onClick={() => router.push("/notifications/settings")} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 15, cursor: "pointer" }}>⚙️</button>
      </div>

      <div style={{ padding: "12px 16px 100px" }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 14, paddingTop: 80 }}>
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
                  onClick={() => handleClick(n)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 10px", borderRadius: 14, cursor: "pointer",
                    background: n.read ? "transparent" : "rgba(212,175,55,0.06)",
                  }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#1a1a1a", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span style={{ fontSize: 22 }}>🙂</span>}
                    </div>
                    <span style={{ position: "absolute", bottom: -2, right: -2, fontSize: 16, background: "#0a0a0a", borderRadius: "50%" }}>{ICON[n.type]}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: "#fff", fontWeight: n.read ? 500 : 700 }}>{COPY[n.type](name)}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{timeAgo(n.created_at)}</div>
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