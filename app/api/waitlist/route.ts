import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.waitlistEntry.findMany({
    where: { status: "pending" },
    include: { student: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const jar = cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }
  const body = (await req.json()) as { studentId?: string; note?: string };
  if (!body.studentId) return NextResponse.json({ error: "studentId wajib." }, { status: 400 });
  const w = await prisma.waitlistEntry.create({
    data: { studentId: body.studentId, note: body.note?.trim() || null },
    include: { student: true },
  });
  return NextResponse.json(w, { status: 201 });
}

export async function PATCH(req: Request) {
  const jar = cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Parameter id wajib." }, { status: 400 });

  const body = (await req.json()) as { status?: string };
  if (!body.status) return NextResponse.json({ error: "status wajib." }, { status: 400 });
  const w = await prisma.waitlistEntry
    .update({ where: { id }, data: { status: body.status } })
    .catch(() => null);
  if (!w) return NextResponse.json({ error: "Entri tidak ditemukan." }, { status: 404 });
  return NextResponse.json(w);
}
