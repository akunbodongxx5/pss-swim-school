import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type SchoolBrandingDTO = {
  schoolName: string;
  logoDataUrl: string | null;
};

const DEFAULT_NAME = "Swim School";

export const getSchoolBranding = cache(async function getSchoolBranding(): Promise<SchoolBrandingDTO> {
  const row = await prisma.schoolBranding.findUnique({ where: { id: 1 } });
  return {
    schoolName: row?.schoolName?.trim() || DEFAULT_NAME,
    logoDataUrl: row?.logoDataUrl?.trim() || null,
  };
});

/** Pastikan baris id=1 ada (tanpa mengubah nama/logo yang sudah diset). */
export async function ensureSchoolBrandingRow(): Promise<void> {
  await prisma.schoolBranding.upsert({
    where: { id: 1 },
    create: { id: 1, schoolName: DEFAULT_NAME, logoDataUrl: null },
    update: {},
  });
}
