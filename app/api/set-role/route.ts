import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json()) as { role?: string };
  const role = body.role === "coach" ? "coach" : "admin";
  const jar = cookies();
  jar.set("pss_role", role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  return NextResponse.json({ ok: true, role });
}
