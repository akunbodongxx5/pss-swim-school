import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Peran aktual dari cookie (sumber kebenaran untuk UI client setelah login/ganti peran). */
export async function GET() {
  const jar = cookies();
  const role = jar.get("pss_role")?.value === "coach" ? "coach" : "admin";
  const coachId = jar.get("pss_coach_id")?.value ?? null;
  return NextResponse.json({ role, coachId });
}
