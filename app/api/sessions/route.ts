import { LevelBundle } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calendarDateFromIso } from "@/lib/dates";
import { findConflictWarningsForStudentsOnDate } from "@/lib/conflicts";
import { validateScheduledSession } from "@/lib/validate-session";
import { describeSessionErrors } from "@/lib/errors-id";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "Parameter from & to (YYYY-MM-DD) wajib." }, { status: 400 });
  }
  const d0 = calendarDateFromIso(from);
  const d1 = calendarDateFromIso(to);
  const start = new Date(d0);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(d1);
  end.setUTCHours(23, 59, 59, 999);

  const sessions = await prisma.scheduledSession.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: [{ date: "asc" }, { hour: "asc" }, { lane: "asc" }],
    include: {
      coachPrimary: true,
      coachSecondary: true,
      enrollments: { include: { student: true } },
    },
  });
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const jar = cookies();
  const role = jar.get("pss_role")?.value ?? "admin";
  if (role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang boleh mengubah jadwal." }, { status: 403 });
  }

  const body = (await req.json()) as {
    date: string;
    hour: number;
    lane: number;
    bundle: LevelBundle;
    coachPrimaryId: string;
    coachSecondaryId: string | null;
    studentIds: string[];
    confirmConflict?: boolean;
  };

  if (!body.date || typeof body.hour !== "number" || !body.bundle || !body.coachPrimaryId) {
    return NextResponse.json({ error: "Data sesi tidak lengkap." }, { status: 400 });
  }

  const date = calendarDateFromIso(body.date);

  const val = await validateScheduledSession(prisma, {
    date,
    hour: body.hour,
    lane: body.lane,
    bundle: body.bundle,
    coachPrimaryId: body.coachPrimaryId,
    coachSecondaryId: body.coachSecondaryId ?? null,
    enrollmentStudentIds: body.studentIds ?? [],
  });
  if (val.length) {
    return NextResponse.json({ errors: val, messages: describeSessionErrors(val) }, { status: 400 });
  }

  const conflictWarnings = await findConflictWarningsForStudentsOnDate(prisma, date, body.studentIds ?? []);
  if (conflictWarnings.length && !body.confirmConflict) {
    const students = await prisma.student.findMany({
      where: { id: { in: [...new Set(conflictWarnings.flatMap((w) => [w.studentAId, w.studentBId]))] } },
    });
    const names = new Map(students.map((s) => [s.id, s.name]));
    return NextResponse.json(
      {
        conflictWarnings: conflictWarnings.map((w) => ({
          studentAId: w.studentAId,
          studentBId: w.studentBId,
          label: `${names.get(w.studentAId) ?? w.studentAId} ↔ ${names.get(w.studentBId) ?? w.studentBId}`,
        })),
        message: "Pasangan murid konflik akan berada di hari yang sama. Konfirmasi diperlukan.",
      },
      { status: 409 }
    );
  }

  const created = await prisma.scheduledSession.create({
    data: {
      date,
      hour: body.hour,
      lane: body.lane,
      bundle: body.bundle,
      coachPrimaryId: body.coachPrimaryId,
      coachSecondaryId: body.coachSecondaryId ?? null,
      enrollments: {
        create: (body.studentIds ?? []).map((studentId) => ({ studentId })),
      },
    },
    include: {
      coachPrimary: true,
      coachSecondary: true,
      enrollments: { include: { student: true } },
    },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const jar = cookies();
  const role = jar.get("pss_role")?.value ?? "admin";
  if (role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang boleh mengubah jadwal." }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Parameter id wajib." }, { status: 400 });

  const existing = await prisma.scheduledSession.findUnique({
    where: { id },
    include: { enrollments: true },
  });
  if (!existing) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });

  const body = (await req.json()) as Partial<{
    date: string;
    hour: number;
    lane: number;
    bundle: LevelBundle;
    coachPrimaryId: string;
    coachSecondaryId: string | null;
    studentIds: string[];
    confirmConflict: boolean;
  }>;

  const date = body.date ? calendarDateFromIso(body.date) : existing.date;
  const hour = body.hour ?? existing.hour;
  const lane = body.lane ?? existing.lane;
  const bundle = body.bundle ?? existing.bundle;
  const coachPrimaryId = body.coachPrimaryId ?? existing.coachPrimaryId;
  const coachSecondaryId =
    body.coachSecondaryId === undefined ? existing.coachSecondaryId : body.coachSecondaryId;
  const studentIds = body.studentIds ?? existing.enrollments.map((e) => e.studentId);

  const val = await validateScheduledSession(prisma, {
    date,
    hour,
    lane,
    bundle,
    coachPrimaryId,
    coachSecondaryId,
    enrollmentStudentIds: studentIds,
    excludeSessionId: id,
  });
  if (val.length) {
    return NextResponse.json({ errors: val, messages: describeSessionErrors(val) }, { status: 400 });
  }

  const conflictWarnings = await findConflictWarningsForStudentsOnDate(prisma, date, studentIds, {
    ignoreSessionId: id,
  });
  if (conflictWarnings.length && !body.confirmConflict) {
    const students = await prisma.student.findMany({
      where: { id: { in: [...new Set(conflictWarnings.flatMap((w) => [w.studentAId, w.studentBId]))] } },
    });
    const names = new Map(students.map((s) => [s.id, s.name]));
    return NextResponse.json(
      {
        conflictWarnings: conflictWarnings.map((w) => ({
          studentAId: w.studentAId,
          studentBId: w.studentBId,
          label: `${names.get(w.studentAId) ?? w.studentAId} ↔ ${names.get(w.studentBId) ?? w.studentBId}`,
        })),
        message: "Pasangan murid konflik akan berada di hari yang sama. Konfirmasi diperlukan.",
      },
      { status: 409 }
    );
  }

  await prisma.enrollment.deleteMany({ where: { scheduledSessionId: id } });

  const updated = await prisma.scheduledSession.update({
    where: { id },
    data: {
      date,
      hour,
      lane,
      bundle,
      coachPrimaryId,
      coachSecondaryId,
      enrollments: { create: studentIds.map((studentId) => ({ studentId })) },
    },
    include: {
      coachPrimary: true,
      coachSecondary: true,
      enrollments: { include: { student: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const jar = cookies();
  const role = jar.get("pss_role")?.value ?? "admin";
  if (role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang boleh mengubah jadwal." }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Parameter id wajib." }, { status: 400 });

  await prisma.scheduledSession.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
