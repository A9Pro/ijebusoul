"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function MatchOfWeekPage() {
  const [data, setData] = useState<{ name1: string; name2: string; story: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase.rpc("get_match_of_week");
      setData(rows?.[0] ?? null);
      setLoading(false);
    })();
  }, []);

  return (
    <main style={{ minHeight: "100dvh", width: "100%", maxWidth: 430, margin: "0 auto", background: "#0a0a0a", fontFamily: "system-ui", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
      <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 24 }}>
        ìjèbú<span style={{ color: "#D4AF37" }}>soul</span>
      </span>

      {loading ? (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading...</p>
      ) : !data ? (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>No Match of the Week yet — check back soon ❤️</p>
      ) : (
        <>
          <div style={{ fontSize: 40, marginBottom: 12 }}>❤️</div>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>
            ìjèbú soul Match of the Week
          </h1>
          <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 20, letterSpacing: "-0.02em" }}>
            {data.name1} & {data.name2}
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.7, fontStyle: "italic", maxWidth: 340 }}>
            "{data.story}"
          </p>
        </>
      )}

      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 40 }}>Love • Culture • Connection ❤️</p>
    </main>
  );
}