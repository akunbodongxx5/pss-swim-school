import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { suggestOpenSlots } from "@/lib/suggestions";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bundleId = url.searchParams.get("bundleId");
  const date = url.searchParams.get("date");
  if (!bundleId || !date) {
    return NextResponse.json({ error: "Parameter bundleId & date wajib." }, { status: 400 });
  }
  const bundle = await prisma.sessionBundleDefinition.findUnique({ where: { id: bundleId } });
  if (!bundle) {
    return NextResponse.json({ error: "Bundle tidak ditemukan." }, { status: 400 });
  }
  const suggestions = await suggestOpenSlots(prisma, { bundleRow: bundle, isoDate: date });
  return NextResponse.json(suggestions);
}
