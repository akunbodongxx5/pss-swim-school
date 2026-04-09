import type { LevelBundle, PrismaClient } from "@prisma/client";
import {
  coachCanAssistBundle,
  coachCanTeachBundle,
  laneAllowedForBundle,
  levelsAllowedForBundle,
  maxStudentsForBundle,
} from "@/lib/domain";
import { calendarWibDateAllowsSessions } from "@/lib/calendar-month-rules";
import { formatIsoDateInWIB } from "@/lib/dates";
import { isSessionStartHourAllowedForWibDate } from "@/lib/operating-hours";

export type SessionValidationError =
  | { code: "CALENDAR_TAIL_CLOSED" }
  | { code: "OUTSIDE_OPERATING_HOURS" }
  | { code: "LANE_BUNDLE_MISMATCH" }
  | { code: "COACH_PRIMARY_INVALID" }
  | { code: "COACH_SECONDARY_NOT_FOUND" }
  | { code: "COACH_SECONDARY_INVALID" }
  | { code: "COACH_DUPLICATE" }
  | { code: "LANE1_TOO_MANY_CLASSES" }
  | { code: "LANE_OCCUPIED" }
  | { code: "COACH_DOUBLE_BOOK" }
  | { code: "ENROLLMENT_OVER_CAPACITY" }
  | { code: "STUDENT_LEVEL_MISMATCH"; studentId: string }
  | { code: "STUDENT_SAME_SESSION_TWICE"; studentId: string };

export async function validateScheduledSession(
  db: PrismaClient,
  input: {
    date: Date;
    hour: number;
    lane: number;
    bundle: LevelBundle;
    coachPrimaryId: string;
    coachSecondaryId: string | null;
    enrollmentStudentIds: string[];
    excludeSessionId?: string;
  }
): Promise<SessionValidationError[]> {
  const errors: SessionValidationError[] = [];

  const dayIso = formatIsoDateInWIB(input.date);
  if (!(await calendarWibDateAllowsSessions(db, dayIso))) {
    errors.push({ code: "CALENDAR_TAIL_CLOSED" });
  }
  if (!isSessionStartHourAllowedForWibDate(dayIso, input.hour)) {
    errors.push({ code: "OUTSIDE_OPERATING_HOURS" });
  }

  if (!laneAllowedForBundle(input.bundle, input.lane)) {
    errors.push({ code: "LANE_BUNDLE_MISMATCH" });
  }

  const primary = await db.coach.findUnique({ where: { id: input.coachPrimaryId } });
  const secondary = input.coachSecondaryId
    ? await db.coach.findUnique({ where: { id: input.coachSecondaryId } })
    : null;

  if (!primary || !coachCanTeachBundle(primary.teachLevels, input.bundle)) {
    errors.push({ code: "COACH_PRIMARY_INVALID" });
  }
  if (input.coachSecondaryId) {
    if (!secondary) {
      errors.push({ code: "COACH_SECONDARY_NOT_FOUND" });
    } else if (input.coachSecondaryId === input.coachPrimaryId) {
      errors.push({ code: "COACH_DUPLICATE" });
    } else if (!coachCanAssistBundle(secondary.teachLevels, secondary.traineeLevels, input.bundle)) {
      errors.push({ code: "COACH_SECONDARY_INVALID" });
    }
  }

  const coachCount: 1 | 2 = input.coachSecondaryId ? 2 : 1;
  const maxStudents = maxStudentsForBundle(input.bundle, coachCount);
  if (input.enrollmentStudentIds.length > maxStudents) {
    errors.push({ code: "ENROLLMENT_OVER_CAPACITY" });
  }

  const allowedLevels = new Set(levelsAllowedForBundle(input.bundle));
  const students = await db.student.findMany({
    where: { id: { in: input.enrollmentStudentIds } },
  });
  const byId = new Map(students.map((s) => [s.id, s]));
  const seen = new Set<string>();
  for (const sid of input.enrollmentStudentIds) {
    if (seen.has(sid)) errors.push({ code: "STUDENT_SAME_SESSION_TWICE", studentId: sid });
    seen.add(sid);
    const st = byId.get(sid);
    if (!st || !allowedLevels.has(st.level)) {
      errors.push({ code: "STUDENT_LEVEL_MISMATCH", studentId: sid });
    }
  }

  const sameSlot = await db.scheduledSession.findMany({
    where: {
      date: sameCalendarDayWhere(input.date),
      hour: input.hour,
      ...(input.excludeSessionId ? { id: { not: input.excludeSessionId } } : {}),
    },
  });

  if (input.bundle === "MIXED_1_3") {
    const countL13 = sameSlot.filter((s) => s.bundle === "MIXED_1_3" && s.lane === 1).length;
    if (countL13 >= 2) {
      errors.push({ code: "LANE1_TOO_MANY_CLASSES" });
    }
  } else {
    const occupiedLane = sameSlot.some((s) => s.lane === input.lane);
    if (occupiedLane) errors.push({ code: "LANE_OCCUPIED" });
  }

  const coachIds = [input.coachPrimaryId, input.coachSecondaryId].filter(Boolean) as string[];
  for (const other of sameSlot) {
    if (other.id === input.excludeSessionId) continue;
    const busy = [other.coachPrimaryId, other.coachSecondaryId].filter(Boolean) as string[];
    for (const c of coachIds) {
      if (busy.includes(c)) errors.push({ code: "COACH_DOUBLE_BOOK" });
    }
  }

  return errors;
}

function sameCalendarDayWhere(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return { gte: start, lte: end };
}
