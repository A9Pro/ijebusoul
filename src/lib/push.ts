import { supabase } from "@/lib/supabase";

// Cleans stray quotes/spaces from the env value and explains problems in plain words.
function urlBase64ToUint8Array(input: string) {
  const clean = input.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");

  const padding = "=".repeat((4 - (clean.length % 4)) % 4);
  const base64 = (clean + padding).replace(/-/g, "+").replace(/_/g, "/");

  let raw: string;
  try {
    raw = atob(base64);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY is not a valid key. Copy the Public Key again from `npx web-push generate-vapid-keys`."
    );
  }

  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!pushSupported()) return false;

  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY. Add it to .env.local and to Vercel, then restart/redeploy.");
      return false;
    }

    // Decode first: a bad key fails here with a clear message, before any permission prompt.
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await withTimeout(
      navigator.serviceWorker.register("/sw.js"),
      10000,
      "Service worker registration"
    );

    await withTimeout(navigator.serviceWorker.ready, 10000, "Service worker activation");

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await withTimeout(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        }),
        10000,
        "Push subscription"
      );
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

    const { error } = await supabase.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    }, { onConflict: "user_id,endpoint" });

    if (error) {
      console.error("Failed to save push subscription:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("subscribeToPush failed:", err);
    return false;
  }
}
