"use client";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";

const NAV_ITEMS = [
  { id: "discover", path: "/home",    icon: "🔥", label: "Discover" },
  { id: "likes",    path: "/likes",   icon: "💛", label: "Likes" },
  { id: "feed",     path: "/feed",    icon: "▶️", label: "Feed" },
  { id: "chats",    path: "/chats",   icon: "💬", label: "Chats" },
  { id: "profile",  path: "/profile", icon: "👤", label: "Profile" },
];

// Exported so page containers can reserve this much bottom padding on their
// scrollable content — otherwise the last bit of content would sit hidden
// underneath the fixed nav. Includes slack for the safe-area inset.
export const BOTTOM_NAV_HEIGHT = 96;

export default function BottomNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 430,
      zIndex: 50,
      display: "flex", justifyContent: "space-around", alignItems: "center",
      padding: "10px 0 calc(14px + env(safe-area-inset-bottom, 0px))",
      background: colors.bg,
      borderTop: `1px solid ${colors.border}`,
    }}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.path;
        return (
          <button
            key={item.id}
            onClick={() => router.push(item.path)}
            style={{
              background: "none", border: "none",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3,
              cursor: "pointer", padding: "4px 10px",
            }}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.03em",
              color: active ? colors.accent : colors.subtext,
            }}>
              {item.label}
            </span>
            {active && (
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: colors.accent }} />
            )}
          </button>
        );
      })}
    </div>
  );
}