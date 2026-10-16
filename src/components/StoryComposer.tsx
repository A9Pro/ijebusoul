"use client";
import { useEffect, useRef, useState } from "react";
import { X, Type as TypeIcon, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { prepareImage } from "@/lib/images";
import { MAX_STORY_IMAGE, MAX_STORY_VIDEO, STORY_BUCKET } from "@/lib/stories";

const GOLD = "#D4AF37";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const BG = ["#1a1a2e", "#2e1a1a", "#1a2e1e", "#2e2a1a", "#241a2e", "#1a2830", "#000000", "#3a2a1a"];
const MAX_CAPTION = 200;

export default function StoryComposer({ userId, onClose, onCreated }: { userId: string; onClose: () => void; onCreated: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"text" | "media">("text");
  const [caption, setCaption] = useState("");
  const [bg, setBg] = useState(BG[0]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [kind, setKind] = useState<"photo" | "video">("photo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const video = f.type.startsWith("video/");
    if (!video && !f.type.startsWith("image/")) { setError("Choose a photo or a video."); return; }
    if (f.size > (video ? MAX_STORY_VIDEO : MAX_STORY_IMAGE)) { setError(video ? "Video must be under 60MB." : "Photo must be under 15MB."); return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f); setPreview(URL.createObjectURL(f)); setKind(video ? "video" : "photo"); setMode("media"); setError("");
  };

  const share = async () => {
    if (busy) return;
    if (mode === "text" && !caption.trim()) { setError("Write something first."); return; }
    if (mode === "media" && !file) { setError("Choose a photo or video."); return; }
    setBusy(true); setError("");
    try {
      let path: string | null = null;
      if (mode === "media" && file) {
        const toSend = await prepareImage(file); // big photos are shrunk first, so stories open instantly
        const ext = toSend.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg");
        path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(STORY_BUCKET).upload(path, toSend, { contentType: toSend.type });
        if (upErr) throw upErr;
      }
      const { error: insErr } = await supabase.from("stories").insert({
        user_id: userId,
        type: mode === "text" ? "text" : kind,
        media_url: path,
        caption: caption.trim() || null,
        bg_color: mode === "text" ? bg : null,
      });
      if (insErr) throw insErr;
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const seg = (on: boolean): React.CSSProperties => ({ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 42, borderRadius: 50, border: on ? "none" : "1px solid rgba(255,255,255,.18)", fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 18, cursor: "pointer", color: on ? "#1a1204" : "#fff", background: on ? "linear-gradient(180deg,#f6e08a,#D4AF37)" : "rgba(255,255,255,.06)" });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 480, background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, maxHeight: "94dvh", overflowY: "auto", borderRadius: "30px 30px 0 0", background: "linear-gradient(180deg,#14120d,#0b0a0e)", borderTop: "1px solid rgba(212,175,55,.45)", padding: "24px 20px calc(26px + env(safe-area-inset-bottom,0px))", color: "#fff", display: "flex", flexDirection: "column", gap: 16, fontFamily: "system-ui" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 32, lineHeight: 1 }}>Your story</h2>
            <p style={{ margin: "4px 0 0", fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: "rgba(255,255,255,.55)" }}>Here for 24 hours, then gone</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: "50%", border: 0, background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button style={seg(mode === "text")} onClick={() => setMode("text")}><TypeIcon size={16} /> Words</button>
          <button style={seg(mode === "media")} onClick={() => (file ? setMode("media") : fileRef.current?.click())}><ImageIcon size={16} /> Photo or video</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={pick} style={{ display: "none" }} />

        {mode === "text" ? (
          <>
            <div style={{ borderRadius: 22, minHeight: 220, padding: "30px 24px", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(60% 45% at 25% 20%, rgba(212,175,55,.3), transparent 70%), ${bg}`, transition: "background .2s" }}>
              <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontSize: caption.length > 90 ? 22 : 30, lineHeight: 1.35, textAlign: "center", color: "#fff" }}>{caption.trim() ? `“${caption}”` : "Your words will glow here"}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {BG.map(c => <button key={c} onClick={() => setBg(c)} aria-label={`Background ${c}`} style={{ width: 32, height: 32, borderRadius: "50%", background: c, cursor: "pointer", border: bg === c ? `2px solid ${GOLD}` : "2px solid rgba(255,255,255,.15)" }} />)}
            </div>
          </>
        ) : (
          <div onClick={() => fileRef.current?.click()} style={{ borderRadius: 22, height: 320, overflow: "hidden", cursor: "pointer", background: "rgba(255,255,255,.04)", border: preview ? "none" : "2px dashed rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {preview ? (kind === "video" ? <video src={preview} muted playsInline autoPlay loop style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 19, color: "rgba(255,255,255,.55)" }}>Tap to choose</span>}
          </div>
        )}

        <textarea value={caption} onChange={e => setCaption(e.target.value.slice(0, MAX_CAPTION))} rows={mode === "text" ? 3 : 2} placeholder={mode === "text" ? "Write something…" : "Add a caption…"}
          style={{ resize: "none", borderRadius: 16, padding: "14px 16px", fontSize: 15, lineHeight: 1.5, color: "#fff", outline: "none", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", fontFamily: "system-ui" }} />
        <div style={{ textAlign: "right", fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: -10 }}>{caption.length}/{MAX_CAPTION}</div>

        {error && <div role="alert" style={{ borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#ff6b88", background: "rgba(255,51,102,.12)", border: "1px solid rgba(255,51,102,.3)" }}>{error}</div>}

        <button onClick={share} disabled={busy} style={{ height: 54, borderRadius: 50, border: 0, fontSize: 15, fontWeight: 800, letterSpacing: ".02em", color: "#1a1204", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, background: "linear-gradient(180deg,#f6e08a,#D4AF37 48%,#a9801a)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.55), 0 8px 22px -6px rgba(212,175,55,.5)" }}>
          {busy ? (kind === "video" && file ? "Uploading video…" : "Sharing…") : "Share to your story"}
        </button>
      </div>
    </div>
  );
}