import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertSwimLevelIdsValid } from "@/lib/swim-level-guards";

export async function GET() {
  const students = await prisma.student.findMany({
    orderBy: { name: "asc" },
    include: { swimLevel: true },
  });
  return NextResponse.json(students);
}

export async function POST(req: Request) {
  const jar = cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }
  const body = (await req.json()) as { name?: string; levelId?: string };
  const name = body.name?.trim();
  const levelId = typeof body.levelId === "string" ? body.levelId.trim() : "";
  if (!name || !levelId) {
    return NextResponse.json({ error: "Nama dan level wajib." }, { status: 400 });
  }
  if (!(await assertSwimLevelIdsValid(prisma, [levelId]))) {
    return NextResponse.json({ error: "Level tidak valid." }, { status: 400 });
  }
  const s = await prisma.student.create({
    data: { name, levelId },
    include: { swimLevel: true },
  });
  return NextResponse.json(s, { status: 201 });
}

export async function PATCH(req: Request) {
  const jar = cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Parameter id wajib." }, { status: 400 });

  const body = (await req.json()) as { name?: string; levelId?: string };
  const data: { name?: string; levelId?: string } = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.levelId !== undefined) {
    const levelId = body.levelId.trim();
    if (!levelId) return NextResponse.json({ error: "Level tidak boleh kosong." }, { status: 400 });
    if (!(await assertSwimLevelIdsValid(prisma, [levelId]))) {
      return NextResponse.json({ error: "Level tidak valid." }, { status: 400 });
    }
    data.levelId = levelId;
  }
  const s = await prisma.student
    .update({ where: { id }, data, include: { swimLevel: true } })
    .catch(() => null);
  if (!s) return NextResponse.json({ error: "Murid tidak ditemukan." }, { status: 404 });
  return NextResponse.json(s);
}

export async function DELETE(req: Request) {
  const jar = cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Parameter id wajib." }, { status: 400 });

  await prisma.student.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
