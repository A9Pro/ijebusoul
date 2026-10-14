import type { Profile } from "@/lib/types";

export const LAGOS_TZ = "Africa/Lagos";

export type YMD = { y: number; m: number; d: number };

export function lagosToday(now: Date = new Date()): YMD {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: pick("year"), m: pick("month"), d: pick("day") };
}

export function parseBirthDate(iso?: string | null): YMD | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

export function isLeapYear(y: number): boolean {
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
}

export function ageFromBirthDate(iso?: string | null, today: YMD = lagosToday()): number | null {
  const b = parseBirthDate(iso);
  if (!b) return null;
  let age = today.y - b.y;
  if (today.m < b.m || (today.m === b.m && today.d < b.d)) age -= 1;
  return age;
}

/** True when today is the member's birthday and they haven't turned the shout-out off. */
export function isBirthdayToday(
  profile: Pick<Profile, "birth_date" | "birthday_shoutout">,
  today: YMD = lagosToday()
): boolean {
  if (profile.birthday_shoutout === false) return false;
  const b = parseBirthDate(profile.birth_date);
  if (!b) return false;
  if (b.m === today.m && b.d === today.d) return true;
  return b.m === 2 && b.d === 29 && !isLeapYear(today.y) && today.m === 2 && today.d === 28;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function latestAdultBirthDate(today: YMD = lagosToday()): string {
  return `${today.y - 18}-${pad(today.m)}-${pad(today.d)}`;
}

export function validateBirthDate(iso: string, today: YMD = lagosToday()): string | null {
  const b = parseBirthDate(iso);
  if (!b) return "Enter a valid birth date.";
  const age = ageFromBirthDate(iso, today);
  if (age === null || age < 18) return "You must be at least 18 to use ìjèbú soul.";
  if (age > 99 || b.y < 1900) return "Enter a valid birth date.";
  return null;
}

/** Same birthday check as isBirthdayToday, but works from month/day alone — no year required. Used on public profiles, which never receive the birth year. */
export function isBirthdayOnMonthDay(
  profile: { birth_month?: number | null; birth_day?: number | null; birthday_shoutout?: boolean },
  today: YMD = lagosToday()
): boolean {
  if (profile.birthday_shoutout === false) return false;
  const m = profile.birth_month;
  const d = profile.birth_day;
  if (!m || !d) return false;
  if (m === today.m && d === today.d) return true;
  return m === 2 && d === 29 && !isLeapYear(today.y) && today.m === 2 && today.d === 28;
}

/** Formats a birth month/day with no year, e.g. "14 October" — for public display. */
export function birthdayLabelFromMonthDay(m?: number | null, d?: number | null): string {
  if (!m || !d) return "—";
  return new Date(2000, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "long" });
}