import { supabase } from "@/lib/supabase";
import type { Post } from "@/lib/types";

export const STORY_BUCKET = "stories";
export const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const MAX_STORY_IMAGE = 15 * 1024 * 1024;
export const MAX_STORY_VIDEO = 60 * 1024 * 1024;

export type StoryType = "photo" | "video" | "text";

export type Story = {
  id: string;
  user_id: string;
  type: StoryType;
  media_url: string | null;
  caption: string | null;
  bg_color: string | null;
  created_at: string;
  expires_at: string;
  reshared_from: string | null;
  origin_user: string | null;
  /** Set when the story was made from a feed post. */
  source_post?: string | null;
  // derived for the signed-in viewer
  likes: number;
  liked: boolean;
  viewed: boolean;
  views: number; // only meaningful on your own stories
};

export type StoryUser = {
  id: string;
  name: string;
  avatar_url?: string | null;
  photos?: string[] | null;
  online_at?: string | null;
};

export type StoryGroup = {
  user: StoryUser;
  stories: Story[];
  hasUnseen: boolean;
  latest: string;
  mine: boolean;
  /** Thread Bloom: you are matched and you both posted within the hour of each other. */
  bloom: boolean;
};

export type StoryFeed = {
  groups: StoryGroup[];
  names: Record<string, string>;
  matchByUser: Record<string, string>;
};

export function storyMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return supabase.storage.from(STORY_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function hoursLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3600000);
  if (h >= 1) return `${h}h left`;
  return `${Math.max(1, Math.floor(ms / 60000))}m left`;
}

export function agoShort(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

export const isLive = (u?: StoryUser | null) =>
  !!u?.online_at && Date.now() - new Date(u.online_at).getTime() < 300000;

/** Your own expired stories clean themselves up, including their files. */
async function tidyMine(myId: string) {
  const { data } = await supabase
    .from("stories")
    .select("id, media_url")
    .eq("user_id", myId)
    .lte("expires_at", new Date().toISOString());
  if (!data?.length) return;
  const paths = data.map(d => d.media_url).filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from(STORY_BUCKET).remove(paths);
  await supabase.from("stories").delete().in("id", data.map(d => d.id));
}

export async function loadStoryFeed(myId: string): Promise<StoryFeed> {
  void tidyMine(myId).catch(() => {});

  const { data: rows, error } = await supabase
    .from("stories")
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  if (error || !rows?.length) return { groups: [], names: {}, matchByUser: {} };

  const ids = rows.map(r => r.id as string);
  const userIds = Array.from(new Set(rows.flatMap(r => [r.user_id, r.origin_user]).filter(Boolean))) as string[];

  const [profRes, seenRes, likeRes, viewRes, matchRes] = await Promise.all([
    supabase.from("public_profiles").select("id,name,avatar_url,photos,online_at").in("id", userIds),
    supabase.from("story_views").select("story_id").eq("viewer_id", myId).in("story_id", ids),
    supabase.from("story_likes").select("story_id,user_id").in("story_id", ids),
    supabase.from("story_views").select("story_id").in("story_id", ids), // RLS: owners see views on their own stories
    supabase.from("matches").select("id,user1_id,user2_id").or(`user1_id.eq.${myId},user2_id.eq.${myId}`),
  ]);

  const profiles = new Map<string, StoryUser>((profRes.data ?? []).map(p => [p.id as string, p as StoryUser]));
  const seen = new Set((seenRes.data ?? []).map(r => r.story_id as string));
  const likeCount: Record<string, number> = {};
  const likedByMe = new Set<string>();
  (likeRes.data ?? []).forEach(l => {
    likeCount[l.story_id] = (likeCount[l.story_id] ?? 0) + 1;
    if (l.user_id === myId) likedByMe.add(l.story_id);
  });
  const viewCount: Record<string, number> = {};
  (viewRes.data ?? []).forEach(v => { viewCount[v.story_id] = (viewCount[v.story_id] ?? 0) + 1; });

  const matchByUser: Record<string, string> = {};
  (matchRes.data ?? []).forEach(m => {
    const other = m.user1_id === myId ? m.user2_id : m.user1_id;
    matchByUser[other] = m.id;
  });

  const byUser = new Map<string, Story[]>();
  rows.forEach(r => {
    const s: Story = {
      ...(r as Story),
      likes: likeCount[r.id] ?? 0,
      liked: likedByMe.has(r.id),
      viewed: r.user_id === myId || seen.has(r.id),
      views: r.user_id === myId ? viewCount[r.id] ?? 0 : 0,
    };
    byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), s]);
  });

  const myLatest = byUser.get(myId)?.slice(-1)[0]?.created_at;
  const groups: StoryGroup[] = [];
  byUser.forEach((stories, uid) => {
    const user = profiles.get(uid);
    if (!user) return;
    const latest = stories[stories.length - 1].created_at;
    const bloom =
      uid !== myId && !!myLatest && !!matchByUser[uid] &&
      Math.abs(new Date(latest).getTime() - new Date(myLatest).getTime()) < 3600000;
    groups.push({ user, stories, latest, mine: uid === myId, bloom, hasUnseen: stories.some(s => !s.viewed) });
  });

  groups.sort((a, b) => {
    if (a.mine !== b.mine) return a.mine ? -1 : 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    return new Date(b.latest).getTime() - new Date(a.latest).getTime();
  });

  const names: Record<string, string> = {};
  profiles.forEach((p, id) => { names[id] = p.name; });
  return { groups, names, matchByUser };
}

export async function markViewed(storyId: string, myId: string) {
  await supabase.from("story_views").upsert({ story_id: storyId, viewer_id: myId }, { onConflict: "story_id,viewer_id", ignoreDuplicates: true });
}

