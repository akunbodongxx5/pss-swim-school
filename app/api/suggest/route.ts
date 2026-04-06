import { LevelBundle } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { suggestOpenSlots } from "@/lib/suggestions";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bundle = url.searchParams.get("bundle") as LevelBundle | null;
  const date = url.searchParams.get("date");
  if (!bundle || !date) {
    return NextResponse.json({ error: "Parameter bundle & date wajib." }, { status: 400 });
  }
  const valid: LevelBundle[] = ["MIXED_1_3", "LEVEL_4", "MIXED_5_6", "LEVEL_7", "MIXED_8_9"];
  if (!valid.includes(bundle)) {
    return NextResponse.json({ error: "Bundle tidak valid." }, { status: 400 });
  }
  const suggestions = await suggestOpenSlots(prisma, { bundle, isoDate: date });
  return NextResponse.json(suggestions);
}
