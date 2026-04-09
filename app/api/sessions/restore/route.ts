import type { LevelBundle, PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calendarDateFromIso } from "@/lib/dates";
import { validateScheduledSession } from "@/lib/validate-session";
import { describeSessionErrors } from "@/lib/errors-id";

type Row = {
  date: string;
  hour: number;
  lane: number;
  bundle: string;
  coachPrimaryId: string;
  coachSecondaryId: string | null;
  studentIds: string[];
};

/**
 * Pulihkan banyak sesi sekaligus (admin). Lewati peringatan pasangan konflik murid.
 * Validasi slot/pelatih/kapasitas tetap dijalankan.
 */
export async function POST(req: Request) {
  const jar = cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }

  const body = (await req.json()) as { sessions?: Row[] };
  const sessions = body.sessions;
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return NextResponse.json({ error: "Daftar sesi kosong." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const txDb = tx as unknown as PrismaClient;
      for (const s of sessions) {
        const date = calendarDateFromIso(s.date);
        const bundle = s.bundle as LevelBundle;
        const studentIds = s.studentIds ?? [];
        const secId = s.coachSecondaryId ?? null;
        const val = await validateScheduledSession(txDb, {
          date,
          hour: s.hour,
          lane: s.lane,
          bundle,
          coachPrimaryId: s.coachPrimaryId,
          coachSecondaryId: secId,
          enrollmentStudentIds: studentIds,
        });
        if (val.length) {
          const err = new Error("VALIDATION");
          (err as Error & { validation: unknown }).validation = {
            errors: val,
            messages: describeSessionErrors(val),
          };
          throw err;
        }
        await tx.scheduledSession.create({
          data: {
            date,
            hour: s.hour,
            lane: s.lane,
            bundle,
            coachPrimaryId: s.coachPrimaryId,
            coachSecondaryId: secId,
            enrollments: {
              create: studentIds.map((studentId) => ({ studentId })),
            },
          },
        });
      }
    });

    return NextResponse.json({ ok: true, restored: sessions.length });
  } catch (e) {
    if (e instanceof Error && e.message === "VALIDATION" && "validation" in e) {
      return NextResponse.json((e as Error & { validation: unknown }).validation, { status: 400 });
    }
    throw e;
  }
}
