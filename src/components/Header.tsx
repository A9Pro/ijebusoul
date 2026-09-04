"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme, type Theme } from "@/context/ThemeContext";
import ProfilePreviewModal from "@/components/ProfilePreviewModal";
import type { Profile } from "@/lib/types";

interface NotificationRow {
  id: string;
  actor_id: string | null;
  type: "post_like" | "post_comment" | "swipe_like" | "match" | "message" | "follow";
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
  post_like: "❤️", post_comment: "💬", swipe_like: "💛",
  match: "🎉", message: "✉️", follow: "➕",
};

const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
};

export default function Header() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme, colors } = useTheme();

  const [notifOpen, setNotifOpen]   = useState(false);
  const [themeOpen, setThemeOpen]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [notifLoading, setNotifLoading]   = useState(false);
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
      if (themeRef.current && !themeRef.current.contains(t)) setThemeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadCount(count ?? 0);
    })();

    const channel = supabase
      .channel(`header-notifications:${user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => setUnreadCount(c => c + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const openNotifications = async () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    setThemeOpen(false);
    if (!opening || !user) return;

    setNotifLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*, actor:profiles!notifications_actor_id_fkey(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setNotifications((data as NotificationRow[]) ?? []);
    setNotifLoading(false);

    if (unreadCount > 0) {
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
      setUnreadCount(0);
    }
  };

  const goToTarget = (n: NotificationRow) => {
    setNotifOpen(false);
    if (n.type === "post_like" || n.type === "post_comment") router.push("/feed");
    else if (n.type === "swipe_like") router.push("/likes");
    else if (n.type === "match" || n.type === "message") router.push("/chats");
  };

  const THEME_OPTIONS: { id: Theme; label: string; icon: string; desc: string }[] = [
    { id: "light", label: "Light",     icon: "☀️", desc: "Clean & bright" },
    { id: "dark",  label: "Dark",      icon: "🌙", desc: "Easy on the eyes" },
    { id: "blue",  label: "Dark Blue", icon: "🌌", desc: "Midnight vibe" },
  ];

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 40,
      width: "100%", maxWidth: 430, margin: "0 auto",
      background: colors.bg, borderBottom: `1px solid ${colors.border}`,
      fontFamily: "system-ui",
    }}>
      {previewProfile && <ProfilePreviewModal profile={previewProfile} onClose={() => setPreviewProfile(null)} />}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>

        <div onClick={() => router.push("/home")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <IjebuSoulLogo accent={colors.accent} stroke={colors.text} />
          <span style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-0.02em", color: colors.text }}>
            ìjèbú<span style={{ color: colors.accent }}>soul</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

          <div ref={notifRef} style={{ position: "relative" }}>
            <button onClick={openNotifications} style={{
              width: 36, height: 36, borderRadius: "50%",
              background: colors.card, border: `1px solid ${colors.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, cursor: "pointer", position: "relative",
            }}>
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: -2, right: -2, minWidth: 16, height: 16,
                  borderRadius: 50, background: "#FF3366", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 9,
                  fontWeight: 800, color: "#fff", padding: "0 3px",
                }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div style={{
                position: "absolute", right: 0, top: 44, width: 300, maxHeight: 400,
                borderRadius: 16, overflow: "hidden", background: colors.card,
                border: `1px solid ${colors.border}`, boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
                display: "flex", flexDirection: "column",
              }}>
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: colors.text }}>Notifications</div>
                  <div style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>Your latest activity</div>
                </div>

                <div style={{ overflowY: "auto", maxHeight: 300 }}>
                  {notifLoading ? (
                    <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: colors.subtext }}>Loading...</div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: colors.subtext }}>Nothing yet</div>
                  ) : notifications.map(n => {
                    const photo = n.actor ? avatarUrl(n.actor.photos?.[0] ?? n.actor.avatar_url) : null;
                    const name  = n.actor?.name ?? "Someone";
                    return (
                      <div key={n.id} style={{
                        display: "flex", gap: 10, alignItems: "center", padding: "12px 16px",
                        borderBottom: `1px solid ${colors.border}`,
                        background: n.read ? "transparent" : `${colors.accent}10`,
                      }}>
                        <div
                          onClick={() => n.actor && setPreviewProfile(n.actor)}
                          style={{ width: 32, height: 32, borderRadius: "50%", background: colors.bg, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: n.actor ? "pointer" : "default" }}
                        >
                          {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span>{ICON[n.type]}</span>}
                        </div>
                        <div onClick={() => goToTarget(n)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                          <div style={{ fontSize: 12.5, color: colors.text, lineHeight: 1.4 }}>{COPY[n.type](name)}</div>
                          <div style={{ fontSize: 10, color: colors.subtext, marginTop: 2 }}>{timeAgo(n.created_at)} ago</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => { setNotifOpen(false); router.push("/notifications"); }} style={{
                  padding: "13px 0", textAlign: "center", fontSize: 13, fontWeight: 700,
                  color: colors.accent, background: "none", border: "none", cursor: "pointer",
                  borderTop: `1px solid ${colors.border}`,
                }}>
                  View all notifications
                </button>
              </div>
            )}
          </div>

          <div ref={themeRef} style={{ position: "relative" }}>
            <button onClick={() => { setThemeOpen(!themeOpen); setNotifOpen(false); }} style={{
              height: 36, display: "flex", alignItems: "center", gap: 5,
              padding: "0 12px", borderRadius: 50, background: colors.card,
              border: `1px solid ${colors.border}`, color: colors.text,
              fontSize: 14, cursor: "pointer",
            }}>
              {THEME_OPTIONS.find(o => o.id === theme)?.icon}
              <span style={{ fontSize: 10 }}>▾</span>
            </button>

            {themeOpen && (
              <div style={{
                position: "absolute", right: 0, top: 44, width: 210, borderRadius: 16,
                background: colors.card, border: `1px solid ${colors.border}`,
                boxShadow: "0 12px 30px rgba(0,0,0,0.4)", padding: 6,
              }}>
                {THEME_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => { setTheme(opt.id); setThemeOpen(false); }} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 10px", borderRadius: 12, background: "none", border: "none",
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <span style={{ fontSize: 17, width: 24, textAlign: "center" }}>{opt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{opt.label}</div>
                      <div style={{ fontSize: 10, color: colors.subtext }}>{opt.desc}</div>
                    </div>
                    {theme === opt.id && <span style={{ color: colors.accent, fontSize: 14 }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => router.push("/profile")} style={{
            width: 36, height: 36, borderRadius: "50%", background: colors.card,
            border: `1px solid ${colors.border}`, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 15, cursor: "pointer",
          }}>👤</button>
        </div>
      </div>
    </header>
  );
}

function IjebuSoulLogo({ accent, stroke }: { accent: string; stroke: string }) {
  return (
    <svg viewBox="0 0 64 64" width="34" height="34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 53 C29 50 10 39 10 24 C10 16 16 11 23 11 C28 11 31 14 32 18 C33 14 36 11 41 11 C48 11 54 16 54 24 C54 39 35 50 32 53Z" stroke={stroke} strokeWidth="4" />
      <path d="M32 43 C29 40 20 34 20 27 C20 23 23 20 27 20 C29 20 31 21 32 24 C33 21 35 20 38 20 C42 20 44 23 44 27 C44 34 35 40 32 43Z" stroke={accent} strokeWidth="3" />
      <circle cx="32" cy="8" r="4" fill={accent} />
      <path d="M13 56H51" stroke={accent} strokeWidth="2" />
    </svg>
  );
}