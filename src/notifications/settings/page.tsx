"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";

const OPTIONS: { key: string; label: string; desc: string; icon: string }[] = [
  { key: "swipe_like",   label: "Likes",         desc: "When someone likes your profile",      icon: "💛" },
  { key: "match",        label: "Matches",       desc: "When you match with someone",          icon: "🎉" },
  { key: "message",      label: "Messages",      desc: "When you get a new message",           icon: "✉️" },
  { key: "post_like",    label: "Post likes",    desc: "When someone likes your post",         icon: "❤️" },
  { key: "post_comment", label: "Post comments", desc: "When someone comments on your post",   icon: "💬" },
  { key: "follow",       label: "New followers", desc: "When someone follows you",             icon: "➕" },
];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("notification_settings").select("*").eq("user_id", user.id).single();
      const defaults: Record<string, boolean> = {};
      OPTIONS.forEach(o => { defaults[o.key] = data ? ((data as any)[o.key] ?? true) : true; });
      setSettings(defaults);
      setLoading(false);
    })();
  }, [user]);

  const toggle = async (key: string) => {
    if (!user) return;
    const next = !settings[key];
    setSettings(s => ({ ...s, [key]: next }));
    setSaving(key);
    await supabase.from("notification_settings").upsert({ user_id: user.id, [key]: next, updated_at: new Date().toISOString() });
    setSaving(null);
  };

  if (authLoading || loading) return (
    <div style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⚙️</div>
          <div style={{ fontSize: 14 }}>Loading settings...</div>
        </div>
      </div>
      <BottomNav />
    </div>
  );

  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui", color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "52px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => router.back()} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 16, cursor: "pointer" }}>←</button>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em" }}>Notification settings</h1>
      </div>

      <div style={{ padding: "16px 20px 100px", display: "flex", flexDirection: "column", gap: 4 }}>
        {OPTIONS.map(o => (
          <div key={o.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 4px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{o.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{o.label}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{o.desc}</div>
            </div>
            <button
              onClick={() => toggle(o.key)}
              disabled={saving === o.key}
              style={{
                width: 46, height: 26, borderRadius: 50, border: "none", cursor: "pointer",
                background: settings[o.key] ? "#D4AF37" : "rgba(255,255,255,0.15)",
                position: "relative", transition: "background 0.15s", flexShrink: 0,
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 3, left: settings[o.key] ? 23 : 3,
                transition: "left 0.15s",
              }} />
            </button>
          </div>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}