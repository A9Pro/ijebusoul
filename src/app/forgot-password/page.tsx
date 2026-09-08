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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [sent, setSent]       = useState(false);

  const handleSend = async () => {
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  };

  return (
    <main style={{ minHeight: "100dvh", width: "100%", position: "relative", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "0 24px 52px", maxWidth: 430, margin: "0 auto", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/ijebu-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center top", zIndex: 0 }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.88) 65%, rgba(0,0,0,0.97) 100%)", zIndex: 1 }} />

      <button onClick={() => router.push("/login")} style={{ position: "absolute", top: 44, left: 24, zIndex: 4, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 50, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: "#fff" }}>←</button>

      <div style={{ position: "absolute", top: 52, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 2 }}>
        <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 50, padding: "8px 20px" }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>ìjèbú<span style={{ color: "#D4AF37" }}>soul</span></span>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 380 }}>

        {!sent ? (
          <>
            <h1 style={{ fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>Forgot password?</h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 32 }}>
              Enter the email on your account and we'll send you a link to reset it.
            </p>

            {error && (
              <div style={{ background: "rgba(255,51,102,0.15)", border: "1px solid rgba(255,51,102,0.4)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#FF3366", marginBottom: 20 }}>{error}</div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                style={inputStyle}
              />
            </div>

            <button onClick={handleSend} disabled={loading} style={{ width: "100%", background: loading ? "rgba(212,175,55,0.5)" : "#D4AF37", color: "#000", fontSize: 16, fontWeight: 800, border: "none", padding: "18px 0", borderRadius: 14, cursor: loading ? "not-allowed" : "pointer", marginBottom: 20 }}>
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <p style={{ textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
              Remembered it?{" "}
              <span onClick={() => router.push("/login")} style={{ color: "#D4AF37", fontWeight: 700, cursor: "pointer" }}>Back to sign in</span>
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 20, textAlign: "center" }}>📬</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 12, textAlign: "center" }}>Check your email</h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: 8, textAlign: "center", lineHeight: 1.6 }}>
              We've sent a password reset link to <strong style={{ color: "#fff" }}>{email}</strong>.
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 32, textAlign: "center" }}>
              Check your spam/junk folder if you don't see it.
            </p>
            <button onClick={() => router.push("/login")} style={{ width: "100%", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 16, fontWeight: 600, border: "1.5px solid rgba(255,255,255,0.35)", padding: "17px 0", borderRadius: 14, cursor: "pointer" }}>
              Back to sign in
            </button>
          </>
        )}
      </div>
    </main>
  );
}