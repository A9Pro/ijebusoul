"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const inputStyle = {
  width: "100%", background: "rgba(255,255,255,0.1)",
  border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 14,
  padding: "16px 18px", fontSize: 16, color: "#fff", outline: "none",
  fontFamily: "system-ui, sans-serif",
} as React.CSSProperties;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSignIn = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push("/home");
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
        <h1 style={{ fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>Welcome back 👋</h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 32 }}>Sign in to continue your journey</p>

        {error && (
          <div style={{ background: "rgba(255,51,102,0.15)", border: "1px solid rgba(255,51,102,0.4)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#FF3366", marginBottom: 20 }}>{error}</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Password</label>
            <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSignIn()} style={{ ...inputStyle, paddingRight: 52 }} />
              <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{showPass ? "Hide" : "Show"}</button>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right", marginBottom: 28 }}>
          <span style={{ fontSize: 13, color: "#D4AF37", fontWeight: 600, cursor: "pointer" }}>Forgot password?</span>
        </div>

        <button onClick={handleSignIn} disabled={loading} style={{ width: "100%", background: loading ? "rgba(212,175,55,0.5)" : "#D4AF37", color: "#000", fontSize: 16, fontWeight: 800, border: "none", padding: "18px 0", borderRadius: 14, cursor: loading ? "not-allowed" : "pointer", marginBottom: 16 }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p style={{ textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
          Don't have an account?{" "}
          <span onClick={() => router.push("/onboarding")} style={{ color: "#D4AF37", fontWeight: 700, cursor: "pointer" }}>Create profile</span>
        </p>
      </div>
    </main>
  );
}