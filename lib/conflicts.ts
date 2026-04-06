import type { PrismaClient } from "@prisma/client";

/** Normalisasi pasangan agar unik (id kecil dulu). */
export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * Untuk tanggal yang sama: cek apakah menambahkan murid ini bentrok dengan pasangan konflik
 * yang sudah punya sesi hari itu.
 */
export async function findConflictWarningsForStudentsOnDate(
  db: PrismaClient,
  calendarDate: Date,
  studentIds: string[],
  opts?: { ignoreSessionId?: string }
): Promise<{ studentAId: string; studentBId: string }[]> {
  if (studentIds.length === 0) return [];

  const start = startOfCalendarDay(calendarDate);
  const end = endOfCalendarDay(calendarDate);

  const pairs = await db.conflictPair.findMany();
  const warnings: { studentAId: string; studentBId: string }[] = [];

  const sessionsSameDay = await db.scheduledSession.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    include: { enrollments: true },
  });

  const studentsOnDay = new Set<string>();
  for (const s of sessionsSameDay) {
    if (opts?.ignoreSessionId && s.id === opts.ignoreSessionId) continue;
    for (const e of s.enrollments) studentsOnDay.add(e.studentId);
  }

  const incoming = new Set(studentIds);
  for (const p of pairs) {
    const aScheduled = studentsOnDay.has(p.studentAId) || incoming.has(p.studentAId);
    const bScheduled = studentsOnDay.has(p.studentBId) || incoming.has(p.studentBId);
    if (aScheduled && bScheduled) {
      warnings.push({ studentAId: p.studentAId, studentBId: p.studentBId });
    }
  }

  return dedupePairs(warnings);
}

function dedupePairs(pairs: { studentAId: string; studentBId: string }[]) {
  const seen = new Set<string>();
  const out: { studentAId: string; studentBId: string }[] = [];
  for (const p of pairs) {
    const [x, y] = orderedPair(p.studentAId, p.studentBId);
    const key = `${x}:${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ studentAId: x, studentBId: y });
  }
  return out;
}

function startOfCalendarDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function endOfCalendarDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}
