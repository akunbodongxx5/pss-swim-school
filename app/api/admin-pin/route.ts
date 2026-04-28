import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hashAdminPin, validateNewAdminPin, verifyAdminPin } from "@/lib/admin-pin";
import { ensureSchoolBrandingRow } from "@/lib/school-branding-server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENV_PIN = () => process.env.ADMIN_PIN || "1234";

function isAdmin(): boolean {
  return cookies().get("pss_role")?.value !== "coach";
}

/** Status tanpa membocorkan hash atau PIN. */
export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    await ensureSchoolBrandingRow();
    const row = await prisma.schoolBranding.findUnique({
      where: { id: 1 },
      select: { adminPinHash: true },
    });
    const pinConfiguredInDb = !!(row?.adminPinHash && row.adminPinHash.trim().length > 0);
    return NextResponse.json({ pinConfiguredInDb });
  } catch (e) {
    console.error("[admin-pin GET]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { currentPin?: unknown; newPin?: unknown; confirmPin?: unknown };
  try {
    body = (await req.json()) as { currentPin?: unknown; newPin?: unknown; confirmPin?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const currentPin = typeof body.currentPin === "string" ? body.currentPin : "";
  const newPin = typeof body.newPin === "string" ? body.newPin : "";
  const confirmPin = typeof body.confirmPin === "string" ? body.confirmPin : "";

  if (newPin.trim() !== confirmPin.trim()) {
    return NextResponse.json({ error: "adminPin_mismatch" }, { status: 400 });
  }

  const newCheck = validateNewAdminPin(newPin);
  if (newCheck !== "ok") {
    return NextResponse.json({ error: newCheck === "too_short" ? "adminPin_too_short" : "adminPin_too_long" }, { status: 400 });
  }

  await ensureSchoolBrandingRow();
  const row = await prisma.schoolBranding.findUnique({
    where: { id: 1 },
    select: { adminPinHash: true },
  });

  if (!verifyAdminPin(currentPin, row?.adminPinHash ?? null, ENV_PIN())) {
    return NextResponse.json({ error: "adminPin_wrong_current" }, { status: 401 });
  }

  if (safeCompareStrings(currentPin, newPin)) {
    return NextResponse.json({ error: "adminPin_same_as_current" }, { status: 400 });
  }

  const hashed = hashAdminPin(newPin.trim());

  await prisma.schoolBranding.update({
    where: { id: 1 },
    data: { adminPinHash: hashed },
  });

  return NextResponse.json({ ok: true });
}

function safeCompareStrings(a: string, b: string): boolean {
  const ta = a.trim();
  const tb = b.trim();
  if (ta.length !== tb.length) return false;
  return ta === tb;
}
