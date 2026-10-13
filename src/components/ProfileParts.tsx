"use client";
import type { CSSProperties, ReactNode } from "react";
import { useTheme } from "@/context/ThemeContext";
import { avatarUrl, postMediaUrl } from "@/lib/supabase";
import { BOTTOM_NAV_HEIGHT } from "@/components/BottomNav";
import type { Profile, Post } from "@/lib/types";

export const GOLD = "#D4AF37";

export type PostLite = Pick<
  Post,
  "id" | "type" | "caption" | "media_url" | "bg_color" | "likes_count" | "comments_count" | "created_at"
>;

/* ───────────────────────── helpers ───────────────────────── */

export function capitalize(value?: string | null): string {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function memberSince(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function isPremium(profile: Pick<Profile, "premium_until">): boolean {
  if (!profile.premium_until) return false;
  const t = new Date(profile.premium_until).getTime();
  return !Number.isNaN(t) && t > Date.now();
}

/** Online if seen in the last 5 minutes, otherwise a plain "active" label. */
export function presenceOf(onlineAt?: string | null): { online: boolean; label: string } {
  if (!onlineAt) return { online: false, label: "Last seen a while ago" };
  const t = new Date(onlineAt).getTime();
  if (Number.isNaN(t)) return { online: false, label: "Last seen a while ago" };
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 5) return { online: true, label: "Online now" };
  if (mins < 60) return { online: false, label: `Active ${mins}m ago` };
  if (mins < 1440) return { online: false, label: `Active ${Math.floor(mins / 60)}h ago` };
  if (mins < 10080) return { online: false, label: `Active ${Math.floor(mins / 1440)}d ago` };
  return { online: false, label: "Last seen a while ago" };
}

/** How complete the profile is, and what to add next (most valuable first). */
export function completeness(profile: Profile): { percent: number; tips: string[] } {
  const photos = profile.photos ?? [];
  const checks: { ok: boolean; weight: number; tip: string }[] = [
    { ok: photos.length >= 1 || !!profile.avatar_url, weight: 25, tip: "Add a profile photo" },
    { ok: (profile.bio?.trim().length ?? 0) >= 30, weight: 25, tip: "Write a bio of at least 30 characters" },
    { ok: (profile.interests ?? []).length >= 3, weight: 20, tip: "Add 3 or more interests" },
    { ok: photos.length >= 3, weight: 15, tip: "Add at least 3 photos" },
    { ok: !!profile.occupation?.trim(), weight: 8, tip: "Say what you do" },
    { ok: !!profile.location?.trim(), weight: 7, tip: "Add your location" },
  ];
  const percent = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
  const tips = checks.filter((c) => !c.ok).map((c) => c.tip);
  return { percent, tips };
}

/** Interests two people have in common, ignoring upper/lower case. */
export function sharedThreads(mine: string[], theirs: string[]): string[] {
  const set = new Set(mine.map((t) => t.trim().toLowerCase()));
  return theirs.filter((t) => set.has(t.trim().toLowerCase()));
}

export async function shareProfile(
  id: string,
  name: string
): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const url = `${window.location.origin}/profile/${id}`;
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title: `${name} on ìjèbú soul`, url });
      return "shared";
    }
  } catch (err) {
    if ((err as DOMException)?.name === "AbortError") return "cancelled";
    // any other share error: fall through to copying the link
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}

/* ───────────────────────── shared styles ───────────────────────── */

export function ProfileStyles() {
  return (
    <style>{`
.sp-btn:focus-visible,.sp-tab:focus-visible,.sp-tile:focus-visible,.sp-link:focus-visible{outline:2px solid ${GOLD};outline-offset:2px}
.sp-btn:active:not(:disabled){transform:translateY(1px)}
.sp-btn:disabled{opacity:.6;cursor:not-allowed}
`}</style>
  );
}

/* ───────────────────────── pieces ───────────────────────── */

