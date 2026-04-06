import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADMIN_PIN = process.env.ADMIN_PIN || "1234";

export async function POST(req: Request) {
  const body = (await req.json()) as { role?: string; pin?: string };
  const role = body.role === "coach" ? "coach" : "admin";

  if (role === "admin") {
    if (body.pin !== ADMIN_PIN) {
      return NextResponse.json({ ok: false, error: "PIN salah" }, { status: 401 });
    }
  }

  const jar = cookies();
  jar.set("pss_role", role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  return NextResponse.json({ ok: true, role });
}
