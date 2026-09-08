"use client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";

export default function InviteCard() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <div
      onClick={() => router.push("/invite")}
      style={{
        margin: "0 20px 20px",
        background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))",
        border: `1px solid ${colors.accent}40`, borderRadius: 18, padding: 18, cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: colors.accent, marginBottom: 6 }}>🎁 Invite your ìjèbú friends</div>
      <div style={{ fontSize: 13, color: colors.subtext, lineHeight: 1.5, marginBottom: 10 }}>
        You could earn 7 days Premium when 3 friends join.
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>Invite friends →</div>
    </div>
  );
}