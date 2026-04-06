import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setUTCHours(23, 59, 59, 999);

  const weekStart = new Date(today);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const [totalStudents, totalCoaches, todaySessions, weekSessions] = await Promise.all([
    prisma.student.count(),
    prisma.coach.count(),
    prisma.scheduledSession.count({ where: { date: { gte: today, lte: todayEnd } } }),
    prisma.scheduledSession.count({ where: { date: { gte: weekStart, lte: weekEnd } } }),
  ]);

  return NextResponse.json({ totalStudents, totalCoaches, todaySessions, weekSessions });
}
