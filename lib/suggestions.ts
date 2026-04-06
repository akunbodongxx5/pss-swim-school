import type { LevelBundle, PrismaClient } from "@prisma/client";
import { coachCanTeachBundle } from "@/lib/domain";
import { calendarDateFromIso } from "@/lib/dates";
import { calendarWibDateAllowsSessions } from "@/lib/calendar-month-rules";
import { sessionStartHoursForWibCalendarDate } from "@/lib/operating-hours";

export type OpenSlotSuggestion = {
  date: string;
  hour: number;
  lane: number;
  bundle: LevelBundle;
  coachPrimaryId: string;
  coachSecondaryId: null;
  score: number;
  reason: string;
};

/**
 * Saran slot membuka kelas: pelatih yang tidak mengajar di jam itu, diutamakan yang
 * minggu itu jam mengajarnya lebih sedikit (keseimbangan beban).
 */
export async function suggestOpenSlots(
  db: PrismaClient,
  opts: {
    bundle: LevelBundle;
    isoDate: string;
    /** Default: mengikuti jam operasional per hari (WIB). */
    hours?: number[];
  }
): Promise<OpenSlotSuggestion[]> {
  if (!(await calendarWibDateAllowsSessions(db, opts.isoDate))) {
    return [];
  }
  const date = calendarDateFromIso(opts.isoDate);
  const hours = opts.hours ?? sessionStartHoursForWibCalendarDate(opts.isoDate);

  const coaches = await db.coach.findMany();
  const eligible = coaches.filter((c) => coachCanTeachBundle(c.teachLevels, opts.bundle));
  if (eligible.length === 0) return [];

  const weekStart = startOfWeekMondayUtc(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const sessionsWeek = await db.scheduledSession.findMany({
    where: { date: { gte: weekStart, lt: weekEnd } },
  });

  const coachLoad = new Map<string, number>();
  for (const c of coaches) coachLoad.set(c.id, 0);
  for (const s of sessionsWeek) {
    coachLoad.set(s.coachPrimaryId, (coachLoad.get(s.coachPrimaryId) ?? 0) + 1);
    if (s.coachSecondaryId) {
      coachLoad.set(s.coachSecondaryId, (coachLoad.get(s.coachSecondaryId) ?? 0) + 1);
    }
  }

  const sessionsDay = await db.scheduledSession.findMany({
    where: {
      date: {
        gte: utcDayStart(date),
        lte: utcDayEnd(date),
      },
    },
  });

  const suggestions: OpenSlotSuggestion[] = [];

  for (const hour of hours) {
    const busyCoachIds = busyCoachesAt(sessionsDay, hour);
    const lane13Count = countMixed13OnLane1(sessionsDay, hour);

    for (const coach of eligible) {
      if (busyCoachIds.has(coach.id)) continue;

      if (opts.bundle === "MIXED_1_3") {
        if (lane13Count >= 2) continue;
        suggestions.push({
          date: opts.isoDate,
          hour,
          lane: 1,
          bundle: opts.bundle,
          coachPrimaryId: coach.id,
          coachSecondaryId: null,
          score: -((coachLoad.get(coach.id) ?? 0) * 100) + hour,
          reason: `Line 1: slot ${hour}:00, pelatih ${coach.name} bebas; beban mingguan relatif rendah.`,
        });
      } else {
        const freeLane = pickFreeLane23(sessionsDay, hour);
        if (freeLane === null) continue;
        suggestions.push({
          date: opts.isoDate,
          hour,
          lane: freeLane,
          bundle: opts.bundle,
          coachPrimaryId: coach.id,
          coachSecondaryId: null,
          score: -((coachLoad.get(coach.id) ?? 0) * 100) + hour + freeLane,
          reason: `Lintasan ${freeLane}: slot ${hour}:00, pelatih ${coach.name} bebas.`,
        });
      }
    }
  }

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, 24);
}

function busyCoachesAt(sessions: { hour: number; coachPrimaryId: string; coachSecondaryId: string | null }[], hour: number) {
  const set = new Set<string>();
  for (const s of sessions) {
    if (s.hour !== hour) continue;
    set.add(s.coachPrimaryId);
    if (s.coachSecondaryId) set.add(s.coachSecondaryId);
  }
  return set;
}

function countMixed13OnLane1(
  sessions: { hour: number; lane: number; bundle: LevelBundle }[],
  hour: number
) {
  return sessions.filter((s) => s.hour === hour && s.lane === 1 && s.bundle === "MIXED_1_3").length;
}

function pickFreeLane23(
  sessions: { hour: number; lane: number }[],
  hour: number
): number | null {
  const used = new Set(sessions.filter((s) => s.hour === hour).map((s) => s.lane));
  for (const ln of [2, 3, 4]) {
    if (!used.has(ln)) return ln;
  }
  return null;
}

function utcDayStart(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function utcDayEnd(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

function startOfWeekMondayUtc(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0));
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
