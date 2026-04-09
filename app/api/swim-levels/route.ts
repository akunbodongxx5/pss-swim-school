import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SCHOOL_ID = 1;
const MAX_LEVELS = 20;

export async function GET() {
  const levels = await prisma.swimLevel.findMany({
    where: { schoolId: SCHOOL_ID },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(levels);
}

export async function POST(req: Request) {
  const jar = await cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }
  const body = (await req.json()) as { name?: string; sortOrder?: number };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Nama level wajib." }, { status: 400 });

  const count = await prisma.swimLevel.count({ where: { schoolId: SCHOOL_ID } });
  if (count >= MAX_LEVELS) {
    return NextResponse.json({ error: `Maksimal ${MAX_LEVELS} level per sekolah.` }, { status: 400 });
  }

  const sortOrder =
    typeof body.sortOrder === "number" && body.sortOrder >= 1 && body.sortOrder <= MAX_LEVELS
      ? body.sortOrder
      : count + 1;

  const created = await prisma.swimLevel
    .create({
      data: { schoolId: SCHOOL_ID, name, sortOrder },
    })
    .catch(() => null);
  if (!created) {
    return NextResponse.json({ error: "Urutan level bentrok atau gagal menyimpan." }, { status: 400 });
  }
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const jar = await cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Parameter id wajib." }, { status: 400 });

  const body = (await req.json()) as { name?: string; sortOrder?: number };
  const data: { name?: string; sortOrder?: number } = {};
  if (body.name !== undefined) {
    const n = body.name.trim();
    if (!n) return NextResponse.json({ error: "Nama tidak boleh kosong." }, { status: 400 });
    data.name = n;
  }
  if (body.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder) || body.sortOrder < 1 || body.sortOrder > MAX_LEVELS) {
      return NextResponse.json({ error: "Urutan tidak valid." }, { status: 400 });
    }
    data.sortOrder = body.sortOrder;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }

  const updated = await prisma.swimLevel.update({ where: { id }, data }).catch(() => null);
  if (!updated) return NextResponse.json({ error: "Level tidak ditemukan." }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const jar = await cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Parameter id wajib." }, { status: 400 });

  const inUse =
    (await prisma.student.count({ where: { levelId: id } })) > 0 ||
    (await prisma.sessionBundleDefinition.count({
      where: { schoolId: SCHOOL_ID, levelIds: { contains: id } },
    })) > 0;
  if (inUse) {
    return NextResponse.json(
      { error: "Level masih dipakai murid atau bundle. Ubah dulu murid/bundle." },
      { status: 409 }
    );
  }

  await prisma.swimLevel.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
