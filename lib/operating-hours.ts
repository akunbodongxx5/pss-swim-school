/**
 * Jam mulai sesi (WIB), kelas 60 menit (h:00–h+1:00).
 * Sen–Jum: 13:00–18:00 (mulai terakhir 17:00).
 * Sab–Min: 08:00–16:00 (mulai terakhir 15:00).
 * Tanggal 29–31 diatur di calendar-month-rules.
 */
const START_HOURS_WEEKDAY = [13, 14, 15, 16, 17];
const START_HOURS_WEEKEND = [8, 9, 10, 11, 12, 13, 14, 15];

const WIB_LONG_WEEKDAY_TO_SUN0: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/** Hari dalam seminggu untuk tanggal kalender WIB (0=Minggu … 6=Sabtu). */
function wibWeekdaySun0FromCalendarIso(isoYmd: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYmd.trim());
  if (!m) throw new Error("Tanggal harus YYYY-MM-DD");
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const anchor = new Date(Date.UTC(y, mo, d, 12, 0, 0, 0));
  const long = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
  }).format(anchor);
  const n = WIB_LONG_WEEKDAY_TO_SUN0[long];
  if (n === undefined) throw new Error(`Hari tidak dikenal: ${long}`);
  return n;
}

function isWibWeekend(isoYmd: string): boolean {
  const w = wibWeekdaySun0FromCalendarIso(isoYmd);
  return w === 0 || w === 6;
}

export function sessionStartHoursForWibCalendarDate(isoYmd: string): number[] {
  return [...(isWibWeekend(isoYmd) ? START_HOURS_WEEKEND : START_HOURS_WEEKDAY)];
}

export function isSessionStartHourAllowedForWibDate(isoYmd: string, hour: number): boolean {
  return sessionStartHoursForWibCalendarDate(isoYmd).includes(hour);
}
