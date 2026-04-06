import type { PrismaClient } from "@prisma/client";

/** Tanggal 29–31 dalam bulan (minggu “ke-5” / ekor bulan): default tanpa kelas. */
export function isCalendarTailDayOfMonth(dayOfMonth: number): boolean {
  return dayOfMonth >= 29;
}

export function parseIsoYmdParts(isoYmd: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYmd.trim());
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function normalizeOpenTailDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (const x of raw) {
    const n = typeof x === "number" ? x : Number(x);
    if (Number.isInteger(n) && n >= 29 && n <= 31) out.push(n);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

export function serializeOpenTailDays(days: number[]): string {
  return JSON.stringify(normalizeOpenTailDays(days));
}

export function parseOpenTailDaysJson(json: string | null | undefined): number[] {
  try {
    const a = JSON.parse(json ?? "[]") as unknown;
    return normalizeOpenTailDays(a);
  } catch {
    return [];
  }
}

/** Hari ini ada di kalender bulan tersebut (mis. 31 tidak ada di April). */
export function dateExistsInCalendarMonth(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const last = new Date(year, month, 0).getDate();
  return day <= last;
}

/** Tanggal 29–31 yang benar-benar ada di bulan kalender itu. */
export function tailDayOptionsForMonth(year: number, month: number): number[] {
  const last = new Date(year, month, 0).getDate();
  return [29, 30, 31].filter((d) => d <= last);
}

/**
 * Apakah sesi boleh di tanggal WIB ini? 1–28 ya; 29–31 hanya jika tercantum di konfig bulan.
 */
export async function calendarWibDateAllowsSessions(db: PrismaClient, isoYmd: string): Promise<boolean> {
  const p = parseIsoYmdParts(isoYmd);
  if (!p) return false;
  if (!dateExistsInCalendarMonth(p.year, p.month, p.day)) return false;
  if (!isCalendarTailDayOfMonth(p.day)) return true;

  const cfg = await db.scheduleMonthConfig.findUnique({
    where: { year_month: { year: p.year, month: p.month } },
  });
  const open = parseOpenTailDaysJson(cfg?.openTailDays);
  return open.includes(p.day);
}
