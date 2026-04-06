import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { normalizeTeachLevels, serializeTeachLevels } from "@/lib/domain";
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

  const body = (await req.json()) as { name?: string; teachLevels?: unknown };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Nama wajib." }, { status: 400 });
  }

  let teachLevels = normalizeTeachLevels(body.teachLevels);
  if (teachLevels.length === 0) {
    teachLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  }

  const created = await prisma.coach
    .create({
      data: { name, teachLevels: serializeTeachLevels(teachLevels) },
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

  const body = (await req.json()) as { teachLevels?: unknown; name?: string };
  const data: { teachLevels?: string; name?: string } = {};

  if (body.name !== undefined) {
    const n = body.name.trim();
    if (!n) return NextResponse.json({ error: "Nama tidak boleh kosong." }, { status: 400 });
    data.name = n;
  }

  if (body.teachLevels !== undefined) {
    const teachLevels = normalizeTeachLevels(body.teachLevels);
    if (teachLevels.length === 0) {
      return NextResponse.json({ error: "Pilih minimal satu level (1–9)." }, { status: 400 });
    }
    data.teachLevels = serializeTeachLevels(teachLevels);
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
