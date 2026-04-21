"use client";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { id: "discover", path: "/home",    icon: "🔥", label: "Discover" },
  { id: "likes",    path: "/likes",   icon: "💛", label: "Likes" },
  { id: "feed",     path: "/feed",    icon: "▶️", label: "Feed" },
  { id: "chats",    path: "/chats",   icon: "💬", label: "Chats" },
  { id: "profile",  path: "/profile", icon: "👤", label: "Profile" },
];

export default function BottomNav() {
  const router   = useRouter();
  const pathname = usePathname();

  return (
    <div style={{
      display: "flex", justifyContent: "space-around", alignItems: "center",
      padding: "10px 0 30px", background: "#0a0a0a",
      borderTop: "1px solid rgba(255,255,255,0.06)",
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
              color: active ? "#D4AF37" : "rgba(255,255,255,0.3)",
            }}>
              {item.label}
            </span>
            {active && (
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#D4AF37" }} />
            )}
          </button>
        );
      })}
    </div>
  );
}