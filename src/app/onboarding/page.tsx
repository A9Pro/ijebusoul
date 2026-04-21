"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const IJEBU_AREAS = [
  { lga: "Ijebu Ode", towns: ["Ijebu Ode", "Porogun", "Oke Aje", "Igbeba", "Ijagun", "Odo-Esa", "Ilese", "Itamapako"] },
  { lga: "Ijebu North", towns: ["Ijebu Igbo", "Ago-Iwoye", "Oru", "Awa", "Atikori", "Japara", "Mamu", "Ojowo"] },
  { lga: "Ijebu North East", towns: ["Atan", "Ogbere", "Imobi", "Ijebu Ife", "Itele"] },
  { lga: "Ijebu East", towns: ["Ogbere", "Epe", "Itele", "Imushin"] },
  { lga: "Ijebu Waterside", towns: ["Abigi", "Iwopin", "Makun-Omi", "Ibiade", "Oni"] },
  { lga: "Ogun Waterside", towns: ["Igbogila", "Ayetoro", "Agbede", "Irokun", "Aheri", "Ode-Omi"] },
  { lga: "Odogbolu", towns: ["Odogbolu", "Imagbon", "Ijesa-Ijebu", "Ala", "Ibefun", "Omu"] },
];

const LOOKING_FOR = [
  { id: "relationship", label: "Relationship", emoji: "💍", desc: "Serious & committed" },
  { id: "casual", label: "Casual", emoji: "🌊", desc: "Chill, no pressure" },
  { id: "fwb", label: "FWB", emoji: "🤙🏾", desc: "Friends with benefits" },
  { id: "friendship", label: "Friendship", emoji: "☕", desc: "Just vibes & connect" },
];

const GENDERS = ["Man", "Woman", "Non-binary", "Prefer not to say"];
const PREFERENCES = ["Men", "Women", "Everyone"];

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.88) 65%, rgba(0,0,0,0.97) 100%)",
  zIndex: 1,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.1)",
  border: "1.5px solid rgba(255,255,255,0.25)",
  borderRadius: 14,
  padding: "16px 18px",
  fontSize: 16,
  color: "#fff",
  outline: "none",
  fontFamily: "system-ui, sans-serif",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "rgba(255,255,255,0.5)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 8,
};

const stepLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#D4AF37",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 10,
};

const headingStyle: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  color: "#fff",
  letterSpacing: "-0.03em",
  lineHeight: 1.1,
  marginBottom: 8,
};

const subStyle: React.CSSProperties = {
  fontSize: 15,
  color: "rgba(255,255,255,0.55)",
  marginBottom: 28,
};

