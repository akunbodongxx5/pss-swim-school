import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const students = await prisma.student.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(students);
}

export async function POST(req: Request) {
  const jar = cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }
  const body = (await req.json()) as { name?: string; level?: number };
  if (!body.name || typeof body.level !== "number" || body.level < 1 || body.level > 9) {
    return NextResponse.json({ error: "Nama dan level 1–9 wajib." }, { status: 400 });
  }
  const s = await prisma.student.create({ data: { name: body.name.trim(), level: body.level } });
  return NextResponse.json(s, { status: 201 });
}

export async function PATCH(req: Request) {
  const jar = cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Parameter id wajib." }, { status: 400 });

  const body = (await req.json()) as { name?: string; level?: number };
  const data: { name?: string; level?: number } = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.level !== undefined) {
    if (body.level < 1 || body.level > 9) {
      return NextResponse.json({ error: "Level harus 1–9." }, { status: 400 });
    }
    data.level = body.level;
  }
  const s = await prisma.student.update({ where: { id }, data }).catch(() => null);
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
