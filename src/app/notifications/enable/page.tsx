"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { subscribeToPush, pushSupported } from "@/lib/push";

const PROMPTED_KEY = "ijebu-push-prompted";
type Stage = "prompt" | "enabling" | "success" | "failed" | "skipped";

function EnableNotificationsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/home";
  const { user, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const [stage, setStage] = useState<Stage>("prompt");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace(next); return; }
    const alreadyPrompted = typeof window !== "undefined" && localStorage.getItem(PROMPTED_KEY);
    const alreadyDecided  = typeof window !== "undefined" && "Notification" in window && Notification.permission !== "default";
    if (!pushSupported() || alreadyPrompted || alreadyDecided) {
      router.replace(next);
    }
  }, [authLoading, user]);

  const finish = () => {
    if (typeof window !== "undefined") localStorage.setItem(PROMPTED_KEY, "1");
    router.replace(next);
  };

  const handleEnable = async () => {
    if (!user) return;
    setStage("enabling");
    try {
      const ok = await subscribeToPush(user.id);
      setStage(ok ? "success" : "failed");
    } catch (err) {
      console.error("Enable notifications failed:", err);
      setStage("failed");
    }
    setTimeout(finish, 1800);
  };

  const handleNotNow = () => {
    setStage("skipped");
    setTimeout(finish, 1800);
  };

  const CONTENT: Record<Stage, { icon: string; title: string; body: string }> = {
    prompt:   { icon: "🔔", title: "Stay connected to your ìjèbú soul", body: "Get notified when someone likes you, matches with you, sends you a message, or interacts with you." },
    enabling: { icon: "⏳", title: "Enabling notifications...", body: "Just a moment." },
    success:  { icon: "✅", title: "Notifications enabled!", body: "You'll be the first to know when something happens." },
    failed:   { icon: "⚠️", title: "Couldn't enable notifications", body: "Permission was blocked or isn't supported on this device. You can try again anytime from your profile settings." },
    skipped:  { icon: "🔕", title: "No problem!", body: "Don't miss out on important updates — new matches, messages, and likes. You can turn notifications on anytime from your profile." },
  };

  const { icon, title, body } = CONTENT[stage];

  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column", color: colors.text }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "0 28px", textAlign: "center" }}>
        <div style={{ fontSize: 56 }}>{icon}</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>{title}</h1>
        <p style={{ fontSize: 14, color: colors.subtext, lineHeight: 1.6 }}>{body}</p>

        {stage === "prompt" && (
          <>
            <button
              onClick={handleEnable}
              style={{ width: "100%", background: colors.accent, border: "none", borderRadius: 14, padding: "16px 0", fontSize: 15, fontWeight: 800, color: "#000", cursor: "pointer" }}
            >
              Enable Notifications
            </button>
            <button
              onClick={handleNotNow}
              style={{ width: "100%", background: "none", border: "none", padding: "12px 0", fontSize: 14, fontWeight: 600, color: colors.subtext, cursor: "pointer" }}
            >
              Not now
            </button>
          </>
        )}

        {(stage === "success" || stage === "failed" || stage === "skipped") && (
          <button
            onClick={finish}
            style={{ width: "100%", background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 700, color: colors.text, cursor: "pointer" }}
          >
            Continue
          </button>
        )}
      </div>
    </main>
  );
}

export default function EnableNotificationsPage() {
  return (
    <Suspense fallback={null}>
      <EnableNotificationsInner />
    </Suspense>
  );
}