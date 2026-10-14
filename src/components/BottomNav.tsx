"use client";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";

type IconProps = { active: boolean };

/** Shared SVG frame: 24px grid, rounded strokes. Active icons get a soft fill. */
function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const fillOf = (active: boolean) => (active ? "currentColor" : "none");
const fillOpacity = 0.18;

const Icons = {
  discover: ({ active }: IconProps) => (
    <Svg>
      <circle cx="12" cy="12" r="9" fill={fillOf(active)} fillOpacity={fillOpacity} />
      <path d="M15.6 8.4l-2 5.2-5.2 2 2-5.2z" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.9 : 0} />
    </Svg>
  ),
  likes: ({ active }: IconProps) => (
    <Svg>
      <path
        d="M12 20.2s-7.6-4.5-7.6-10.1A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 7.6 2.6c0 5.6-7.6 10.1-7.6 10.1z"
        fill={fillOf(active)}
        fillOpacity={active ? 0.9 : fillOpacity}
      />
    </Svg>
  ),
  feed: ({ active }: IconProps) => (
    <Svg>
      <rect x="3" y="4" width="18" height="16" rx="5" fill={fillOf(active)} fillOpacity={fillOpacity} />
      <path d="M10.4 9.4v5.2l4.4-2.6z" fill="currentColor" fillOpacity={active ? 0.9 : 0} />
    </Svg>
  ),
  chats: ({ active }: IconProps) => (
    <Svg>
      <path
        d="M6 4.5h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-6.2L7.6 20.6a.6.6 0 0 1-1-.5V17.5H6a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z"
        fill={fillOf(active)}
        fillOpacity={fillOpacity}
      />
      <path d="M8 10.2h8M8 13h5" strokeWidth="1.6" />
    </Svg>
  ),
  profile: ({ active }: IconProps) => (
    <Svg>
      <circle cx="12" cy="8.2" r="3.6" fill={fillOf(active)} fillOpacity={active ? 0.9 : fillOpacity} />
      <path d="M4.6 20c.7-3.7 3.7-5.8 7.4-5.8s6.7 2.1 7.4 5.8" />
    </Svg>
  ),
};

const NAV_ITEMS = [
  { id: "discover", path: "/home", label: "Discover", Icon: Icons.discover, nested: false },
  { id: "likes", path: "/likes", label: "Likes", Icon: Icons.likes, nested: true },
  { id: "feed", path: "/feed", label: "Feed", Icon: Icons.feed, nested: true },
  { id: "chats", path: "/chats", label: "Chats", Icon: Icons.chats, nested: true },
  // Exact match only, so someone else's /profile/[id] doesn't light up "Profile".
  { id: "profile", path: "/profile", label: "Profile", Icon: Icons.profile, nested: false },
] as const;

// Exported so page containers can reserve this much bottom padding on their
// scrollable content, otherwise the last bit of content would sit hidden
// underneath the fixed nav. Includes slack for the safe-area inset.
export const BOTTOM_NAV_HEIGHT = 96;

const CSS = `
.bn-btn{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:0;padding:6px 0 2px;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:color .2s ease}
.bn-pill{position:relative;display:grid;place-items:center;width:52px;height:30px;border-radius:15px;transition:background .25s ease,transform .2s cubic-bezier(.2,1.4,.4,1)}
.bn-btn:active .bn-pill{transform:scale(.9)}
.bn-btn:focus-visible{outline:2px solid currentColor;outline-offset:-2px;border-radius:14px}
.bn-bar{position:absolute;top:-10px;left:50%;width:22px;height:3px;border-radius:0 0 3px 3px;transform:translateX(-50%) scaleX(0);transition:transform .25s cubic-bezier(.2,1.2,.4,1)}
.bn-btn[aria-current="page"] .bn-bar{transform:translateX(-50%) scaleX(1)}
@media (prefers-reduced-motion:reduce){.bn-pill,.bn-bar,.bn-btn{transition:none}}
`;

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { colors } = useTheme();

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
        alignItems: "center",
        padding: "10px 6px calc(10px + env(safe-area-inset-bottom, 0px))",
        background: colors.bg,
        borderTop: `1px solid ${colors.border}`,
        boxShadow: "0 -8px 24px rgba(0,0,0,0.06)",
      }}
    >
      <style>{CSS}</style>
      {NAV_ITEMS.map(({ id, path, label, Icon, nested }) => {
        const active = pathname === path || (nested && pathname.startsWith(path + "/"));
        return (
          <button
            key={id}
            type="button"
            className="bn-btn"
            aria-current={active ? "page" : undefined}
            aria-label={label}
            onClick={() => router.push(path)}
            style={{ color: active ? colors.accent : colors.subtext }}
          >
            <span className="bn-bar" style={{ background: colors.accent }} aria-hidden="true" />
            <span
              className="bn-pill"
              style={{ background: active ? `${colors.accent}1f` : "transparent" }}
            >
              <Icon active={active} />
            </span>
            <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 600, letterSpacing: "0.02em" }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}