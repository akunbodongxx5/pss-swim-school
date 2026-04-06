import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ensureSchoolBrandingRow, getSchoolBranding } from "@/lib/school-branding-server";
import { validateLogoDataUrl, validateSchoolName } from "@/lib/school-branding-validate";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await ensureSchoolBrandingRow();
    const b = await getSchoolBranding();
    return NextResponse.json(b);
  } catch (e) {
    console.error("[school-branding GET]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

function resolveLogoForUpdate(
  body: { logoDataUrl?: unknown },
  existingLogo: string | null
): string | null | { error: string } {
  if (!Object.prototype.hasOwnProperty.call(body, "logoDataUrl")) {
    return existingLogo;
  }

  const raw = body.logoDataUrl;
  if (raw === null || raw === "") {
    return null;
  }
  if (typeof raw !== "string") {
    return { error: "logo_invalid" };
  }

  const trimmed = raw.trim();
  if (existingLogo !== null && trimmed === existingLogo.trim()) {
    return existingLogo;
  }

  return validateLogoDataUrl(trimmed);
}

export async function PUT(req: Request) {
  try {
    const role = cookies().get("pss_role")?.value;
    if (role === "coach") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    let body: { schoolName?: unknown; logoDataUrl?: unknown };
    try {
      body = (await req.json()) as { schoolName?: unknown; logoDataUrl?: unknown };
    } catch {
      return NextResponse.json({ error: "schoolName_invalid" }, { status: 400 });
    }

    const nameResult = validateSchoolName(body.schoolName);
    if (typeof nameResult !== "string") {
      return NextResponse.json({ error: nameResult.error }, { status: 400 });
    }

    await ensureSchoolBrandingRow();
    const existing = await prisma.schoolBranding.findUnique({ where: { id: 1 } });
    const existingLogo = existing?.logoDataUrl ?? null;

    const logoResolved = resolveLogoForUpdate(body, existingLogo);
    if (logoResolved && typeof logoResolved === "object" && "error" in logoResolved) {
      return NextResponse.json({ error: logoResolved.error }, { status: 400 });
    }

    await prisma.schoolBranding.upsert({
      where: { id: 1 },
      create: { id: 1, schoolName: nameResult, logoDataUrl: logoResolved as string | null },
      update: { schoolName: nameResult, logoDataUrl: logoResolved as string | null },
    });

    revalidatePath("/", "layout");

    const b = await getSchoolBranding();
    return NextResponse.json(b);
  } catch (e) {
    console.error("[school-branding PUT]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
