"use client";
import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

/**
 * The unread-notification count, kept once for the whole session.
 * Every page renders a Header, so without this each page change would run the count query
 * again and open and close a realtime connection. Now it happens once per signed-in user.
 */
let count = 0;
let owner: string | null = null;
let channel: ReturnType<typeof supabase.channel> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function startNotifStore(userId: string) {
  if (owner === userId) return;
  stopNotifStore();
  owner = userId;
  count = 0;
  emit();

  supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false)
    .then(({ count: c }) => {
      if (owner !== userId) return;
      count = c ?? 0;
      emit();
    });

  channel = supabase
    .channel(`unread:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      () => { count += 1; emit(); }
    )
    .subscribe();
}

export function stopNotifStore() {
  if (channel) supabase.removeChannel(channel);
  channel = null;
  owner = null;
  count = 0;
  emit();
}

export function clearUnread() {
  count = 0;
  emit();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};

export function useUnreadCount() {
  return useSyncExternalStore(subscribe, () => count, () => 0);
}