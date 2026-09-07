import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:support@ijebusoul.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COPY: Record<string, (name: string) => string> = {
  post_like:    (n) => `${n} liked your post`,
  post_comment: (n) => `${n} commented on your post`,
  swipe_like:   (n) => `${n} liked your profile`,
  match:        (n) => `You matched with ${n}! 🎉`,
  message:      (n) => `${n} sent you a message`,
  follow:       (n) => `${n} started following you`,
};

const URL_FOR: Record<string, string> = {
  post_like: "/feed", post_comment: "/feed", swipe_like: "/likes",
  match: "/chats", message: "/chats", follow: "/feed",
};

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const record = payload?.record;
  if (!record) return NextResponse.json({ ok: true });

  const { user_id: userId, actor_id: actorId, type } = record;

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 });

  let actorName = "Someone";
  if (actorId) {
    const { data: actor } = await supabaseAdmin.from("profiles").select("name").eq("id", actorId).single();
    if (actor?.name) actorName = actor.name;
  }

  const body = (COPY[type] ?? (() => "You have a new notification"))(actorName);
  const url = URL_FOR[type] ?? "/";

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: "ìjèbúsoul", body, url })
      ).catch(async (err) => {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
        }
        throw err;
      })
    )
  );

  return NextResponse.json({ ok: true, sent: results.filter(r => r.status === "fulfilled").length });
}