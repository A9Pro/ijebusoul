"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, avatarUrl } from "@/lib/supabase";

const GOLD = "#D4AF37";
const FALLBACK_FACES = ["👩🏾", "👨🏿", "👩🏿", "🧑🏾"]; // shown for any slot without a real photo yet
const EARLY_THRESHOLD = 50; // below this, show "be one of the first" instead of a small raw number
const ROTATING = ["heritage", "language", "values", "roots"];
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const TICKER = "CULTURE ✦ LANGUAGE ✦ HERITAGE ✦ LOVE ✦ ";

// Fixed values so server and client render identical markup (no hydration mismatch).
const SPARKS = [
  { left: 8, size: 3, dur: 11, delay: 0 },
  { left: 19, size: 2, dur: 14, delay: -4 },
  { left: 31, size: 4, dur: 12, delay: -7 },
  { left: 44, size: 2, dur: 15, delay: -2 },
  { left: 57, size: 3, dur: 10, delay: -9 },
  { left: 68, size: 2, dur: 13, delay: -5 },
  { left: 79, size: 4, dur: 16, delay: -11 },
  { left: 91, size: 3, dur: 12, delay: -3 },
];

// ── The Soul Ring: a slow-turning gold instrument that floats over the image ──
function SoulRing() {
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2;
    const long = i % 6 === 0;
    const r1 = long ? 130 : 135;
    const r2 = 142;
    return {
      i, long,
      x1: (150 + r1 * Math.cos(a)).toFixed(2), y1: (150 + r1 * Math.sin(a)).toFixed(2),
      x2: (150 + r2 * Math.cos(a)).toFixed(2), y2: (150 + r2 * Math.sin(a)).toFixed(2),
    };
  });
  const origin = { transformOrigin: "150px 150px" } as const;

  return (
    <svg viewBox="0 0 300 300" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="lpRingG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3dc7a" />
          <stop offset="1" stopColor="#b8901f" />
        </linearGradient>
        <radialGradient id="lpOrb">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.4" stopColor="#f3dc7a" stopOpacity="0.3" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="150" cy="150" r="146" fill="none" stroke="url(#lpRingG)" strokeOpacity="0.55" strokeWidth="0.8" />

      <g className="lp-spin-slow" style={origin}>
        {ticks.map(t => (
          <line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={GOLD}
            strokeOpacity={t.long ? 0.85 : 0.35} strokeWidth={t.long ? 1.2 : 0.6} />
        ))}
      </g>

      <g className="lp-spin-rev" style={origin}>
        <circle cx="150" cy="150" r="112" fill="none" stroke={GOLD} strokeOpacity="0.4" strokeWidth="0.8" strokeDasharray="2 7" />
        <circle cx="262" cy="150" r="9" fill={GOLD} fillOpacity="0.18" />
        <circle cx="262" cy="150" r="3.4" fill="#f3dc7a" />
      </g>

      <g className="lp-spin-fast" style={origin}>
        <circle cx="150" cy="150" r="84" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="0.6" />
        <circle cx="66" cy="150" r="7" fill="#fff" fillOpacity="0.15" />
        <circle cx="66" cy="150" r="2.6" fill="#fff" />
      </g>

      <g className="lp-spin-slow" style={origin}>
        <circle cx="150" cy="4" r="8" fill={GOLD} fillOpacity="0.2" />
        <circle cx="150" cy="4" r="3" fill="#f3dc7a" />
      </g>

      {/* the soul: a breathing orb inside two counter-turning diamonds */}
      <circle className="lp-pulse" cx="150" cy="150" r="46" fill="url(#lpOrb)" style={origin} />
      <g className="lp-spin-rev" style={origin}>
        <path d="M150 112 L188 150 L150 188 L112 150 Z" fill="none" stroke="url(#lpRingG)" strokeWidth="1" strokeOpacity="0.9" />
      </g>
      <g className="lp-spin-slow" style={origin}>
        <path d="M150 128 L172 150 L150 172 L128 150 Z" fill="none" stroke="#fff" strokeWidth="0.8" strokeOpacity="0.55" />
      </g>
    </svg>
  );
}

function HomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rootRef = useRef<HTMLElement>(null);
  const reduceMotion = useRef(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [shown, setShown] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [avatars, setAvatars] = useState<string[]>([]);

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;
    try { localStorage.setItem("ijebu-referral-code", ref); } catch { /* storage unavailable */ }
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_user_count");
      if (!error && typeof data === "number") setUserCount(data);
    })();
  }, []);

  // Real member photos for the avatar stack (photos only, no names).
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_landing_avatars", { n: 4 });
      if (error || !Array.isArray(data)) return;
      const urls = (data as { photo: string | null }[])
        .map(r => (r.photo ? avatarUrl(r.photo) : null))
        .filter((u): u is string => !!u);
      setAvatars(urls.slice(0, 4));
    })();
  }, []);

  // Count up to the real number of members.
  useEffect(() => {
    if (userCount === null || userCount < EARLY_THRESHOLD) return;
    if (reduceMotion.current) { setShown(userCount); return; }
    let raf = 0;
    const start = performance.now();
    const dur = 1500;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setShown(Math.round(userCount * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [userCount]);

  useEffect(() => {
    const t = setInterval(() => setWordIdx(i => (i + 1) % ROTATING.length), 2400);
    return () => clearInterval(t);
  }, []);

  // The image breathes with your finger or cursor: parallax plus a warm light that follows you.
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = rootRef.current;
    if (!el || reduceMotion.current) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--px", String((x - 0.5) * 2));
    el.style.setProperty("--py", String((y - 0.5) * 2));
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };
  const onLeave = () => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "30%");
  };

  const countLabel =
    userCount === null
      ? "Real Ìjèbú people, real connections"
      : userCount >= EARLY_THRESHOLD
        ? `${shown.toLocaleString()}+ Ìjèbú people already here`
        : "Be one of the first Ìjèbú souls here ❤️";

  const line1 = ["Find", "love", "rooted"];

  return (
    <main
      ref={rootRef}
      className="lp-root"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{
        minHeight: "100dvh",
        width: "100%",
        position: "relative",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 22px calc(36px + env(safe-area-inset-bottom, 0px))",
        maxWidth: 430,
        margin: "0 auto",
        overflow: "hidden",
        background: "#1a0a00",
      }}
    >
      <style>{`
        .lp-root { --px: 0; --py: 0; --mx: 50%; --my: 30%; }

        @keyframes lpZoom { from { transform: scale(1); } to { transform: scale(1.07); } }
        @keyframes lpDrop { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: none; } }
        @keyframes lpRise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        @keyframes lpFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lpWordIn { from { opacity: 0; transform: translateY(18px); filter: blur(8px); } to { opacity: 1; transform: none; filter: blur(0); } }
        @keyframes lpShimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes lpSpin { to { transform: rotate(360deg); } }
        @keyframes lpPulse { 0%, 100% { opacity: 0.55; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1.12); } }
        @keyframes lpRingIn { from { opacity: 0; transform: scale(0.8) rotate(-30deg); } to { opacity: 1; transform: none; } }
        @keyframes lpScan { from { transform: translateY(-30dvh); } to { transform: translateY(110dvh); } }
        @keyframes lpSpark { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 0.9; } 100% { transform: translateY(-62dvh); opacity: 0; } }
        @keyframes lpTicker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes lpSheen { 0% { transform: translateX(-130%) skewX(-20deg); } 60%, 100% { transform: translateX(260%) skewX(-20deg); } }
        @keyframes lpGlow {
          0%, 100% { box-shadow: 0 8px 28px rgba(212,175,55,0.35), 0 0 0 0 rgba(212,175,55,0.45); }
          50% { box-shadow: 0 8px 38px rgba(212,175,55,0.6), 0 0 0 9px rgba(212,175,55,0); }
        }
        @keyframes lpWord { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes lpDot { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
        @keyframes lpArrow { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }

        .lp-parallax { transition: transform 0.6s cubic-bezier(.2,.8,.2,1); will-change: transform; }
        .lp-bg { animation: lpZoom 26s ease-in-out infinite alternate; }
        .lp-logo { animation: lpDrop 0.8s cubic-bezier(.2,.8,.2,1) both; }
        .lp-ring { animation: lpRingIn 1.6s cubic-bezier(.2,.8,.2,1) 0.2s both; }
        .lp-spin-slow { animation: lpSpin 70s linear infinite; }
        .lp-spin-rev { animation: lpSpin 46s linear infinite reverse; }
        .lp-spin-fast { animation: lpSpin 22s linear infinite; }
        .lp-pulse { animation: lpPulse 4.2s ease-in-out infinite; }
        .lp-scan { animation: lpScan 9s linear infinite; }
        .lp-spark { animation-name: lpSpark; animation-timing-function: linear; animation-iteration-count: infinite; }

        .lp-w { display: inline-block; margin-right: 0.28em; animation: lpWordIn 0.9s cubic-bezier(.2,.8,.2,1) both; }
        .lp-gold {
          background: linear-gradient(90deg, #b8901f, #f3dc7a, #D4AF37, #f3dc7a, #b8901f);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          animation: lpWordIn 0.9s cubic-bezier(.2,.8,.2,1) 0.55s both, lpShimmer 5s linear infinite;
        }
        .lp-r1 { animation: lpRise 0.8s cubic-bezier(.2,.8,.2,1) 0.1s both; }
        .lp-r3 { animation: lpRise 0.8s cubic-bezier(.2,.8,.2,1) 0.85s both; }
        .lp-r4 { animation: lpRise 0.9s cubic-bezier(.2,.8,.2,1) 1s both; }
        .lp-word { display: inline-block; animation: lpWord 0.5s ease both; }

        .lp-ticker { display: flex; width: max-content; animation: lpTicker 22s linear infinite; }
        .lp-card-spin {
          position: absolute; top: 50%; left: 50%; width: 900px; height: 900px; margin: -450px 0 0 -450px;
          background: conic-gradient(from 0deg, transparent 0 62%, rgba(212,175,55,0.9) 80%, #fff 88%, rgba(212,175,55,0.9) 94%, transparent 100%);
          animation: lpSpin 7s linear infinite;
        }
        .lp-cta { position: relative; overflow: hidden; animation: lpGlow 2.8s ease-in-out infinite; transition: transform 0.15s ease, filter 0.2s ease; }
        .lp-cta:hover { filter: brightness(1.07); }
        .lp-cta:active { transform: scale(0.98); }
        .lp-sheen { position: absolute; top: 0; bottom: 0; left: 0; width: 38%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); animation: lpSheen 3.6s ease-in-out infinite; pointer-events: none; }
        .lp-arrow { display: inline-block; animation: lpArrow 1.6s ease-in-out infinite; }
        .lp-ghost { transition: background 0.2s ease, transform 0.15s ease; }
        .lp-ghost:hover { background: rgba(255,255,255,0.2) !important; }
        .lp-ghost:active { transform: scale(0.98); }
        .lp-cta:focus-visible, .lp-ghost:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }

        @media (prefers-reduced-motion: reduce) {
          .lp-parallax { transition: none; }
          .lp-bg, .lp-logo, .lp-ring, .lp-spin-slow, .lp-spin-rev, .lp-spin-fast, .lp-pulse, .lp-scan,
          .lp-spark, .lp-w, .lp-gold, .lp-r1, .lp-r3, .lp-r4, .lp-word, .lp-ticker,
          .lp-card-spin, .lp-cta, .lp-sheen, .lp-arrow { animation: none !important; }
          .lp-gold { color: ${GOLD}; -webkit-text-fill-color: ${GOLD}; background: none; }
        }
      `}</style>

      {/* the traditional image, unchanged. It now drifts gently against your touch. */}
      <div
        className="lp-parallax"
        style={{
          position: "absolute", inset: 0, zIndex: 0,
          transform: "translate3d(calc(var(--px) * -12px), calc(var(--py) * -12px), 0) scale(1.08)",
        }}
      >
        <div
          className="lp-bg"
          style={{
            position: "absolute", inset: 0,
            backgroundImage: "url('/ijebu-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center top",
            backgroundColor: "#1a0a00",
          }}
        />
      </div>

      {/* the Soul Ring floats over the image, moving the opposite way for depth */}
      <div
        className="lp-parallax"
        style={{
          position: "absolute", zIndex: 1, left: 0, right: 0, margin: "0 auto",
          top: "calc(88px + env(safe-area-inset-top, 0px))",
          width: "min(84vw, 350px)", aspectRatio: "1 / 1", pointerEvents: "none",
          transform: "translate3d(calc(var(--px) * 16px), calc(var(--py) * 16px), 0)",
        }}
      >
        <div className="lp-ring" style={{ width: "100%", height: "100%", opacity: 0.8 }}>
          <SoulRing />
        </div>
      </div>

      {/* warm light that follows the finger or cursor */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", mixBlendMode: "screen",
          background: "radial-gradient(240px circle at var(--mx) var(--my), rgba(212,175,55,0.26), transparent 70%)",
        }}
      />

      {/* readability gradient */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.82) 70%, rgba(0,0,0,0.95) 100%)",
        }}
      />

      {/* a thin band of light sweeps down the image */}
      <div aria-hidden style={{ position: "absolute", left: 0, right: 0, top: 0, height: "100%", zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
        <div
          className="lp-scan"
          style={{
            position: "absolute", left: 0, right: 0, top: 0, height: 140,
            background: "linear-gradient(to bottom, transparent, rgba(212,175,55,0.10) 50%, transparent)",
          }}
        />
      </div>

      {/* drifting gold sparks */}
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="lp-spark"
            style={{
              position: "absolute", left: `${s.left}%`, bottom: -8, width: s.size, height: s.size,
              borderRadius: "50%", background: GOLD, boxShadow: `0 0 10px ${GOLD}`,
              animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* logo */}
      <div
        style={{
          position: "absolute", top: "calc(48px + env(safe-area-inset-top, 0px))", left: 0, right: 0,
          display: "flex", justifyContent: "center", zIndex: 3,
        }}
      >
        <div
          className="lp-logo"
          style={{
            background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.25)", borderRadius: 50, padding: "8px 20px",
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
            ìjèbú<span style={{ color: GOLD }}>soul</span>
          </span>
        </div>
      </div>

      {/* content */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 386 }}>
        <div
          className="lp-r1"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)", marginBottom: 12,
          }}
        >
          <span style={{ width: 22, height: 1.5, background: GOLD, display: "inline-block" }} />
          Ẹ káàbọ̀
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 12, textAlign: "left" }}>
          <span style={{ display: "block" }}>
            {line1.map((w, i) => (
              <span key={w} className="lp-w" style={{ animationDelay: `${0.25 + i * 0.1}s` }}>{w}</span>
            ))}
          </span>
          <span style={{ display: "block", marginTop: 2 }}>
            <span className="lp-w" style={{ animationDelay: "0.55s" }}>in</span>
            <span
              className="lp-w lp-gold"
              style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 48, letterSpacing: "-0.01em", marginRight: 0 }}
            >
              Ìjèbú culture
            </span>
          </span>
        </h1>

        <p className="lp-r3" style={{ fontSize: 15, color: "rgba(255,255,255,0.76)", lineHeight: 1.6, marginBottom: 16, textAlign: "left", fontWeight: 400 }}>
          Connect with real people who share your{" "}
          <span key={wordIdx} className="lp-word" style={{ color: "#fff", fontWeight: 700, borderBottom: `2px solid ${GOLD}` }}>
            {ROTATING[wordIdx]}
          </span>
          , and the way you were raised.
        </p>

        {/* ticker */}
        <div
          className="lp-r3"
          aria-hidden
          style={{
            overflow: "hidden", marginBottom: 14,
            WebkitMaskImage: "linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)",
            maskImage: "linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)",
          }}
        >
          <div className="lp-ticker">
            {[0, 1, 2, 3].map(n => (
              <span key={n} style={{ whiteSpace: "pre", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(212,175,55,0.85)" }}>
                {TICKER}
              </span>
            ))}
          </div>
        </div>

        {/* glass card with a travelling light on its edge */}
        <div
          className="lp-r4"
          style={{ position: "relative", overflow: "hidden", borderRadius: 26, padding: 1.5, background: "rgba(255,255,255,0.1)" }}
        >
          <div className="lp-card-spin" aria-hidden />
          <div
            style={{
              position: "relative", borderRadius: 24.5, padding: "18px 16px 16px",
              background: "rgba(12,8,4,0.74)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", overflow: "hidden",
            }}
          >
            {/* adire-inspired lattice, barely there */}
            <svg aria-hidden width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.07, pointerEvents: "none" }}>
              <defs>
                <pattern id="lpAdire" width="26" height="26" patternUnits="userSpaceOnUse">
                  <path d="M13 2 L24 13 L13 24 L2 13 Z" fill="none" stroke={GOLD} strokeWidth="0.8" />
                  <circle cx="13" cy="13" r="1.6" fill={GOLD} />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#lpAdire)" />
            </svg>

            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ display: "flex" }}>
                  {FALLBACK_FACES.map((em, i) => (
                    <div
                      key={i}
                      style={{
                        width: 34, height: 34, borderRadius: "50%", border: "2px solid #fff",
                        background: ["#FFDEE9", "#D0E8FF", "#D1FAE5", "#FEF3C7"][i],
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, marginLeft: i === 0 ? 0 : -10, position: "relative", zIndex: 4 - i, overflow: "hidden",
                      }}
                    >
                      {avatars[i] ? (
                        <img
                          src={avatars[i]}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={() => setAvatars(a => a.filter(u => u !== avatars[i]))}
                        />
                      ) : em}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span
                    aria-hidden
                    style={{ width: 7, height: 7, borderRadius: "50%", background: "#3ddc84", boxShadow: "0 0 8px #3ddc84", flexShrink: 0, animation: "lpDot 2.4s ease-in-out infinite" }}
                  />
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", fontWeight: 500 }}>{countLabel}</p>
                </div>
              </div>

              <button
                className="lp-cta"
                onClick={() => router.push("/onboarding")}
                style={{
                  width: "100%", background: `linear-gradient(135deg, #e6c24f, ${GOLD} 55%, #b8901f)`,
                  color: "#000", fontSize: 16, fontWeight: 800, border: "none", padding: "18px 0",
                  borderRadius: 14, cursor: "pointer", marginBottom: 10, letterSpacing: "-0.01em",
                }}
              >
                <span className="lp-sheen" aria-hidden />
                Create my profile ✨ <span className="lp-arrow" aria-hidden>→</span>
              </button>

              <button
                className="lp-ghost"
                onClick={() => router.push("/login")}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 16, fontWeight: 600,
                  border: "1.5px solid rgba(255,255,255,0.3)", padding: "16px 0", borderRadius: 14, cursor: "pointer", marginBottom: 14,
                }}
              >
                Log in
              </button>

              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, textAlign: "center" }}>
                By continuing you agree to our{" "}
                <span style={{ textDecoration: "underline", color: "rgba(255,255,255,0.65)" }}>Terms</span>
                {" "}and{" "}
                <span style={{ textDecoration: "underline", color: "rgba(255,255,255,0.65)" }}>Privacy Policy</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}