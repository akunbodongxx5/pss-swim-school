import type { PrismaClient, SessionBundleDefinition } from "@prisma/client";
import { coachCanTeachBundle } from "@/lib/domain";
import { parseBundleDefRow } from "@/lib/bundle-def";
import { calendarDateFromIso } from "@/lib/dates";
import { calendarWibDateAllowsSessions } from "@/lib/calendar-month-rules";
import { sessionStartHoursForWibCalendarDate } from "@/lib/operating-hours";

export type OpenSlotSuggestion = {
  date: string;
  hour: number;
  lane: number;
  bundleId: string;
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
    bundleRow: SessionBundleDefinition;
    isoDate: string;
    /** Default: mengikuti jam operasional per hari (WIB). */
    hours?: number[];
  }
): Promise<OpenSlotSuggestion[]> {
  if (!(await calendarWibDateAllowsSessions(db, opts.isoDate))) {
    return [];
  }
  const def = parseBundleDefRow(opts.bundleRow);
  const date = calendarDateFromIso(opts.isoDate);
  const hours = opts.hours ?? sessionStartHoursForWibCalendarDate(opts.isoDate);

  const coaches = await db.coach.findMany();
  const eligible = coaches.filter((c) => coachCanTeachBundle(c.teachLevels, def));
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
  const allowedLanes = def.allowedLanes.length ? def.allowedLanes : [1];

  for (const hour of hours) {
    const busyCoachIds = busyCoachesAt(sessionsDay, hour);

    for (const coach of eligible) {
      if (busyCoachIds.has(coach.id)) continue;

      for (const lane of allowedLanes) {
        if (!canPlaceBundleOnLane(def, sessionsDay, hour, lane, opts.bundleRow.id)) continue;
        suggestions.push({
          date: opts.isoDate,
          hour,
          lane,
          bundleId: opts.bundleRow.id,
          coachPrimaryId: coach.id,
          coachSecondaryId: null,
          score: -((coachLoad.get(coach.id) ?? 0) * 100) + hour + lane * 0.01,
          reason: `Lintasan ${lane}: slot ${hour}:00, pelatih ${coach.name} bebas.`,
        });
      }
    }
  }

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, 24);
}

function canPlaceBundleOnLane(
  def: ReturnType<typeof parseBundleDefRow>,
  sessions: { hour: number; lane: number; bundleId: string }[],
  hour: number,
  lane: number,
  bundleId: string
): boolean {
  if (!def.allowedLanes.includes(lane)) return false;

  if (def.maxConcurrentSessionsOnLane1 != null && lane === 1) {
    const count = sessions.filter(
      (s) => s.hour === hour && s.lane === 1 && s.bundleId === bundleId
    ).length;
    return count < def.maxConcurrentSessionsOnLane1;
  }

  return !sessions.some((s) => s.hour === hour && s.lane === lane);
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
