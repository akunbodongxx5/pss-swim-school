import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Hapus semua sesi jadwal (enrollment ikut terhapus lewat relasi). */
export async function DELETE() {
  const jar = cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }

  const r = await prisma.scheduledSession.deleteMany({});
  return NextResponse.json({ ok: true, deleted: r.count });
}
