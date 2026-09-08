"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const inputStyle = {
  width: "100%", background: "rgba(255,255,255,0.1)",
  border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 14,
  padding: "16px 18px", fontSize: 16, color: "#fff", outline: "none",
  fontFamily: "system-ui, sans-serif",
} as React.CSSProperties;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [validLink, setValidLink]     = useState(false);
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [done, setDone]               = useState(false);

  // Supabase's client automatically parses the recovery link's access_token
  // from the URL and establishes a session before this runs — we just need
  // to confirm a session actually exists (link wasn't expired/already used).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidLink(!!session);
      setCheckingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setValidLink(true);
        setCheckingSession(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(() => router.replace("/home"), 1800);
  };

  return (
    <main style={{ minHeight: "100dvh", width: "100%", position: "relative", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "0 24px 52px", maxWidth: 430, margin: "0 auto", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/ijebu-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center top", zIndex: 0 }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.88) 65%, rgba(0,0,0,0.97) 100%)", zIndex: 1 }} />

      <div style={{ position: "absolute", top: 52, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 2 }}>
        <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 50, padding: "8px 20px" }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>ìjèbú<span style={{ color: "#D4AF37" }}>soul</span></span>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 380 }}>

        {checkingSession ? (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Verifying link...</p>

        ) : !validLink ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 20, textAlign: "center" }}>⚠️</div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 12, textAlign: "center" }}>Link expired or invalid</h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 28, textAlign: "center", lineHeight: 1.6 }}>
              This reset link has expired or was already used. Request a new one to continue.
            </p>
            <button onClick={() => router.push("/forgot-password")} style={{ width: "100%", background: "#D4AF37", color: "#000", fontSize: 16, fontWeight: 800, border: "none", padding: "18px 0", borderRadius: 14, cursor: "pointer" }}>
              Request new link
            </button>
          </>

        ) : done ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 20, textAlign: "center" }}>✅</div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 12, textAlign: "center" }}>Password updated!</h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", textAlign: "center" }}>Taking you to your feed...</p>
          </>

        ) : (
          <>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>Set a new password</h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 28 }}>Make it something you'll remember.</p>

            {error && (
              <div style={{ background: "rgba(255,51,102,0.15)", border: "1px solid rgba(255,51,102,0.4)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#FF3366", marginBottom: 20 }}>{error}</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>New password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, paddingRight: 52 }} />
                  <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{showPass ? "Hide" : "Show"}</button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Confirm password</label>
                <input type={showPass ? "text" : "password"} placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === "Enter" && handleReset()} style={inputStyle} />
              </div>
            </div>

            <button onClick={handleReset} disabled={loading} style={{ width: "100%", background: loading ? "rgba(212,175,55,0.5)" : "#D4AF37", color: "#000", fontSize: 16, fontWeight: 800, border: "none", padding: "18px 0", borderRadius: 14, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Updating..." : "Update password"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}