export function Avatar({
  src,
  name,
  size,
  online,
}: {
  src: string | null;
  name: string;
  size: number;
  online?: boolean;
}) {
  const { colors } = useTheme();
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          borderRadius: "50%",
          overflow: "hidden",
          background: colors.card,
          border: `4px solid ${colors.bg}`,
          boxShadow: `0 0 0 2px ${GOLD}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {src ? (
          <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <span style={{ fontSize: size * 0.42, fontWeight: 900, color: GOLD }}>{initial}</span>
        )}
      </div>
      {online ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: size * 0.04,
            bottom: size * 0.04,
            width: size * 0.2,
            height: size * 0.2,
            borderRadius: "50%",
            background: "#22C55E",
            border: `3px solid ${colors.bg}`,
            boxSizing: "border-box",
          }}
        />
      ) : null}
    </div>
  );
}

export function StatLink({ value, label, onClick }: { value: number; label: string; onClick?: () => void }) {
  const { colors } = useTheme();
  return (
    <button
      type="button"
      className="sp-link"
      onClick={onClick}
      disabled={!onClick}
      style={{
        background: "none",
        border: 0,
        padding: "4px 0",
        cursor: onClick ? "pointer" : "default",
        color: colors.subtext,
        fontSize: 13,
        fontFamily: "inherit",
      }}
    >
      <b style={{ color: colors.text, fontSize: 16, fontWeight: 800 }}>{value.toLocaleString()}</b>{" "}
      {label}
    </button>
  );
}

export function ThreadChips({ interests, shared }: { interests: string[]; shared?: string[] }) {
  const { colors } = useTheme();
  if (!interests.length) return null;
  const sharedSet = new Set((shared ?? []).map((t) => t.trim().toLowerCase()));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {interests.map((tag, i) => {
        const isShared = sharedSet.has(tag.trim().toLowerCase());
        const style: CSSProperties = isShared
          ? { background: GOLD, border: `1px solid ${GOLD}`, color: "#000" }
          : { background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", color: colors.text };
        return (
          <span
            key={`${tag}-${i}`}
            style={{ ...style, borderRadius: 50, padding: "5px 13px", fontSize: 12.5, fontWeight: 600 }}
          >
            {tag}
          </span>
        );
      })}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <div role="tablist" style={{ display: "flex", borderBottom: `1px solid ${colors.border}` }}>
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={on}
            className="sp-tab"
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              background: "none",
              border: 0,
              borderBottom: `2px solid ${on ? GOLD : "transparent"}`,
              marginBottom: -1,
              padding: "12px 0",
              fontSize: 13.5,
              fontWeight: on ? 800 : 500,
              color: on ? GOLD : colors.subtext,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <div style={{ textAlign: "center", color: colors.subtext, fontSize: 13.5, lineHeight: 1.5, padding: "36px 12px" }}>
      {children}
    </div>
  );
}

export function PhotoMosaic({
  photos,
  onOpen,
  trailing,
  emptyText,
}: {
  photos: string[];
  onOpen: (index: number) => void;
  trailing?: ReactNode;
  emptyText?: string;
}) {
  const { colors } = useTheme();
  if (!photos.length && !trailing) return <EmptyNote>{emptyText ?? "No photos yet"}</EmptyNote>;
  const featured = photos.length >= 3;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
      {photos.map((path, i) => {
        const url = avatarUrl(path);
        const big = featured && i === 0;
        return (
          <button
            key={`${path}-${i}`}
            type="button"
            className="sp-tile"
            aria-label={`Open photo ${i + 1}`}
            onClick={() => onOpen(i)}
            style={{
              position: "relative",
              padding: 0,
              border: 0,
              overflow: "hidden",
              borderRadius: 12,
              background: colors.card,
              cursor: "pointer",
              aspectRatio: big ? undefined : "1",
              gridColumn: big ? "span 2" : undefined,
              gridRow: big ? "span 2" : undefined,
            }}
          >
            {url ? (
              <img
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : null}
            {i === 0 ? (
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  background: GOLD,
                  color: "#000",
                  borderRadius: 50,
                  padding: "2px 9px",
                  fontSize: 10.5,
                  fontWeight: 800,
                }}
              >
                Main
              </span>
            ) : null}
          </button>
        );
      })}
      {trailing}
    </div>
  );
}

export function PostsGrid({ posts, loading }: { posts: PostLite[]; loading: boolean }) {
  const { colors } = useTheme();
  if (loading) return <EmptyNote>Loading posts...</EmptyNote>;
  if (!posts.length) return <EmptyNote>No posts yet</EmptyNote>;

  const countChip: CSSProperties = {
    position: "absolute",
    left: 6,
    bottom: 6,
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    borderRadius: 50,
    padding: "2px 8px",
    fontSize: 10.5,
    fontWeight: 700,
    display: "flex",
    gap: 8,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
      {posts.map((post) => {
        const media = postMediaUrl(post.media_url);
        return (
          <div
            key={post.id}
            style={{
              position: "relative",
              aspectRatio: "1",
              overflow: "hidden",
              borderRadius: 12,
              background: post.type === "text" ? post.bg_color || colors.card : colors.card,
            }}
          >
            {post.type === "photo" && media ? (
              <img
                src={media}
                alt={post.caption ?? ""}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : null}
            {post.type === "video" && media ? (
              <>
                <video
                  src={media}
                  muted
                  playsInline
                  preload="metadata"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <span aria-hidden="true" style={{ position: "absolute", top: 8, right: 8, color: "#fff", fontSize: 14, textShadow: "0 1px 4px rgba(0,0,0,.7)" }}>
                  ▶
                </span>
              </>
            ) : null}
            {post.type === "text" ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  padding: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  textShadow: "0 1px 4px rgba(0,0,0,.45)",
                }}
              >
                <span
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {post.caption}
                </span>
              </div>
            ) : null}
            <span style={countChip}>
              <span>♥ {post.likes_count ?? 0}</span>
              <span>💬 {post.comments_count ?? 0}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AboutList({ rows }: { rows: { label: string; value: string }[] }) {
  const { colors } = useTheme();
  return (
    <dl style={{ margin: 0 }}>
      {rows.map((row) => (
        <div
          key={row.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 16,
            padding: "14px 0",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <dt style={{ fontSize: 13, color: colors.subtext }}>{row.label}</dt>
          <dd style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: colors.text, textAlign: "right" }}>
            {row.value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: BOTTOM_NAV_HEIGHT + 16,
        zIndex: 300,
        maxWidth: "calc(100vw - 32px)",
        background: "#111",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 50,
        padding: "10px 18px",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
      }}
    >
      {message}
    </div>
  );
}