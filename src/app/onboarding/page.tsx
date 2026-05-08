"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const IJEBU_AREAS = [
  { lga: "Ijebu Ode",        towns: ["Ijebu Ode","Porogun","Oke Aje","Igbeba","Ijagun","Odo-Esa","Ilese","Itamapako"] },
  { lga: "Ijebu North",      towns: ["Ijebu Igbo","Ago-Iwoye","Oru","Awa","Atikori","Japara","Mamu","Ojowo"] },
  { lga: "Ijebu North East", towns: ["Atan","Ogbere","Imobi","Ijebu Ife","Itele"] },
  { lga: "Ijebu East",       towns: ["Ogbere","Epe","Itele","Imushin"] },
  { lga: "Ijebu Waterside",  towns: ["Abigi","Iwopin","Makun-Omi","Ibiade","Oni"] },
  { lga: "Ogun Waterside",   towns: ["Igbogila","Ayetoro","Agbede","Irokun","Aheri","Ode-Omi"] },
  { lga: "Odogbolu",         towns: ["Odogbolu","Imagbon","Ijesa-Ijebu","Ala","Ibefun","Omu"] },
];

const LOOKING_FOR = [
  { id: "relationship", label: "Relationship", emoji: "💍", desc: "Serious & committed" },
  { id: "casual",       label: "Casual",       emoji: "🌊", desc: "Chill, no pressure" },
  { id: "fwb",          label: "FWB",          emoji: "🤙🏾", desc: "Friends with benefits" },
  { id: "friendship",   label: "Friendship",   emoji: "☕", desc: "Just vibes & connect" },
];

const GENDERS     = ["Man", "Woman", "Non-binary", "Prefer not to say"];
const PREFERENCES = ["Men", "Women", "Everyone"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.1)",
  border: "1.5px solid rgba(255,255,255,0.25)",
  borderRadius: 14,
  padding: "16px 18px",
  fontSize: 16,
  color: "#fff",
  outline: "none",
  fontFamily: "system-ui",
};

interface ShellProps {
  children: React.ReactNode;
  progress: number;
  onBack: () => void;
}

const Shell = ({ children, progress, onBack }: ShellProps) => (
  <main style={{ minHeight: "100dvh", width: "100%", position: "relative", fontFamily: "system-ui", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "0 24px 52px", maxWidth: 430, margin: "0 auto", overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/ijebu-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center top", backgroundColor: "#1a0a00", zIndex: 0 }} />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.88) 65%, rgba(0,0,0,0.97) 100%)", zIndex: 1 }} />
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.15)", zIndex: 3 }}>
      <div style={{ height: "100%", background: "#D4AF37", width: `${progress}%`, transition: "width 0.4s ease" }} />
    </div>
    <button onClick={onBack} style={{ position: "absolute", top: 44, left: 24, zIndex: 4, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 50, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: "#fff" }}>←</button>
    <div style={{ position: "absolute", top: 52, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 2 }}>
      <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 50, padding: "8px 20px" }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>ìjèbú<span style={{ color: "#D4AF37" }}>soul</span></span>
      </div>
    </div>
    <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 380 }}>{children}</div>
  </main>
);

interface NextBtnProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
}

const NextBtn = ({ onClick, label = "Continue →", disabled = false, loading = false }: NextBtnProps) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    style={{
      width: "100%",
      background: disabled || loading ? "rgba(212,175,55,0.3)" : "#D4AF37",
      color: disabled || loading ? "rgba(0,0,0,0.35)" : "#000",
      fontSize: 16,
      fontWeight: 800,
      border: "none",
      padding: "18px 0",
      borderRadius: 14,
      cursor: disabled || loading ? "not-allowed" : "pointer",
      marginTop: 24,
    }}
  >
    {loading ? "Please wait..." : label}
  </button>
);

