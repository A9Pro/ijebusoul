"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";

/**
 * Each icon is a 24x24 line drawing with rounded caps and joins.
 * It is outlined when idle and filled when active, drawn with currentColor.
 */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS: Record<string, (active: boolean) => ReactNode> = {
  // Discover: compass
  discover: (a) => (
    <>
      <circle cx="12" cy="12" r="9" {...stroke} fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.16 : 0} />
      <path d="M15.6 8.4l-2 5.2-5.2 2 2-5.2z" {...stroke} fill={a ? "currentColor" : "none"} />
    </>
  ),
  // Likes: heart
  likes: (a) => (
    <path
      d="M12 20.2s-7.4-4.5-7.4-10.1A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.4 2.5c0 5.6-7.4 10.1-7.4 10.1z"
      {...stroke}
      fill={a ? "currentColor" : "none"}
    />
  ),
  // Feed: rounded square with a play triangle
  feed: (a) => (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="4" {...stroke} fill={a ? "currentColor" : "none"} fillOpacity={a ? 0.16 : 0} />
      <path d="M10.2 9.3v5.4l4.6-2.7z" {...stroke} fill={a ? "currentColor" : "none"} />
    </>
  ),
  // Chats: speech bubble
  chats: (a) => (
    <path
      d="M4 11.5a7.5 7.5 0 0 1 7.5-7.5h1a7.5 7.5 0 0 1 0 15H8l-3.6 2.2.9-3.9A7.5 7.5 0 0 1 4 11.5z"
      {...stroke}
      fill={a ? "currentColor" : "none"}
    />
  ),
  // Profile: head and shoulders
  profile: (a) => (
    <>
      <circle cx="12" cy="8.2" r="3.7" {...stroke} fill={a ? "currentColor" : "none"} />
      <path
        d="M4.6 20c.6-3.6 3.6-5.6 7.4-5.6s6.8 2 7.4 5.6"
        {...stroke}
        fill={a ? "currentColor" : "none"}
        fillOpacity={a ? 0.22 : 0}
      />
    </>
  ),
};

const NAV_ITEMS = [
  { id: "discover", path: "/home", label: "Discover" },
  { id: "likes", path: "/likes", label: "Likes" },
  { id: "feed", path: "/feed", label: "Feed" },
  { id: "chats", path: "/chats", label: "Chats" },
  { id: "profile", path: "/profile", label: "Profile" },
];

// Exported so page containers can reserve this much bottom padding on their
// scrollable content, otherwise the last bit of content would sit hidden
// underneath the fixed nav. Includes slack for the safe-area inset.
export const BOTTOM_NAV_HEIGHT = 96;

const CSS = `
.bn-btn{position:relative;background:none;border:0;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:6px 4px;min-width:56px;-webkit-tap-highlight-color:transparent;transition:color .2s ease}
.bn-btn:focus-visible{outline:2px solid currentColor;outline-offset:2px;border-radius:12px}
.bn-ico{position:relative;display:grid;place-items:center;width:44px;height:30px;border-radius:15px;transition:background .25s ease,transform .25s cubic-bezier(.2,1.4,.4,1)}
.bn-btn:active .bn-ico{transform:scale(.88)}
.bn-btn[aria-current="page"] .bn-ico{transform:translateY(-1px)}
@media (prefers-reduced-motion:reduce){.bn-ico,.bn-btn{transition:none}}
`;

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();

  // Fetch every tab's code in the background, so a tap opens the page straight away.
  useEffect(() => {
    const run = () => NAV_ITEMS.forEach((i) => router.prefetch(i.path));
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run); else setTimeout(run, 400);
  }, [router]);

  return (
    <nav
      aria-label="Main"
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        zIndex: 50,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "8px 6px calc(10px + env(safe-area-inset-bottom, 0px))",
        background: colors.bg,
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      <style>{CSS}</style>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.path || pathname.startsWith(item.path + "/");
        return (
          <button
            key={item.id}
            type="button"
            className="bn-btn"
            onClick={() => router.push(item.path)}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
            style={{ color: active ? colors.accent : colors.subtext }}
          >
            <span
              className="bn-ico"
              style={{ background: active ? `${colors.accent}24` : "transparent" }}
            >
              <svg width="23" height="23" viewBox="0 0 24 24" aria-hidden="true">
                {ICONS[item.id](active)}
              </svg>
            </span>
            <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 600, letterSpacing: "0.02em" }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}