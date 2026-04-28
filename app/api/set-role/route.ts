import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ADMIN_PIN = process.env.ADMIN_PIN || "1234";

/** Vercel set VERCEL=1. Self-hosted HTTPS: set COOKIE_SECURE=true di env. */
const cookieSecure = process.env.COOKIE_SECURE === "true" || process.env.VERCEL === "1";

const cookieOpts = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: cookieSecure,
  path: "/",
  maxAge: 60 * 60 * 24 * 400,
};

export async function POST(req: Request) {
  const body = (await req.json()) as { role?: string; pin?: string; coachId?: string };
  const role = body.role === "coach" ? "coach" : "admin";

  const jar = cookies();

  if (role === "admin") {
    if (body.pin !== ADMIN_PIN) {
      return NextResponse.json({ ok: false, error: "PIN salah" }, { status: 401 });
    }
    jar.set("pss_role", "admin", cookieOpts);
    jar.delete("pss_coach_id");
    return NextResponse.json({ ok: true, role: "admin" });
  }

  const cid = typeof body.coachId === "string" ? body.coachId.trim() : "";
  if (!cid) {
    return NextResponse.json({ ok: false, error: "coach_required" }, { status: 400 });
  }

  const coach = await prisma.coach.findUnique({ where: { id: cid }, select: { id: true } });
  if (!coach) {
    return NextResponse.json({ ok: false, error: "coach_invalid" }, { status: 400 });
  }

  jar.set("pss_role", "coach", cookieOpts);
  jar.set("pss_coach_id", coach.id, cookieOpts);
  return NextResponse.json({ ok: true, role: "coach", coachId: coach.id });
}
