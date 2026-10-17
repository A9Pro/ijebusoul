"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, X, Play, Hash, Clock } from "lucide-react";
import { supabase, avatarUrl, postMediaUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import BottomNav, { BOTTOM_NAV_HEIGHT } from "@/components/BottomNav";

type Tab = "people" | "posts" | "tags";

type PersonRow = { id: string; name: string; avatar_url: string | null; photos: string[] | null; online_at?: string | null };
type PostRow = {
  id: string; user_id: string; type: "photo" | "video" | "text"; caption: string | null;
  media_url: string | null; bg_color?: string | null; created_at: string;
  profile?: { id: string; name: string; avatar_url: string | null; photos: string[] | null } | null;
};

const GOLD = "#D4AF37";
const RECENT_KEY = "ijebusoul:recent-searches";
const SUGGESTED_TAGS = ["culture", "story", "event", "food", "history", "language", "festival", "fashion", "tradition"];
const LIMIT = 20;

// Characters that mean something to ilike. Searching for them literally keeps results honest.
const escapeLike = (q: string) => q.replace(/[\\%_]/g, (m) => "\\" + m);

const readRecent = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 8) : [];
  } catch { return []; }
};
const writeRecent = (list: string[]) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8))); } catch { /* storage can be blocked */ }
};

function Avatar({ person, size }: { person: { name: string; avatar_url: string | null; photos: string[] | null }; size: number }) {
  const { colors } = useTheme();
  const src = avatarUrl(person.photos?.[0] ?? person.avatar_url);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
      background: colors.card, border: `1.5px solid ${GOLD}66`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: GOLD, fontWeight: 800, fontSize: size * 0.4,
    }}>
      {src
        ? <img src={src} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : (person.name?.[0] ?? "?").toUpperCase()}
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { colors } = useTheme();

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("people");
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [tags, setTags] = useState<[string, number][]>([]);
  const [suggested, setSuggested] = useState<PersonRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [ran, setRan] = useState("");        // the query the visible results belong to

  const inputRef = useRef<HTMLInputElement>(null);
  const ticket = useRef(0);                  // an older, slower answer must never replace a newer one

  useEffect(() => { if (!authLoading && !user) router.replace("/"); }, [authLoading, user, router]);
  useEffect(() => { setRecent(readRecent()); inputRef.current?.focus(); }, []);

  // Someone to tap before anything is typed: the people who were active most recently.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    supabase
      .from("public_profiles")
      .select("id,name,avatar_url,photos,online_at")
      .neq("id", user.id)
      .order("online_at", { ascending: false, nullsFirst: false })
      .limit(8)
      .then(({ data }) => { if (alive && Array.isArray(data)) setSuggested(data as PersonRow[]); });
    return () => { alive = false; };
  }, [user]);

  const term = query.trim().replace(/^#/, "");
  const isTagQuery = query.trim().startsWith("#");

  const run = useCallback(async (raw: string, which: Tab) => {
    const q = raw.trim().replace(/^#/, "");
    const mine = ++ticket.current;
    if (q.length < 1) { setPeople([]); setPosts([]); setTags([]); setBusy(false); setFailed(false); setRan(""); return; }
    setBusy(true); setFailed(false);
    const like = `%${escapeLike(q)}%`;

    try {
      if (which === "people") {
        const { data, error } = await supabase
          .from("public_profiles").select("id,name,avatar_url,photos,online_at")
          .ilike("name", like).limit(LIMIT);
        if (mine !== ticket.current) return;
        if (error) throw error;
        setPeople((data ?? []) as PersonRow[]);
      } else {
        // Posts and tags both read captions. Tags fetch more and count the hashtags inside.
        const wantTags = which === "tags";
        const { data, error } = await supabase
          .from("posts")
          .select("id,user_id,type,caption,media_url,bg_color,created_at,profile:profiles!posts_user_id_fkey(id,name,avatar_url,photos)")
          .ilike("caption", wantTags ? `%#${escapeLike(q)}%` : like)
          .order("created_at", { ascending: false })
          .limit(wantTags ? 60 : LIMIT);
        if (mine !== ticket.current) return;
        if (error) throw error;
        const rows = (data ?? []) as unknown as PostRow[];
        if (wantTags) {
          const counts = new Map<string, number>();
          const needle = q.toLowerCase();
          for (const r of rows) {
            const seen = new Set<string>();
            for (const m of (r.caption ?? "").matchAll(/#([\p{L}\p{N}_]+)/gu)) {
              const t = m[1].toLowerCase();
              if (t.includes(needle) && !seen.has(t)) { seen.add(t); counts.set(t, (counts.get(t) ?? 0) + 1); }
            }
          }
          setTags([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20));
        } else {
          setPosts(rows);
        }
      }
      setRan(`${which}:${q}`);
    } catch (e) {
      if (mine !== ticket.current) return;
      console.error("Search failed:", e);
      setFailed(true);
    } finally {
      if (mine === ticket.current) setBusy(false);
    }
  }, []);

  // Wait for a pause in typing, so each letter does not cost a request.
  useEffect(() => {
    const which: Tab = isTagQuery && tab === "people" ? "tags" : tab;
    if (isTagQuery && tab === "people") setTab("tags");
    const t = setTimeout(() => { void run(query, which); }, 260);
    return () => clearTimeout(t);
  }, [query, tab, isTagQuery, run]);

  const remember = (q: string) => {
    const v = q.trim();
    if (!v) return;
    const next = [v, ...recent.filter((r) => r.toLowerCase() !== v.toLowerCase())].slice(0, 8);
    setRecent(next); writeRecent(next);
  };

  const pick = (q: string, which?: Tab) => {
    setQuery(q);
    if (which) setTab(which);
    inputRef.current?.focus();
  };

  const openPerson = (id: string) => { remember(query); router.push(`/profile/${id}`); };

  const empty = term.length === 0;
  const settled = ran === `${tab}:${term}` && !busy && !failed;
  const count = tab === "people" ? people.length : tab === "posts" ? posts.length : tags.length;

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id}
      style={{
        flex: 1, padding: "10px 0", background: "none", border: "none", cursor: "pointer",
        fontSize: 13.5, fontWeight: tab === id ? 800 : 600,
        color: tab === id ? GOLD : colors.subtext,
        borderBottom: `2px solid ${tab === id ? GOLD : "transparent"}`,
        transition: "color .2s, border-color .2s",
      }}
    >{label}</button>
  );

  const snippet = useMemo(() => (s: string | null) => {
    const t = (s ?? "").replace(/\s+/g, " ").trim();
    return t.length > 110 ? t.slice(0, 110) + "…" : t;
  }, []);

  return (
    <div style={{ minHeight: "100dvh", background: colors.bg, color: colors.text, fontFamily: "system-ui", maxWidth: 430, margin: "0 auto" }}>
      <style>{`
        @keyframes srFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes srShimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}
        .sr-row{animation:srFade .22s ease both}
        .sr-sk{background:linear-gradient(90deg,${colors.card} 25%,${colors.border} 50%,${colors.card} 75%);background-size:400px 100%;animation:srShimmer 1.2s linear infinite}
        .sr-press{transition:background .15s ease,transform .15s ease}
        .sr-press:active{transform:scale(.985)}
        @media (prefers-reduced-motion:reduce){.sr-row,.sr-sk{animation:none}}
      `}</style>

      {/* top bar: back, search box */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 6px" }}>
          <button onClick={() => router.back()} aria-label="Back" style={{ background: "none", border: "none", color: colors.text, cursor: "pointer", padding: 6, display: "flex" }}>
            <ArrowLeft size={22} />
          </button>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8, height: 42, padding: "0 12px",
            borderRadius: 21, background: colors.card, border: `1px solid ${colors.border}`,
          }}>
            <Search size={17} color={colors.subtext} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { remember(query); (e.target as HTMLInputElement).blur(); } }}
              placeholder="Search people, posts, #tags"
              enterKeyHint="search"
              autoCapitalize="none" autoCorrect="off" spellCheck={false}
              maxLength={60}
              aria-label="Search"
              style={{ flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", color: colors.text, fontSize: 15 }}
            />
            {query && (
              <button onClick={() => pick("")} aria-label="Clear" style={{ background: "none", border: "none", cursor: "pointer", color: colors.subtext, display: "flex", padding: 2 }}>
                <X size={17} />
              </button>
            )}
          </div>
        </div>
        <div style={{ display: "flex" }}>
          {tabBtn("people", "People")}
          {tabBtn("posts", "Posts")}
          {tabBtn("tags", "Tags")}
        </div>
      </div>

      <div style={{ padding: `10px 14px ${BOTTOM_NAV_HEIGHT + 16}px` }}>

        {/* nothing typed yet: recent searches, suggested people, tags to try */}
        {empty && (
          <>
            {recent.length > 0 && (
              <section style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 8px" }}>
                  <h2 style={{ fontSize: 13, fontWeight: 800, color: colors.subtext, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>Recent</h2>
                  <button onClick={() => { setRecent([]); writeRecent([]); }} style={{ background: "none", border: "none", color: GOLD, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Clear</button>
                </div>
                {recent.map((r) => (
                  <button key={r} onClick={() => pick(r)} className="sr-press" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 4px", background: "none", border: "none", cursor: "pointer", color: colors.text, fontSize: 14.5, textAlign: "left" }}>
                    <Clock size={16} color={colors.subtext} /> {r}
                  </button>
                ))}
              </section>
            )}

            <section style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, color: colors.subtext, letterSpacing: "0.04em", textTransform: "uppercase", margin: "6px 0 10px" }}>Try a tag</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SUGGESTED_TAGS.map((t) => (
                  <button key={t} onClick={() => pick(`#${t}`, "tags")} className="sr-press" style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", borderRadius: 20, background: colors.card, border: `1px solid ${colors.border}`, color: colors.text, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                    <Hash size={13} color={GOLD} />{t}
                  </button>
                ))}
              </div>
            </section>

            {suggested.length > 0 && (
              <section>
                <h2 style={{ fontSize: 13, fontWeight: 800, color: colors.subtext, letterSpacing: "0.04em", textTransform: "uppercase", margin: "6px 0 6px" }}>Recently active</h2>
                {suggested.map((p) => (
                  <button key={p.id} onClick={() => router.push(`/profile/${p.id}`)} className="sr-press" style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "9px 4px", background: "none", border: "none", cursor: "pointer", color: colors.text, textAlign: "left" }}>
                    <Avatar person={p} size={44} />
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
                  </button>
                ))}
              </section>
            )}
          </>
        )}

        {/* loading */}
        {!empty && busy && !settled && count === 0 && (
          <div aria-label="Searching">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px" }}>
                <div className="sr-sk" style={{ width: 46, height: 46, borderRadius: "50%" }} />
                <div style={{ flex: 1 }}>
                  <div className="sr-sk" style={{ height: 12, width: "50%", borderRadius: 6, marginBottom: 8 }} />
                  <div className="sr-sk" style={{ height: 10, width: "75%", borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!empty && failed && (
          <div style={{ textAlign: "center", padding: "40px 10px", color: colors.subtext, fontSize: 14 }}>
            Search could not finish.
            <div><button onClick={() => void run(query, tab)} style={{ marginTop: 10, padding: "8px 18px", borderRadius: 18, background: GOLD, border: "none", color: "#1a1206", fontWeight: 800, cursor: "pointer" }}>Try again</button></div>
          </div>
        )}

        {!empty && settled && count === 0 && (
          <div style={{ textAlign: "center", padding: "48px 10px", color: colors.subtext, fontSize: 14, lineHeight: 1.5 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, marginBottom: 4 }}>No {tab === "tags" ? "tags" : tab} found for “{term}”</div>
            Check the spelling, or try fewer letters.
          </div>
        )}

        {/* people */}
        {!empty && tab === "people" && people.map((p, i) => (
          <button key={p.id} onClick={() => openPerson(p.id)} className="sr-row sr-press" style={{ animationDelay: `${Math.min(i, 8) * 18}ms`, display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 4px", background: "none", border: "none", cursor: "pointer", color: colors.text, textAlign: "left" }}>
            <Avatar person={p} size={46} />
            <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
          </button>
        ))}

        {/* posts */}
        {!empty && tab === "posts" && posts.map((p, i) => {
          const media = p.type === "text" ? null : postMediaUrl(p.media_url);
          return (
            <button key={p.id} onClick={() => { remember(query); router.push(`/profile/${p.user_id}`); }} className="sr-row sr-press" style={{ animationDelay: `${Math.min(i, 8) * 18}ms`, display: "flex", gap: 12, width: "100%", padding: "10px 4px", background: "none", border: "none", borderBottom: `1px solid ${colors.border}`, cursor: "pointer", color: colors.text, textAlign: "left", alignItems: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 12, flexShrink: 0, overflow: "hidden", position: "relative", background: p.bg_color || colors.card, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 22 }}>
                {media && p.type === "photo" && <img src={media} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                {media && p.type === "video" && (
                  <>
                    <video src={`${media}#t=0.1`} preload="metadata" muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)" }}><Play size={20} color="#fff" fill="#fff" /></span>
                  </>
                )}
                {!media && "“"}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: GOLD, marginBottom: 3 }}>{p.profile?.name ?? "Someone"}</div>
                <div style={{ fontSize: 14, lineHeight: 1.4, color: colors.text, overflowWrap: "anywhere" }}>{snippet(p.caption) || "Photo post"}</div>
              </div>
            </button>
          );
        })}

        {/* tags */}
        {!empty && tab === "tags" && tags.map(([t, n], i) => (
          <div key={t} className="sr-row" style={{ animationDelay: `${Math.min(i, 8) * 18}ms` }}>
            <button onClick={() => pick(t, "posts")} className="sr-press" style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 4px", background: "none", border: "none", cursor: "pointer", color: colors.text, textAlign: "left" }}>
              <span style={{ width: 42, height: 42, borderRadius: "50%", background: colors.card, border: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Hash size={18} color={GOLD} /></span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>#{t}</span>
              <span style={{ fontSize: 12.5, color: colors.subtext }}>{n} recent {n === 1 ? "post" : "posts"}</span>
            </button>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}