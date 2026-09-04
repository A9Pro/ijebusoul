"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, avatarUrl } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import type { Match, Message, Profile } from "@/lib/types";

export default function ChatsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { colors } = useTheme();

  const [matches, setMatches]       = useState<Match[]>([]);
  const [fetching, setFetching]     = useState(true);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [draft, setDraft]           = useState("");
  const [sending, setSending]       = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetching(true);
      const { data: rawMatches } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!rawMatches?.length) { setMatches([]); setFetching(false); return; }

      const otherIds = rawMatches.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", otherIds);
      const profileMap: Record<string, Profile> = {};
      profiles?.forEach(p => { profileMap[p.id] = p as Profile; });

      const enriched = await Promise.all(rawMatches.map(async m => {
        const { data: lastMsgArr } = await supabase
          .from("messages").select("content, created_at").eq("match_id", m.id).order("created_at", { ascending: false }).limit(1);
        const { count: unread } = await supabase
          .from("messages").select("id", { count: "exact", head: true })
          .eq("match_id", m.id).neq("sender_id", user.id).is("read_at", null);
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id;
        return {
          ...m,
          other_user: profileMap[otherId],
          last_message: lastMsgArr?.[0]?.content,
          last_message_at: lastMsgArr?.[0]?.created_at,
          unread_count: unread ?? 0,
        } as Match;
      }));

      setMatches(enriched.filter(m => m.other_user));
      setFetching(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!activeMatch || !user) return;

    (async () => {
      const { data } = await supabase
        .from("messages").select("*").eq("match_id", activeMatch.id).order("created_at");
      setMessages((data as Message[]) ?? []);

      await supabase.from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("match_id", activeMatch.id).neq("sender_id", user.id).is("read_at", null);
    })();

    const channel = supabase
      .channel(`match:${activeMatch.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `match_id=eq.${activeMatch.id}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeMatch, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!draft.trim() || !activeMatch || !user || sending) return;
    setSending(true);
    const content = draft.trim();
    setDraft("");
    await supabase.from("messages").insert({
      match_id: activeMatch.id, sender_id: user.id, content,
    });
    setSending(false);
  };

  const timeStr = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const timeAgo = (iso?: string) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)    return "Now";
    if (mins < 60)   return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };

  if (authLoading || fetching) return (
    <div style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: colors.subtext }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>💬</div>
          <div style={{ fontSize: 14 }}>Loading chats...</div>
        </div>
      </div>
      <BottomNav />
    </div>
  );

  if (activeMatch) {
    const other = activeMatch.other_user;
    const photo = avatarUrl(other?.photos?.[0] ?? other?.avatar_url);
    const isOnline = other?.online_at && (Date.now() - new Date(other.online_at).getTime()) < 300000;

    return (
      <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "52px 20px 16px", borderBottom: `1px solid ${colors.border}`, background: colors.bg }}>
          <button onClick={() => setActiveMatch(null)} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "50%", width: 36, height: 36, color: colors.text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: colors.card, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>🙂</span>}
            {isOnline && <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: "#22C55E", border: `2px solid ${colors.bg}` }} />}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: colors.text }}>{other?.name}</div>
            <div style={{ fontSize: 12, color: isOnline ? "#22C55E" : colors.subtext, fontWeight: 500 }}>{isOnline ? "Online now" : "Offline"}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: colors.subtext, fontSize: 14, marginTop: 60 }}>Say hi to {other?.name} 👋🏾</div>
          )}
          {messages.map(msg => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.sender_id === user?.id ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "72%", background: msg.sender_id === user?.id ? "#D4AF37" : colors.card, color: msg.sender_id === user?.id ? "#000" : colors.text, borderRadius: msg.sender_id === user?.id ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "11px 15px", fontSize: 14, lineHeight: 1.5 }}>
                <div>{msg.content}</div>
                <div style={{ fontSize: 10, marginTop: 4, color: msg.sender_id === user?.id ? "rgba(0,0,0,0.4)" : colors.subtext, textAlign: "right" }}>{timeStr(msg.created_at)}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: "12px 16px 36px", borderTop: `1px solid ${colors.border}`, display: "flex", gap: 10, alignItems: "center", background: colors.bg }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder={`Message ${other?.name}...`} style={{ flex: 1, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 50, padding: "13px 18px", fontSize: 14, color: colors.text, outline: "none", fontFamily: "system-ui" }} />
          <button onClick={sendMessage} disabled={sending} style={{ width: 46, height: 46, borderRadius: "50%", background: "#D4AF37", border: "none", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
        </div>
      </main>
    );
  }

  const totalUnread = matches.reduce((s, m) => s + m.unread_count, 0);

  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: colors.bg, fontFamily: "system-ui", display: "flex", flexDirection: "column" }}>

      <Header />

      <div style={{ padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: colors.text, letterSpacing: "-0.03em" }}>Messages</h1>
          {totalUnread > 0 && <div style={{ background: "#FF3366", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 50 }}>{totalUnread} unread</div>}
        </div>
        <p style={{ fontSize: 13, color: colors.subtext }}>{matches.length} matches</p>
      </div>

      {matches.length > 0 && (
        <div style={{ padding: "0 20px 20px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: colors.subtext, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Recent matches</p>
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 4 }}>
            {matches.map(m => {
              const photo = avatarUrl(m.other_user?.photos?.[0] ?? m.other_user?.avatar_url);
              const isOnline = m.other_user?.online_at && (Date.now() - new Date(m.other_user.online_at).getTime()) < 300000;
              return (
                <div key={m.id} onClick={() => setActiveMatch(m)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ width: 58, height: 58, borderRadius: "50%", background: colors.card, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: isOnline ? "2.5px solid #22C55E" : `2.5px solid ${colors.border}` }}>
                      {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 28 }}>🙂</span>}
                    </div>
                    {isOnline && <div style={{ position: "absolute", bottom: 2, right: 2, width: 13, height: 13, borderRadius: "50%", background: "#22C55E", border: `2.5px solid ${colors.bg}` }} />}
                  </div>
                  <span style={{ fontSize: 11, color: colors.subtext, fontWeight: 600 }}>{m.other_user?.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {matches.length > 0 && <div style={{ height: 1, background: colors.border, margin: "0 20px 16px" }} />}

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        {matches.length === 0 ? (
          <div style={{ textAlign: "center", color: colors.subtext, fontSize: 14, paddingTop: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            No matches yet. Like someone back to start chatting!
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: colors.subtext, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12, paddingLeft: 4 }}>Conversations</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {matches.map(m => {
                const photo = avatarUrl(m.other_user?.photos?.[0] ?? m.other_user?.avatar_url);
                const isOnline = m.other_user?.online_at && (Date.now() - new Date(m.other_user.online_at).getTime()) < 300000;
                return (
                  <div key={m.id} onClick={() => setActiveMatch(m)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 10px", borderRadius: 16, cursor: "pointer", background: m.unread_count > 0 ? "rgba(212,175,55,0.06)" : "transparent" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: colors.card, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 26 }}>🙂</span>}
                      </div>
                      {isOnline && <div style={{ position: "absolute", bottom: 2, right: 2, width: 12, height: 12, borderRadius: "50%", background: "#22C55E", border: `2.5px solid ${colors.bg}` }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: m.unread_count > 0 ? 800 : 600, color: colors.text }}>{m.other_user?.name}</span>
                        <span style={{ fontSize: 11, color: m.unread_count > 0 ? "#D4AF37" : colors.subtext, fontWeight: m.unread_count > 0 ? 700 : 400 }}>{timeAgo(m.last_message_at)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, color: m.unread_count > 0 ? colors.text : colors.subtext, fontWeight: m.unread_count > 0 ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{m.last_message ?? "Matched! Say hello 👋🏾"}</span>
                        {m.unread_count > 0 && <div style={{ minWidth: 20, height: 20, borderRadius: 50, background: "#FF3366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", padding: "0 6px" }}>{m.unread_count}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}