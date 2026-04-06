import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureSchoolBrandingRow, getSchoolBranding } from "@/lib/school-branding-server";
import { validateLogoDataUrl, validateSchoolName } from "@/lib/school-branding-validate";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await ensureSchoolBrandingRow();
  const b = await getSchoolBranding();
  return NextResponse.json(b);
}

export async function PUT(req: Request) {
  const role = cookies().get("pss_role")?.value;
  if (role === "coach") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { schoolName?: unknown; logoDataUrl?: unknown };

  const nameResult = validateSchoolName(body.schoolName);
  if (typeof nameResult !== "string") {
    return NextResponse.json({ error: nameResult.error }, { status: 400 });
  }

  const logoResult = validateLogoDataUrl(body.logoDataUrl);
  if (logoResult && typeof logoResult === "object" && "error" in logoResult) {
    return NextResponse.json({ error: logoResult.error }, { status: 400 });
  }

  await prisma.schoolBranding.upsert({
    where: { id: 1 },
    create: { id: 1, schoolName: nameResult, logoDataUrl: logoResult },
    update: { schoolName: nameResult, logoDataUrl: logoResult },
  });

  const b = await getSchoolBranding();
  return NextResponse.json(b);
}