export default function OnboardingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    preference: "",
    location: "",
    lookingFor: "",
    bio: "",
  });

  const totalSteps = 6;
  const progress = (step / totalSteps) * 100;

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPhotos((p) => [...p, url].slice(0, 6));
    });
  };

  const canNext = () => {
    if (step === 0) return form.name.trim() && form.age.trim();
    if (step === 1) return form.gender && form.preference;
    if (step === 2) return form.location;
    if (step === 3) return form.lookingFor;
    if (step === 4) return photos.length > 0;
    if (step === 5) return form.bio.trim().length > 10;
    return true;
  };

  const next = () => {
    if (step < totalSteps - 1) setStep((s) => s + 1);
    else router.push("/home");
  };

  const back = () => {
    if (step > 0) setStep((s) => s - 1);
    else router.back();
  };

  const Bg = () => (
    <>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url('/ijebu-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        zIndex: 0,
      }} />
      <div style={overlayStyle} />
    </>
  );

  const Logo = () => (
    <div style={{
      position: "absolute", top: 52, left: 0, right: 0,
      display: "flex", justifyContent: "center", zIndex: 2,
    }}>
      <div style={{
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: 50,
        padding: "8px 20px",
      }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
          ìjèbú<span style={{ color: "#D4AF37" }}>soul</span>
        </span>
      </div>
    </div>
  );

  const Shell = ({ children }: { children: React.ReactNode }) => (
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
      <Bg />
      <Logo />

      {/* Progress bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 3, background: "rgba(255,255,255,0.15)", zIndex: 3,
      }}>
        <div style={{
          height: "100%",
          background: "#D4AF37",
          width: `${progress}%`,
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Back button */}
      <button onClick={back} style={{
        position: "absolute", top: 44, left: 24, zIndex: 4,
        background: "rgba(255,255,255,0.15)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 50, width: 38, height: 38,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontSize: 18, color: "#fff",
      }}>←</button>

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 380 }}>
        {children}
      </div>
    </main>
  );

  const NextBtn = ({
    label = "Continue →",
    disabled = false,
  }: {
    label?: string;
    disabled?: boolean;
  }) => (
    <button
      onClick={next}
      disabled={disabled}
      style={{
        width: "100%",
        background: disabled ? "rgba(212,175,55,0.3)" : "#D4AF37",
        color: disabled ? "rgba(0,0,0,0.35)" : "#000",
        fontSize: 16,
        fontWeight: 800,
        border: "none",
        padding: "18px 0",
        borderRadius: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        marginTop: 24,
        transition: "all 0.2s",
      }}
    >
      {label}
    </button>
  );

  // ── Step 0: Name + Age ──
  if (step === 0) return (
    <Shell>
      <p style={stepLabelStyle}>Step 1 of 6</p>
      <h1 style={headingStyle}>What's your name?</h1>
      <p style={subStyle}>This is how you'll appear to others.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>First name</label>
          <input
            type="text"
            placeholder="e.g. Adunola"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Age</label>
          <input
            type="number"
            placeholder="e.g. 24"
            min="18"
            max="60"
            value={form.age}
            onChange={(e) => update("age", e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
      <NextBtn disabled={!canNext()} />
    </Shell>
  );

  // ── Step 1: Gender + Preference ──
  if (step === 1) return (
    <Shell>
      <p style={stepLabelStyle}>Step 2 of 6</p>
      <h1 style={headingStyle}>About you</h1>
      <p style={subStyle}>Help us find the right people for you.</p>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>I am a</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {GENDERS.map((g) => (
            <button
              key={g}
              onClick={() => update("gender", g)}
              style={{
                background: form.gender === g ? "#D4AF37" : "rgba(255,255,255,0.1)",
                border: `1.5px solid ${form.gender === g ? "#D4AF37" : "rgba(255,255,255,0.2)"}`,
                borderRadius: 12,
                padding: "14px 10px",
                color: form.gender === g ? "#000" : "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Interested in</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {PREFERENCES.map((p) => (
            <button
              key={p}
              onClick={() => update("preference", p)}
              style={{
                background: form.preference === p ? "#D4AF37" : "rgba(255,255,255,0.1)",
                border: `1.5px solid ${form.preference === p ? "#D4AF37" : "rgba(255,255,255,0.2)"}`,
                borderRadius: 12,
                padding: "14px 6px",
                color: form.preference === p ? "#000" : "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <NextBtn disabled={!canNext()} />
    </Shell>
  );

  // ── Step 2: Location ──
  if (step === 2) return (
    <Shell>
      <p style={stepLabelStyle}>Step 3 of 6</p>
      <h1 style={headingStyle}>Where in Ìjèbú?</h1>
      <p style={{ ...subStyle, marginBottom: 24 }}>
        We'll show you people nearby first.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 8 }}>
        {IJEBU_AREAS.map((group) => (
          <div key={group.lga}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#D4AF37",
              letterSpacing: "0.08em", textTransform: "uppercase",
              marginBottom: 10, paddingLeft: 4,
            }}>
              📍 {group.lga}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {group.towns.map((town) => (
                <button
                  key={town}
                  onClick={() => {
                    update("location", town);
                    setTimeout(() => setStep((s) => s + 1), 300);
                  }}
                  style={{
                    background: form.location === town ? "#D4AF37" : "rgba(255,255,255,0.08)",
                    border: `1.5px solid ${form.location === town ? "#D4AF37" : "rgba(255,255,255,0.15)"}`,
                    borderRadius: 12,
                    padding: "13px 10px",
                    color: form.location === town ? "#000" : "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s",
                  }}
                >
                  {town}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );

  // ── Step 3: Looking for ──
  if (step === 3) return (
    <Shell>
      <p style={stepLabelStyle}>Step 4 of 6</p>
      <h1 style={headingStyle}>What are you here for?</h1>
      <p style={subStyle}>Be honest — we'll match you better.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {LOOKING_FOR.map((opt) => (
          <button
            key={opt.id}
            onClick={() => update("lookingFor", opt.id)}
            style={{
              background: form.lookingFor === opt.id ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.08)",
              border: `2px solid ${form.lookingFor === opt.id ? "#D4AF37" : "rgba(255,255,255,0.15)"}`,
              borderRadius: 16,
              padding: "16px 18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              textAlign: "left",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 28 }}>{opt.emoji}</span>
            <div>
              <div style={{
                fontSize: 16, fontWeight: 800,
                color: form.lookingFor === opt.id ? "#D4AF37" : "#fff",
              }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                {opt.desc}
              </div>
            </div>
            {form.lookingFor === opt.id && (
              <span style={{ marginLeft: "auto", color: "#D4AF37", fontSize: 18 }}>✓</span>
            )}
          </button>
        ))}
      </div>

      <NextBtn disabled={!canNext()} />
    </Shell>
  );

  // ── Step 4: Photos ──
  if (step === 4) return (
    <Shell>
      <p style={stepLabelStyle}>Step 5 of 6</p>
      <h1 style={headingStyle}>Add your photos</h1>
      <p style={subStyle}>Profiles with photos get 10× more matches.</p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePhoto}
        style={{ display: "none" }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            onClick={() => !photos[i] && fileRef.current?.click()}
            style={{
              aspectRatio: "3/4",
              borderRadius: 14,
              background: photos[i] ? "transparent" : "rgba(255,255,255,0.08)",
              border: `2px dashed ${photos[i] ? "transparent" : "rgba(255,255,255,0.2)"}`,
              overflow: "hidden",
              cursor: photos[i] ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {photos[i] ? (
              <img
                src={photos[i]}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                alt={`photo ${i + 1}`}
              />
            ) : (
              <span style={{ fontSize: i === 0 ? 28 : 22, color: "rgba(255,255,255,0.4)" }}>
                {i === 0 ? "📸" : "+"}
              </span>
            )}
            {i === 0 && !photos[0] && (
              <div style={{
                position: "absolute", bottom: 8,
                left: 0, right: 0, textAlign: "center",
                fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600,
              }}>
                Main photo
              </div>
            )}
          </div>
        ))}
      </div>

      {photos.length === 0 && (
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.1)",
            border: "1.5px solid rgba(255,255,255,0.25)",
            borderRadius: 14, padding: "16px 0",
            color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}
        >
          Choose from camera roll
        </button>
      )}

      <NextBtn
        disabled={!canNext()}
        label={photos.length > 0 ? "Continue →" : "Add at least 1 photo"}
      />
    </Shell>
  );

  // ── Step 5: Bio ──
  return (
    <Shell>
      <p style={stepLabelStyle}>Step 6 of 6</p>
      <h1 style={headingStyle}>Tell your story</h1>
      <p style={subStyle}>What makes you, you? Keep it real.</p>

      <textarea
        placeholder="e.g. Ijebu girl who loves suya nights and deep convos. Looking for someone who matches my energy..."
        value={form.bio}
        onChange={(e) => update("bio", e.target.value)}
        maxLength={300}
        rows={6}
        style={{
          ...inputStyle,
          resize: "none",
          lineHeight: 1.6,
          paddingTop: 16,
        }}
      />
      <div style={{
        textAlign: "right", marginTop: 8,
        fontSize: 12, color: "rgba(255,255,255,0.35)",
      }}>
        {form.bio.length}/300
      </div>

      <NextBtn disabled={!canNext()} label="Finish & find my matches 🎉" />
    </Shell>
  );
}