export default function OnboardingPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep]                     = useState(0);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [userId, setUserId]                 = useState<string | null>(null);
  const [photos, setPhotos]                 = useState<{ file: File; preview: string }[]>([]);
  const [otp, setOtp]                       = useState("");
  const [resendSent, setResendSent]         = useState(false);
  const [resendLoading, setResendLoading]   = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    email: "", password: "", name: "", age: "", gender: "",
    preference: "", location: "", lookingFor: "", bio: "",
  });

  const progress = (step / 8) * 100;
  const update   = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const errorBox = error ? (
    <div style={{ background: "rgba(255,51,102,0.15)", border: "1px solid rgba(255,51,102,0.4)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#FF3366", marginBottom: 20, wordBreak: "break-word" }}>
      {error}
    </div>
  ) : null;

  // ── 60-second resend cooldown ─────────────────────────────────────────────────
  const startCooldown = () => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Photo handling ────────────────────────────────────────────────────────────
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const preview = URL.createObjectURL(file);
      setPhotos(p => [...p, { file, preview }].slice(0, 6));
    });
  };

  const uploadPhotos = async (uid: string): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const { file } = photos[i];
      const ext  = file.name.split(".").pop();
      const path = `${uid}/${Date.now()}_${i}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw new Error(`Photo upload failed: ${uploadErr.message}`);
      const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  // ── canNext ───────────────────────────────────────────────────────────────────
  const canNext = () => {
    if (step === 0) return form.email.includes("@") && form.password.length >= 6;
    if (step === 1) return otp.trim().length === 6;
    if (step === 2) return !!form.name.trim() && !!form.age.trim();
    if (step === 3) return !!form.gender && !!form.preference;
    if (step === 4) return !!form.location;
    if (step === 5) return !!form.lookingFor;
    if (step === 6) return photos.length > 0;
    if (step === 7) return form.bio.trim().length > 10;
    return true;
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setError("");
    setResendSent(false);
    setResendLoading(true);
    const { error: resendErr } = await supabase.auth.resend({
      type: "signup",
      email: form.email,
    });
    setResendLoading(false);
    if (resendErr) {
      setError(resendErr.message);
    } else {
      setResendSent(true);
      startCooldown();
    }
  };

  // ── Main next handler ─────────────────────────────────────────────────────────
  const next = async () => {
    setError("");

    // Step 0: Sign up
    if (step === 0) {
      setLoading(true);
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { onboarding: true } },
      });
      setLoading(false);
      if (signUpErr) { setError(signUpErr.message); return; }
      const uid = data.user?.id ?? null;
      if (!uid) { setError("Signup failed — no user returned."); return; }
      setUserId(uid);
      startCooldown();
      setStep(1);
      return;
    }

    // Step 1: Verify OTP
    if (step === 1) {
      setLoading(true);
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: form.email,
        token: otp.trim(),
        type: "signup",
      });
      setLoading(false);
      if (verifyErr) {
        setError("Invalid or expired code. Please try again or request a new one.");
        return;
      }
      setStep(2);
      return;
    }

    // Step 7: Upload photos + insert profile
    if (step === 7) {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = userId ?? sessionData?.session?.user?.id ?? null;
      if (!uid) {
        setError("Session expired. Please go back to step 1 and start again.");
        setLoading(false);
        return;
      }

      let photoUrls: string[] = [];
      try {
        photoUrls = await uploadPhotos(uid);
      } catch (uploadErr: unknown) {
        setError(uploadErr instanceof Error ? uploadErr.message : "Photo upload failed.");
        setLoading(false);
        return;
      }

      const { error: profileErr } = await supabase.from("profiles").insert({
        id:          uid,
        name:        form.name,
        age:         parseInt(form.age),
        gender:      form.gender,
        preference:  form.preference,
        location:    form.location,
        looking_for: form.lookingFor,
        bio:         form.bio,
        photos:      photoUrls,
        avatar_url:  photoUrls[0] ?? null,
        interests:   [],
      });

      if (profileErr) {
        setError(`Profile error: ${profileErr.message} | Code: ${profileErr.code} | Details: ${profileErr.details ?? "none"}`);
        setLoading(false);
        return;
      }

      router.push("/home");
      return;
    }

    setStep(s => s + 1);
  };

  const back = () => (step > 0 ? setStep(s => s - 1) : router.back());

  // ── Step 0: Account ───────────────────────────────────────────────────────────
  if (step === 0) return (
    <Shell progress={progress} onBack={back}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Step 1 of 7</p>
      <h1 style={{ fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>Create your account</h1>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 28 }}>You'll use these to log in.</p>
      {errorBox}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Email</label>
          <input type="email" placeholder="you@example.com" value={form.email} onChange={e => update("email", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Password (min 6 characters)</label>
          <input type="password" placeholder="••••••••" value={form.password} onChange={e => update("password", e.target.value)} style={inputStyle} />
        </div>
      </div>
      <NextBtn onClick={next} disabled={!canNext()} loading={loading} label="Create account →" />
    </Shell>
  );

  // ── Step 1: OTP Verification ──────────────────────────────────────────────────
  if (step === 1) return (
    <Shell progress={progress} onBack={back}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Step 1 of 7</p>

      {/* Welcome banner */}
      <div style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 16, padding: "16px 18px", marginBottom: 28, display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ fontSize: 24, flexShrink: 0 }}>🎉</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#D4AF37", marginBottom: 4 }}>Welcome to ìjèbúsoul!</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
            Your account has been created. We've sent a 6-digit confirmation code to{" "}
            <strong style={{ color: "#fff" }}>{form.email}</strong>.
          </div>
        </div>
      </div>

      <h1 style={{ fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>Check your email</h1>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 28 }}>
        Enter the 6-digit code we sent you. Check your{" "}
        <strong style={{ color: "#fff" }}>spam/junk</strong> folder if you don't see it.
      </p>

      {errorBox}

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Confirmation code</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="123456"
          maxLength={6}
          value={otp}
          onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
          style={{ ...inputStyle, fontSize: 28, fontWeight: 800, letterSpacing: "0.25em", textAlign: "center" }}
          autoFocus
        />
      </div>

      <NextBtn onClick={next} disabled={!canNext()} loading={loading} label="Verify & continue →" />

      {/* ── Resend section ──────────────────────────────────────────────────── */}
      <div style={{ marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 20 }}>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textAlign: "center", marginBottom: 12 }}>
          Didn't receive a code?
        </p>

        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || resendLoading}
          style={{
            width: "100%",
            background: resendCooldown > 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
            border: `1.5px solid ${resendCooldown > 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.25)"}`,
            borderRadius: 14,
            color: resendCooldown > 0 ? "rgba(255,255,255,0.3)" : "#fff",
            fontSize: 15,
            fontWeight: 700,
            padding: "16px 0",
            cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {resendLoading
            ? "Sending..."
            : resendCooldown > 0
            ? `📨 Resend in ${resendCooldown}s`
            : "📨 Send me a new code"}
        </button>

        {/* Success confirmation */}
        {resendSent && resendCooldown > 0 && (
          <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: "12px 16px", marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", marginBottom: 2 }}>New code sent!</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                Check your inbox and <strong style={{ color: "rgba(255,255,255,0.7)" }}>spam/junk</strong> folder.
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );

  // ── Step 2: Name + Age ────────────────────────────────────────────────────────
  if (step === 2) return (
    <Shell progress={progress} onBack={back}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Step 2 of 7</p>
      <h1 style={{ fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>What's your name?</h1>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 28 }}>This is how you'll appear to others.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>First name</label>
          <input type="text" placeholder="e.g. Adunola" value={form.name} onChange={e => update("name", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Age</label>
          <input type="number" placeholder="e.g. 24" min="18" max="100" value={form.age} onChange={e => update("age", e.target.value)} style={inputStyle} />
        </div>
      </div>
      <NextBtn onClick={next} disabled={!canNext()} loading={loading} />
    </Shell>
  );

  // ── Step 3: Gender + Preference ───────────────────────────────────────────────
  if (step === 3) return (
    <Shell progress={progress} onBack={back}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Step 3 of 7</p>
      <h1 style={{ fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>About you</h1>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 28 }}>Help us find the right people for you.</p>
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>I am a</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {GENDERS.map(g => (
            <button key={g} onClick={() => update("gender", g)} style={{ background: form.gender === g ? "#D4AF37" : "rgba(255,255,255,0.1)", border: `1.5px solid ${form.gender === g ? "#D4AF37" : "rgba(255,255,255,0.2)"}`, borderRadius: 12, padding: "14px 10px", color: form.gender === g ? "#000" : "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{g}</button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>Interested in</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {PREFERENCES.map(p => (
            <button key={p} onClick={() => update("preference", p)} style={{ background: form.preference === p ? "#D4AF37" : "rgba(255,255,255,0.1)", border: `1.5px solid ${form.preference === p ? "#D4AF37" : "rgba(255,255,255,0.2)"}`, borderRadius: 12, padding: "14px 6px", color: form.preference === p ? "#000" : "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{p}</button>
          ))}
        </div>
      </div>
      <NextBtn onClick={next} disabled={!canNext()} loading={loading} />
    </Shell>
  );

  // ── Step 4: Location ──────────────────────────────────────────────────────────
  if (step === 4) return (
    <Shell progress={progress} onBack={back}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Step 4 of 7</p>
      <h1 style={{ fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>Where in Ìjèbú?</h1>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 24 }}>We'll show you people nearby first.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 8 }}>
        {IJEBU_AREAS.map(group => (
          <div key={group.lga}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>📍 {group.lga}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {group.towns.map(town => (
                <button key={town} onClick={() => { update("location", town); setTimeout(() => setStep(s => s + 1), 300); }} style={{ background: form.location === town ? "#D4AF37" : "rgba(255,255,255,0.08)", border: `1.5px solid ${form.location === town ? "#D4AF37" : "rgba(255,255,255,0.15)"}`, borderRadius: 12, padding: "13px 10px", color: form.location === town ? "#000" : "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>{town}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );

  // ── Step 5: Looking for ───────────────────────────────────────────────────────
  if (step === 5) return (
    <Shell progress={progress} onBack={back}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Step 5 of 7</p>
      <h1 style={{ fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>What are you here for?</h1>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 28 }}>Be honest — we'll match you better.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {LOOKING_FOR.map(opt => (
          <button key={opt.id} onClick={() => update("lookingFor", opt.id)} style={{ background: form.lookingFor === opt.id ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.08)", border: `2px solid ${form.lookingFor === opt.id ? "#D4AF37" : "rgba(255,255,255,0.15)"}`, borderRadius: 16, padding: "16px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}>
            <span style={{ fontSize: 28 }}>{opt.emoji}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: form.lookingFor === opt.id ? "#D4AF37" : "#fff" }}>{opt.label}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{opt.desc}</div>
            </div>
            {form.lookingFor === opt.id && <span style={{ marginLeft: "auto", color: "#D4AF37", fontSize: 18 }}>✓</span>}
          </button>
        ))}
      </div>
      <NextBtn onClick={next} disabled={!canNext()} loading={loading} />
    </Shell>
  );

  // ── Step 6: Photos ────────────────────────────────────────────────────────────
  if (step === 6) return (
    <Shell progress={progress} onBack={back}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Step 6 of 7</p>
      <h1 style={{ fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>Add your photos</h1>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 28 }}>Profiles with photos get 10× more matches.</p>
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} style={{ display: "none" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} onClick={() => !photos[i] && fileRef.current?.click()} style={{ aspectRatio: "3/4", borderRadius: 14, background: photos[i] ? "transparent" : "rgba(255,255,255,0.08)", border: `2px dashed ${photos[i] ? "transparent" : "rgba(255,255,255,0.2)"}`, overflow: "hidden", cursor: photos[i] ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {photos[i] ? (
              <>
                <img src={photos[i].preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                <button
                  onClick={e => { e.stopPropagation(); setPhotos(p => p.filter((_, idx) => idx !== i)); }}
                  style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 24, height: 24, color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                >×</button>
              </>
            ) : (
              <span style={{ fontSize: i === 0 ? 28 : 22, color: "rgba(255,255,255,0.4)" }}>{i === 0 ? "📸" : "+"}</span>
            )}
            {i === 0 && !photos[0] && (
              <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Main photo</div>
            )}
          </div>
        ))}
      </div>
      {errorBox}
      <NextBtn onClick={next} disabled={!canNext()} loading={loading} label={photos.length > 0 ? "Continue →" : "Add at least 1 photo"} />
    </Shell>
  );

  // ── Step 7: Bio ───────────────────────────────────────────────────────────────
  return (
    <Shell progress={progress} onBack={back}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Step 7 of 7</p>
      <h1 style={{ fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8 }}>Tell your story</h1>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 28 }}>What makes you, you? Keep it real.</p>
      {errorBox}
      <textarea
        placeholder="e.g. Ijebu girl who loves suya nights and deep convos..."
        value={form.bio}
        onChange={e => update("bio", e.target.value)}
        maxLength={300}
        rows={6}
        style={{ ...inputStyle, resize: "none", lineHeight: 1.6, paddingTop: 16 }}
      />
      <div style={{ textAlign: "right", marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{form.bio.length}/300</div>
      <NextBtn onClick={next} disabled={!canNext()} loading={loading} label="Finish & find my matches 🎉" />
    </Shell>
  );
}