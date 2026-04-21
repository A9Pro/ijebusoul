"use client";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";

const MATCHES = [
  { id: 1, name: "Adunola", emoji: "👩🏾", bg: "#FFDEE9", online: true  },
  { id: 2, name: "Segun",   emoji: "👨🏿", bg: "#D0E8FF", online: false },
  { id: 3, name: "Temi",    emoji: "👩🏿", bg: "#D1FAE5", online: true  },
  { id: 4, name: "Femi",    emoji: "🧑🏾", bg: "#FEF3C7", online: false },
  { id: 5, name: "Kemi",    emoji: "👩🏾", bg: "#EDE9FF", online: true  },
  { id: 6, name: "Dare",    emoji: "👨🏾", bg: "#FFE4CC", online: false },
];

const CONVERSATIONS = [
  { id: 1, name: "Adunola", emoji: "👩🏾", bg: "#FFDEE9", online: true,  unread: 3, lastMessage: "Haha yes! Suya for life 🔥",           time: "2m ago"     },
  { id: 3, name: "Temi",    emoji: "👩🏿", bg: "#D1FAE5", online: true,  unread: 0, lastMessage: "That's so true about Ijebu people 😂", time: "18m ago"    },
  { id: 5, name: "Kemi",    emoji: "👩🏾", bg: "#EDE9FF", online: true,  unread: 1, lastMessage: "Are you free this weekend?",            time: "1h ago"     },
  { id: 2, name: "Segun",   emoji: "👨🏿", bg: "#D0E8FF", online: false, unread: 0, lastMessage: "I'll get back to you on that 🙏🏾",    time: "3h ago"     },
  { id: 4, name: "Femi",    emoji: "🧑🏾", bg: "#FEF3C7", online: false, unread: 0, lastMessage: "Nice talking to you!",                 time: "Yesterday"  },
  { id: 6, name: "Dare",    emoji: "👨🏾", bg: "#FFE4CC", online: false, unread: 0, lastMessage: "Let's link up sometime",               time: "2 days ago" },
];

export default function ChatsPage() {
  const [activeConvo, setActiveConvo] = useState<number | null>(null);
  const [messages, setMessages] = useState<Record<number, { text: string; mine: boolean; time: string }[]>>({
    1: [
      { text: "Hey! I saw your profile 😊",               mine: false, time: "10:02" },
      { text: "Hiii! You're from Ijebu Ode too?",         mine: true,  time: "10:04" },
      { text: "Yes! Born and raised 🙌🏾 You like suya?", mine: false, time: "10:05" },
      { text: "Haha yes! Suya for life 🔥",               mine: false, time: "10:06" },
    ],
    3: [
      { text: "Your bio had me laughing 😂",           mine: false, time: "9:30" },
      { text: "Lol which part? 😅",                   mine: true,  time: "9:32" },
      { text: "That's so true about Ijebu people 😂", mine: false, time: "9:33" },
    ],
    5: [
      { text: "Hi! Matched with you earlier", mine: false, time: "8:00" },
      { text: "Hey! Yes I saw 😊",            mine: true,  time: "8:10" },
      { text: "Are you free this weekend?",   mine: false, time: "8:15" },
    ],
  });
  const [draft, setDraft] = useState("");

  const sendMessage = (convoId: number) => {
    if (!draft.trim()) return;
    setMessages((prev) => ({
      ...prev,
      [convoId]: [...(prev[convoId] || []), { text: draft.trim(), mine: true, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }],
    }));
    setDraft("");
  };

  const totalUnread = CONVERSATIONS.reduce((sum, c) => sum + c.unread, 0);

  // ── Conversation view ──
  if (activeConvo !== null) {
    const convo = CONVERSATIONS.find((c) => c.id === activeConvo)!;
    const msgs  = messages[activeConvo] || [];

    return (
      <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "52px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0a0a" }}>
          <button onClick={() => setActiveConvo(null)} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: convo.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, position: "relative" }}>
            {convo.emoji}
            {convo.online && <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: "#22C55E", border: "2px solid #0a0a0a" }} />}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{convo.name}</div>
            <div style={{ fontSize: 12, color: convo.online ? "#22C55E" : "rgba(255,255,255,0.35)", fontWeight: 500 }}>{convo.online ? "Online now" : "Offline"}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {msgs.length === 0 && <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 14, marginTop: 60 }}>Say hi to {convo.name} 👋🏾</div>}
          {msgs.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.mine ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "72%", background: msg.mine ? "#D4AF37" : "rgba(255,255,255,0.1)", color: msg.mine ? "#000" : "#fff", borderRadius: msg.mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "11px 15px", fontSize: 14, lineHeight: 1.5 }}>
                <div>{msg.text}</div>
                <div style={{ fontSize: 10, marginTop: 4, color: msg.mine ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.35)", textAlign: "right" }}>{msg.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 16px 36px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 10, alignItems: "center", background: "#0a0a0a" }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage(activeConvo)} placeholder={`Message ${convo.name}...`} style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 50, padding: "13px 18px", fontSize: 14, color: "#fff", outline: "none", fontFamily: "system-ui, sans-serif" }} />
          <button onClick={() => sendMessage(activeConvo)} style={{ width: 46, height: 46, borderRadius: "50%", background: "#D4AF37", border: "none", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
        </div>
      </main>
    );
  }

  // ── Chats list view ──
  return (
    <main style={{ minHeight: "100dvh", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

      <div style={{ padding: "52px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>Messages</h1>
          {totalUnread > 0 && <div style={{ background: "#FF3366", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 50 }}>{totalUnread} unread</div>}
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{CONVERSATIONS.filter(c => c.online).length} matches online now</p>
      </div>

      <div style={{ padding: "0 20px 20px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Recent matches</p>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 4 }}>
          {MATCHES.map((m) => (
            <div key={m.id} onClick={() => setActiveConvo(m.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: 58, height: 58, borderRadius: "50%", background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, border: m.online ? "2.5px solid #22C55E" : "2.5px solid rgba(255,255,255,0.1)" }}>{m.emoji}</div>
                {m.online && <div style={{ position: "absolute", bottom: 2, right: 2, width: 13, height: 13, borderRadius: "50%", background: "#22C55E", border: "2.5px solid #0a0a0a" }} />}
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{m.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 20px 16px" }} />

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12, paddingLeft: 4 }}>Conversations</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {CONVERSATIONS.map((c) => (
            <div key={c.id} onClick={() => setActiveConvo(c.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 10px", borderRadius: 16, cursor: "pointer", background: c.unread > 0 ? "rgba(212,175,55,0.06)" : "transparent", transition: "background 0.15s" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{c.emoji}</div>
                {c.online && <div style={{ position: "absolute", bottom: 2, right: 2, width: 12, height: 12, borderRadius: "50%", background: "#22C55E", border: "2.5px solid #0a0a0a" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: c.unread > 0 ? 800 : 600, color: "#fff" }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: c.unread > 0 ? "#D4AF37" : "rgba(255,255,255,0.3)", fontWeight: c.unread > 0 ? 700 : 400 }}>{c.time}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: c.unread > 0 ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)", fontWeight: c.unread > 0 ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{c.lastMessage}</span>
                  {c.unread > 0 && <div style={{ minWidth: 20, height: 20, borderRadius: 50, background: "#FF3366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", padding: "0 6px", flexShrink: 0 }}>{c.unread}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}