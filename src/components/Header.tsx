"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Bell, User } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { buildStrips } from "@/components/SoulCloth";
import StoriesTray from "@/components/StoriesTray";
import ProfilePreviewModal from "@/components/ProfilePreviewModal";
import type { Profile } from "@/lib/types";

interface NotificationRow {
  id: string;
  actor_id: string | null;
  // string, not a fixed list: the database may hold types this component doesn't know yet
  type: string;
  read: boolean;
  created_at: string;
  actor?: Profile | null;
}

const COPY: Record<string, (name: string) => string> = {
  post_like:       (n) => `${n} liked your post`,
  post_comment:    (n) => `${n} commented on your post`,
  swipe_like:      (n) => `${n} liked your profile`,
  match:           (n) => `You and ${n} matched! 🎉`,
  message:         (n) => `${n} sent you a message`,
  follow:          (n) => `${n} started following you`,
  invite_prompt:   ()  => `🎁 Invite your ìjèbú friends — earn 7 days Premium when 3 friends join!`,
  referral_joined: (n) => `${n} joined ìjèbú soul through your invite! 🎉`,
  referral_reward: ()  => `You earned 7 days Premium — 3 friends joined through your invites! 🎁`,
};

const ICON: Record<string, string> = {
  post_like: "❤️", post_comment: "💬", swipe_like: "💛",
  match: "🎉", message: "✉️", follow: "➕",
  invite_prompt: "🎁", referral_joined: "🤝", referral_reward: "🎉",
};

// An unknown type still renders instead of crashing every page that shows the header.
const copyFor = (type: string, name: string) =>
  (COPY[type] ?? ((n: string) => `${n} has new activity`))(name);
const iconFor = (type: string) => ICON[type] ?? "🔔";

const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(mins)) return "";
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

// Woven aso-oke, the same cloth every time, used as the header's background.
const CLOTH_STRIPS = buildStrips("ijebusoul", 9);

// Stories show on every page by default. Pass stories={false} on a page that should not have them.
export default function Header({ stories = true }: { stories?: boolean } = {}) {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [notifOpen, setNotifOpen]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [notifLoading, setNotifLoading]   = useState(false);
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
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
    if (!opening || !user) return;

    setNotifLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*, actor:profiles!notifications_actor_id_fkey(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) console.error("Header notifications load failed:", error);
    setNotifications(Array.isArray(data) ? (data as NotificationRow[]) : []);
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
    else if (n.type === "invite_prompt" || n.type === "referral_joined" || n.type === "referral_reward") router.push("/invite");
  };

  const glass: React.CSSProperties = {
    width: 38, height: 38, borderRadius: "50%", position: "relative",
    background: "rgba(10,10,16,0.55)", border: "1px solid rgba(255,255,255,0.2)",
    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff",
  };

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 40,
      width: "100%", maxWidth: 430, margin: "0 auto",
      borderBottom: "1px solid rgba(212,175,55,0.35)",
      fontFamily: "system-ui", color: "#fff",
    }}>
      {/* the cloth: nine woven strips under a soft dark veil, so text and rings stay readable */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", display: "flex", pointerEvents: "none" }}>
        {CLOTH_STRIPS.map((bg, i) => <div key={i} style={{ flex: 1, background: bg }} />)}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,8,14,0.66), rgba(8,8,14,0.86))" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: "linear-gradient(90deg, transparent, #D4AF37, transparent)", opacity: 0.75 }} />
      </div>

      {previewProfile && <ProfilePreviewModal profile={previewProfile} onClose={() => setPreviewProfile(null)} />}

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, minHeight: 54, padding: stories ? "5px 14px 5px 16px" : "8px 16px" }}>

        <div onClick={() => router.push("/home")} role="link" aria-label="ìjèbú soul home" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexShrink: 0 }}>
          <IjebuSoulLogo accent="#D4AF37" stroke="#fff" />
          {!stories && (
            <span style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-0.02em", color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}>
              ìjèbú<span style={{ color: "#D4AF37" }}>soul</span>
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>{stories ? <StoriesTray /> : null}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div ref={notifRef} style={{ position: "relative" }}>
            <button onClick={openNotifications} aria-label="Notifications" style={glass}>
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: -3, right: -3, minWidth: 16, height: 16,
                  borderRadius: 50, background: "#FF3366", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 9,
                  fontWeight: 800, color: "#fff", padding: "0 3px", border: "1.5px solid #0a0a10",
                }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div style={{
                position: "absolute", right: 0, top: 46, width: 300, maxHeight: 400,
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
                          {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <span>{iconFor(n.type)}</span>}
                        </div>
                        <div onClick={() => goToTarget(n)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                          <div style={{ fontSize: 12.5, color: colors.text, lineHeight: 1.4 }}>{copyFor(n.type, name)}</div>
                          <div style={{ fontSize: 10, color: colors.subtext, marginTop: 2 }}>{timeAgo(n.created_at)}</div>
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

          <button onClick={() => router.push("/profile")} aria-label="Profile" style={glass}>
            <User size={18} />
          </button>
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