export async function setLiked(storyId: string, myId: string, liked: boolean): Promise<boolean> {
  const { error } = liked
    ? await supabase.from("story_likes").insert({ story_id: storyId, user_id: myId })
    : await supabase.from("story_likes").delete().eq("story_id", storyId).eq("user_id", myId);
  return !error;
}

export async function deleteStory(story: Story): Promise<boolean> {
  if (story.media_url) await supabase.storage.from(STORY_BUCKET).remove([story.media_url]);
  const { error } = await supabase.from("stories").delete().eq("id", story.id);
  return !error;
}

export type Viewer = { user: StoryUser; at: string };
export async function loadViewers(storyId: string): Promise<Viewer[]> {
  const { data } = await supabase.from("story_views").select("viewer_id, viewed_at").eq("story_id", storyId).order("viewed_at", { ascending: false });
  if (!data?.length) return [];
  const { data: profs } = await supabase.from("public_profiles").select("id,name,avatar_url,photos,online_at").in("id", data.map(d => d.viewer_id));
  const map = new Map((profs ?? []).map(p => [p.id as string, p as StoryUser]));
  return data.flatMap(d => {
    const user = map.get(d.viewer_id);
    return user ? [{ user, at: d.viewed_at as string }] : [];
  });
}

/** Reshare = copy the story (and its file) onto your own tray. Lineage is kept. */
export async function reshareStory(story: Story, myId: string): Promise<boolean> {
  let path: string | null = null;
  if (story.media_url) {
    const ext = story.media_url.split(".").pop() || "jpg";
    path = `${myId}/${Date.now()}-re.${ext}`;
    const { error } = await supabase.storage.from(STORY_BUCKET).copy(story.media_url, path);
    if (error) return false;
  }
  const { error } = await supabase.from("stories").insert({
    user_id: myId,
    type: story.type,
    media_url: path,
    caption: story.caption,
    bg_color: story.bg_color,
    reshared_from: story.id,
    origin_user: story.origin_user ?? story.user_id,
    ...(story.source_post ? { source_post: story.source_post } : {}),
  });
  if (error) return false;
  await supabase.from("story_reshares").insert({ story_id: story.id, user_id: myId });
  announce("stories:changed");
  return true;
}

// ── Sharing between the feed and stories ─────────────────────────────────────

export const POST_BUCKET = "posts";
export type ShareResult = { ok: boolean; reason?: "sql" | "failed" };

/** Lets other parts of the app (the tray, the feed) refresh without being wired together. */
function announce(name: "stories:changed" | "feed:refresh") {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(name));
}

const needsSql = (message?: string) => /source_post|origin_user/i.test(message ?? "");
const extOf = (path: string, fallback: string) => (path.includes(".") ? path.split(".").pop() || fallback : fallback);

/** Copies a file between buckets. Tries the server-side copy first, then download and upload. */
async function copyAcross(fromBucket: string, fromPath: string, toBucket: string, toPath: string): Promise<boolean> {
  const direct = await supabase.storage.from(fromBucket).copy(fromPath, toPath, { destinationBucket: toBucket });
  if (!direct.error) return true;
  const dl = await supabase.storage.from(fromBucket).download(fromPath);
  if (dl.error || !dl.data) return false;
  const up = await supabase.storage.from(toBucket).upload(toPath, dl.data, { contentType: dl.data.type || undefined });
  return !up.error;
}

/** Feed post to your story. The file is copied, so deleting the post later never breaks the story. */
export async function postToStory(post: Post, myId: string): Promise<ShareResult> {
  let path: string | null = null;
  if (post.type !== "text") {
    if (!post.media_url) return { ok: false, reason: "failed" };
    path = `${myId}/${Date.now()}-post.${extOf(post.media_url, post.type === "video" ? "mp4" : "jpg")}`;
    if (!(await copyAcross(POST_BUCKET, post.media_url, STORY_BUCKET, path))) return { ok: false, reason: "failed" };
  }
  const { error } = await supabase.from("stories").insert({
    user_id: myId,
    type: post.type,
    media_url: path,
    caption: post.caption?.trim() || null,
    bg_color: post.type === "text" ? post.bg_color ?? null : null,
    source_post: post.id,
    origin_user: post.user_id !== myId ? post.user_id : null,
  });
  if (error) {
    if (path) void supabase.storage.from(STORY_BUCKET).remove([path]);
    return { ok: false, reason: needsSql(error.message) ? "sql" : "failed" };
  }
  announce("stories:changed");
  return { ok: true };
}

/** Story to your feed. Credits whoever made the original. */
export async function repostStoryToFeed(story: Story, myId: string): Promise<ShareResult> {
  let path: string | null = null;
  if (story.type !== "text") {
    if (!story.media_url) return { ok: false, reason: "failed" };
    path = `${myId}/${Date.now()}-story.${extOf(story.media_url, story.type === "video" ? "mp4" : "jpg")}`;
    if (!(await copyAcross(STORY_BUCKET, story.media_url, POST_BUCKET, path))) return { ok: false, reason: "failed" };
  }
  const { error } = await supabase.from("posts").insert({
    user_id: myId,
    type: story.type,
    caption: story.caption ?? "",
    media_url: path,
    bg_color: story.bg_color ?? "#1a1a2e",
    likes_count: 0,
    comments_count: 0,
    origin_user: story.origin_user ?? (story.user_id !== myId ? story.user_id : null),
  });
  if (error) {
    if (path) void supabase.storage.from(POST_BUCKET).remove([path]);
    return { ok: false, reason: needsSql(error.message) ? "sql" : "failed" };
  }
  announce("feed:refresh");
  return { ok: true };
}