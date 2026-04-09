import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  disjointTraineeFromLeadIds,
  normalizeLevelIdList,
  serializeLevelIdList,
} from "@/lib/bundle-def";
import { assertSwimLevelIdsValid, SCHOOL_ID } from "@/lib/swim-level-guards";
import { NextResponse } from "next/server";

export async function GET() {
  const coaches = await prisma.coach.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(coaches);
}

export async function POST(req: Request) {
  const jar = await cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }

  const body = (await req.json()) as { name?: string; teachLevels?: unknown; traineeLevels?: unknown };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Nama wajib." }, { status: 400 });
  }

  const allLevels = await prisma.swimLevel.findMany({
    where: { schoolId: SCHOOL_ID },
    orderBy: { sortOrder: "asc" },
  });
  const allIds = allLevels.map((l) => l.id);

  let teachLevels = normalizeLevelIdList(body.teachLevels);
  if (teachLevels.length === 0) {
    teachLevels = [...allIds];
  }
  if (!(await assertSwimLevelIdsValid(prisma, teachLevels))) {
    return NextResponse.json({ error: "Ada id level yang tidak valid." }, { status: 400 });
  }

  const traineeLevels = disjointTraineeFromLeadIds(teachLevels, normalizeLevelIdList(body.traineeLevels));

  const created = await prisma.coach
    .create({
      data: {
        name,
        teachLevels: serializeLevelIdList(teachLevels),
        traineeLevels: serializeLevelIdList(traineeLevels),
      },
    })
    .catch(() => null);

  if (!created) {
    return NextResponse.json({ error: "Gagal menyimpan pelatih." }, { status: 400 });
  }

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const jar = await cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Parameter id wajib." }, { status: 400 });
  }

  const existing = await prisma.coach.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Pelatih tidak ditemukan." }, { status: 404 });
  }

  const body = (await req.json()) as { teachLevels?: unknown; traineeLevels?: unknown; name?: string };
  const data: { teachLevels?: string; traineeLevels?: string; name?: string } = {};

  if (body.name !== undefined) {
    const n = body.name.trim();
    if (!n) return NextResponse.json({ error: "Nama tidak boleh kosong." }, { status: 400 });
    data.name = n;
  }

  let teachLevels = normalizeLevelIdList(existing.teachLevels);
  if (body.teachLevels !== undefined) {
    teachLevels = normalizeLevelIdList(body.teachLevels);
    if (teachLevels.length === 0) {
      return NextResponse.json({ error: "Pilih minimal satu level (lead)." }, { status: 400 });
    }
    if (!(await assertSwimLevelIdsValid(prisma, teachLevels))) {
      return NextResponse.json({ error: "Ada id level yang tidak valid." }, { status: 400 });
    }
  }

  const traineeRaw =
    body.traineeLevels !== undefined
      ? normalizeLevelIdList(body.traineeLevels)
      : normalizeLevelIdList(existing.traineeLevels);
  if (traineeRaw.length > 0 && !(await assertSwimLevelIdsValid(prisma, traineeRaw))) {
    return NextResponse.json({ error: "Ada id level trainee yang tidak valid." }, { status: 400 });
  }

  const traineeLevels = disjointTraineeFromLeadIds(teachLevels, traineeRaw);

  if (body.teachLevels !== undefined) {
    data.teachLevels = serializeLevelIdList(teachLevels);
  }
  if (body.traineeLevels !== undefined || body.teachLevels !== undefined) {
    data.traineeLevels = serializeLevelIdList(traineeLevels);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Tidak ada field yang diubah." }, { status: 400 });
  }

  const updated = await prisma.coach
    .update({
      where: { id },
      data,
    })
    .catch(() => null);

  if (!updated) {
    return NextResponse.json({ error: "Pelatih tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const jar = await cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Parameter id wajib." }, { status: 400 });
  }

  const sessionCount = await prisma.scheduledSession.count({
    where: {
      OR: [{ coachPrimaryId: id }, { coachSecondaryId: id }],
    },
  });

  if (sessionCount > 0) {
    return NextResponse.json(
      {
        error: `Tidak bisa dihapus: pelatih masih terdaftar di ${sessionCount} sesi jadwal. Ubah atau hapus sesi dulu.`,
      },
      { status: 409 }
    );
  }

  await prisma.coach.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
