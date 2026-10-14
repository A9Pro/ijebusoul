"use client";
import { useRouter } from "next/navigation";

const CSS = `
.bd-pop{display:inline-block;animation:bd-pop .7s cubic-bezier(.2,1.6,.4,1) both}
@keyframes bd-pop{from{transform:scale(0) rotate(-25deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
@media (prefers-reduced-motion:reduce){.bd-pop{animation:none}}
`;

const EMOJIS = ["🎂", "🎉", "🥳", "🎈", "🎁"];

async function shareBirthday(userId: string): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const url = `${window.location.origin}/profile/${userId}`;
  const text = "🎂🎉 It's my birthday today! Come celebrate with me on ìjèbú soul 🥳🎈";
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title: "It's my birthday! 🎂", text, url });
      return "shared";
    }
  } catch (err) {
    if ((err as DOMException)?.name === "AbortError") return "cancelled";
    // any other share error: fall through to copying the message
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}

/** Shown on your own profile on your birthday. */
export default function BirthdayCard({
  name,
  userId,
  onMessage,
}: {
  name: string;
  userId: string;
  onMessage: (text: string) => void;
}) {
  const router = useRouter();
  const first = (name || "").trim().split(" ")[0] || "friend";

  const share = async () => {
    const result = await shareBirthday(userId);
    if (result === "copied") onMessage("Birthday message copied");
    if (result === "failed") onMessage("Couldn't share. Try again.");
  };

  return (
    <div
      style={{
        marginTop: 18,
        borderRadius: 18,
        padding: "18px 18px 16px",
        color: "#fff",
        background: "linear-gradient(135deg, #7a1f3d 0%, #b8412b 58%, #e0a82e 120%)",
        boxShadow: "0 12px 30px rgba(122,31,61,0.35)",
      }}
    >
      <style>{CSS}</style>
      <div aria-hidden="true" style={{ fontSize: 26, display: "flex", gap: 6 }}>
        {EMOJIS.map((e, i) => (
          <span key={e} className="bd-pop" style={{ animationDelay: `${i * 90}ms` }}>{e}</span>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em" }}>
        Happy birthday, {first}!
      </div>
      <p style={{ margin: "6px 0 14px", fontSize: 13.5, lineHeight: 1.5, opacity: 0.92 }}>
        Your birthday shout-out is up in the feed. Share it so your friends can celebrate with you.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          className="sp-btn"
          onClick={share}
          style={{ flex: 1, background: "#fff", color: "#7a1f3d", border: 0, borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 800, cursor: "pointer" }}
        >
          Share my birthday
        </button>
        <button
          type="button"
          className="sp-btn"
          onClick={() => router.push("/feed")}
          style={{ flex: 1, background: "rgba(255,255,255,0.16)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          See my shout-out
        </button>
      </div>
    </div>
  );
}