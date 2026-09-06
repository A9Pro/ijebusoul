"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main style={{
      minHeight: "100dvh",
      width: "100%",
      position: "relative",
      fontFamily: "system-ui, -apple-system, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-end",
      padding: "0 24px 52px",
      maxWidth: 430,
      margin: "0 auto",
      overflow: "hidden",
    }}>

      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "url('/ijebu-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundColor: "#1a0a00",
        zIndex: 0,
      }} />

      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.82) 70%, rgba(0,0,0,0.95) 100%)",
        zIndex: 1,
      }} />

      <div style={{
        position: "absolute",
        top: 52, left: 0, right: 0,
        display: "flex", justifyContent: "center",
        zIndex: 2,
      }}>
        <div style={{
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 50, padding: "8px 20px",
        }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
            ìjèbú<span style={{ color: "#D4AF37" }}>soul</span>
          </span>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 380 }}>
        <h1 style={{
          fontSize: 38, fontWeight: 900, color: "#fff",
          letterSpacing: "-0.03em", lineHeight: 1.1,
          marginBottom: 10, textAlign: "left",
        }}>
          Find love rooted<br />
          in <span style={{ color: "#D4AF37" }}>Ìjèbú culture</span>
        </h1>

        <p style={{
          fontSize: 15, color: "rgba(255,255,255,0.7)",
          lineHeight: 1.6, marginBottom: 32,
          textAlign: "left", fontWeight: 400,
        }}>
          Connect with real people who share your heritage, your language, and your values.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ display: "flex" }}>
            {["👩🏾", "👨🏿", "👩🏿", "🧑🏾"].map((em, i) => (
              <div key={i} style={{
                width: 34, height: 34, borderRadius: "50%",
                border: "2px solid #fff",
                background: ["#FFDEE9", "#D0E8FF", "#D1FAE5", "#FEF3C7"][i],
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, marginLeft: i === 0 ? 0 : -10,
                position: "relative", zIndex: 4 - i,
              }}>{em}</div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
            2,400+ locals already matched
          </p>
        </div>

        <button
          onClick={() => router.push("/onboarding")}
          style={{
            width: "100%", background: "#D4AF37",
            color: "#000", fontSize: 16, fontWeight: 800,
            border: "none", padding: "18px 0",
            borderRadius: 14, cursor: "pointer",
            marginBottom: 12, letterSpacing: "-0.01em",
          }}>
          Create my profile ✨
        </button>

        <button
          onClick={() => router.push("/login")}
          style={{
            width: "100%", background: "rgba(255,255,255,0.12)",
            color: "#fff", fontSize: 16, fontWeight: 600,
            border: "1.5px solid rgba(255,255,255,0.35)",
            padding: "17px 0", borderRadius: 14,
            cursor: "pointer", marginBottom: 24,
          }}>
          Log in
        </button>

        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, textAlign: "center" }}>
          By continuing you agree to our{" "}
          <span style={{ textDecoration: "underline", color: "rgba(255,255,255,0.6)" }}>Terms</span>
          {" "}and{" "}
          <span style={{ textDecoration: "underline", color: "rgba(255,255,255,0.6)" }}>Privacy Policy</span>
        </p>
      </div>
    </main>
  );
}