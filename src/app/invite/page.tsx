"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";

export default function InvitePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const [referredCount, setReferredCount] = useState(0);
  const [premiumUntil, setPremiumUntil]     = useState<string | null>(null);
  const [copied, setCopied]                 = useState(false);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase
        .from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user.id);
      setReferredCount(count ?? 0);

      const { data: prof } = await supabase.from("profiles").select("premium_until").eq("id", user.id).single();
      setPremiumUntil(prof?.premium_until ?? null);
      setLoading(false);
    })();
  }, [user]);

  const code = profile?.referral_code;
  const link = code ? `https://ijebusoul.com/?ref=${code}` : "";
  const progressInCycle = referredCount % 3;
  const premiumActive = premiumUntil && new Date(premiumUntil) > new Date();

  const copyLink = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const shareWhatsApp = () => {
    if (!link) return;
    const text = encodeURIComponent(`Join me on ìjèbú soul — a dating & connection app for Ìjèbú people ❤️\n\n${link}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (authLoading || loading) return (
    <div style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: colors.subtext }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🎁</div>
          <div style={{ fontSize: 14 }}>Loading...</div>
        </div>
      </div>
      <BottomNav />
    </div>
  );

  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column", color: colors.text }}>
      <Header />

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🎁</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 8 }}>Invite your ìjèbú friends</h1>
          <p style={{ fontSize: 14, color: colors.subtext, lineHeight: 1.6 }}>
            You could earn 7 days Premium when 3 friends join.
          </p>
        </div>

        {premiumActive && (
          <div style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 16, padding: "14px 16px", textAlign: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.accent }}>
              ✨ Premium active until {new Date(premiumUntil!).toLocaleDateString()}
            </span>
          </div>
        )}

        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: colors.subtext, letterSpacing: "0.06em", textTransform: "uppercase" }}>Progress</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: colors.accent }}>{progressInCycle}/3 friends joined</span>
          </div>
          <div style={{ height: 8, borderRadius: 50, background: colors.border, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(progressInCycle / 3) * 100}%`, background: colors.accent, borderRadius: 50, transition: "width 0.3s" }} />
          </div>
          <p style={{ fontSize: 12, color: colors.subtext, marginTop: 10 }}>
            {referredCount} friend{referredCount === 1 ? "" : "s"} joined through your invites in total.
          </p>
        </div>

        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 18 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.subtext, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>Your invite link</span>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "12px 14px", fontSize: 13, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {link || "Generating..."}
            </div>
            <button onClick={copyLink} style={{ background: colors.accent, border: "none", borderRadius: 12, padding: "0 16px", fontSize: 13, fontWeight: 700, color: "#000", cursor: "pointer", whiteSpace: "nowrap" }}>
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>

        <button onClick={shareWhatsApp} style={{ width: "100%", background: "#25D366", border: "none", borderRadius: 14, padding: "16px 0", fontSize: 15, fontWeight: 800, color: "#000", cursor: "pointer" }}>
          Invite on WhatsApp →
        </button>
      </div>

      <BottomNav />
    </main>
  );
}