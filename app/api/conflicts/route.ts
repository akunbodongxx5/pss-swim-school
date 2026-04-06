import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderedPair } from "@/lib/conflicts";

export async function GET() {
  const pairs = await prisma.conflictPair.findMany({
    include: { studentA: true, studentB: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(pairs);
}

export async function POST(req: Request) {
  const jar = cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }
  const body = (await req.json()) as { studentAId?: string; studentBId?: string };
  if (!body.studentAId || !body.studentBId || body.studentAId === body.studentBId) {
    return NextResponse.json({ error: "Dua murid berbeda wajib." }, { status: 400 });
  }
  const [a, b] = orderedPair(body.studentAId, body.studentBId);
  const p = await prisma.conflictPair
    .create({
      data: { studentAId: a, studentBId: b },
      include: { studentA: true, studentB: true },
    })
    .catch(() => null);
  if (!p) return NextResponse.json({ error: "Pasangan sudah ada atau gagal menyimpan." }, { status: 400 });
  return NextResponse.json(p, { status: 201 });
}

export async function DELETE(req: Request) {
  const jar = cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Parameter id wajib." }, { status: 400 });

  await prisma.conflictPair.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
