import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizeOpenTailDays,
  parseOpenTailDaysJson,
  serializeOpenTailDays,
} from "@/lib/calendar-month-rules";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const y = Number(url.searchParams.get("year"));
  const m = Number(url.searchParams.get("month"));
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return NextResponse.json({ error: "Parameter year & month (1–12) wajib." }, { status: 400 });
  }

  const row = await prisma.scheduleMonthConfig.findUnique({
    where: { year_month: { year: y, month: m } },
  });
  return NextResponse.json({
    year: y,
    month: m,
    openTailDays: parseOpenTailDaysJson(row?.openTailDays),
  });
}

export async function PUT(req: Request) {
  const jar = cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }

  const body = (await req.json()) as { year?: number; month?: number; openTailDays?: unknown };
  const year = body.year;
  const month = body.month;
  if (!Number.isInteger(year) || !Number.isInteger(month) || month! < 1 || month! > 12) {
    return NextResponse.json({ error: "year & month (1–12) wajib." }, { status: 400 });
  }

  const openTailDays = normalizeOpenTailDays(body.openTailDays);
  const saved = await prisma.scheduleMonthConfig.upsert({
    where: { year_month: { year: year!, month: month! } },
    create: {
      year: year!,
      month: month!,
      openTailDays: serializeOpenTailDays(openTailDays),
    },
    update: { openTailDays: serializeOpenTailDays(openTailDays) },
  });

  return NextResponse.json({
    year: saved.year,
    month: saved.month,
    openTailDays: parseOpenTailDaysJson(saved.openTailDays),
  });
}
