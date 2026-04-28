import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db-retry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CONTENT = 12_000;

export async function GET() {
  const jar = cookies();
  const role = jar.get("pss_role")?.value ?? "admin";
  const coachCookie = jar.get("pss_coach_id")?.value ?? null;

  if (role === "coach" && !coachCookie) {
    return NextResponse.json({ reports: [], needsCoachPick: true });
  }

  const rows = await withDbRetry(() =>
    prisma.studentReport.findMany({
      where:
        role === "admin"
          ? {}
          : {
              authorCoachId: coachCookie!,
            },
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { id: true, name: true } },
        authorCoach: { select: { id: true, name: true } },
      },
      take: 200,
    }),
  );

  const reports = rows.map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    student: r.student,
    authoredByAdmin: r.authoredByAdmin,
    authorCoach: r.authorCoach ? { id: r.authorCoach.id, name: r.authorCoach.name } : null,
  }));

  return NextResponse.json({ reports, needsCoachPick: false });
}

export async function POST(req: Request) {
  const jar = cookies();
  const role = jar.get("pss_role")?.value ?? "admin";

  const body = (await req.json()) as { studentId?: unknown; content?: unknown };
  const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!studentId || !content) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (content.length > MAX_CONTENT) {
    return NextResponse.json({ error: "content_too_long" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) {
    return NextResponse.json({ error: "student_not_found" }, { status: 404 });
  }

  const branding = await prisma.schoolBranding.findUnique({
    where: { id: 1 },
    select: { adminCanWriteStudentReports: true },
  });
  const adminMayWrite = branding?.adminCanWriteStudentReports ?? false;

  if (role === "coach") {
    const coachId = jar.get("pss_coach_id")?.value;
    if (!coachId) {
      return NextResponse.json({ error: "coach_required" }, { status: 403 });
    }
    const coach = await prisma.coach.findUnique({ where: { id: coachId }, select: { id: true } });
    if (!coach) {
      return NextResponse.json({ error: "coach_invalid" }, { status: 403 });
    }

    const created = await prisma.studentReport.create({
      data: {
        studentId,
        content,
        authorCoachId: coach.id,
        authoredByAdmin: false,
      },
      include: {
        student: { select: { id: true, name: true } },
        authorCoach: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      report: {
        id: created.id,
        content: created.content,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        student: created.student,
        authoredByAdmin: false,
        authorCoach: created.authorCoach ? { id: created.authorCoach.id, name: created.authorCoach.name } : null,
      },
    });
  }

  if (role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!adminMayWrite) {
    return NextResponse.json({ error: "admin_write_disabled" }, { status: 403 });
  }

  const created = await prisma.studentReport.create({
    data: {
      studentId,
      content,
      authorCoachId: null,
      authoredByAdmin: true,
    },
    include: {
      student: { select: { id: true, name: true } },
      authorCoach: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    report: {
      id: created.id,
      content: created.content,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      student: created.student,
      authoredByAdmin: true,
      authorCoach: null,
    },
  });
}
