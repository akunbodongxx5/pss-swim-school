import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type SchoolBrandingDTO = {
  schoolName: string;
  logoDataUrl: string | null;
};

const DEFAULT_NAME = "Swim School";

/** Satu kali per request RSC (metadata + layout memakai yang sama). */
export const ensureSchoolBrandingRow = cache(async function ensureSchoolBrandingRow(): Promise<void> {
  await prisma.schoolBranding.upsert({
    where: { id: 1 },
    create: { id: 1, schoolName: DEFAULT_NAME, logoDataUrl: null },
    update: {},
  });
});

/** Hanya nama — untuk metadata/manifest tanpa memuat kolom logo (besar) dari DB. */
export const getSchoolBrandingMeta = cache(async function getSchoolBrandingMeta(): Promise<{ schoolName: string }> {
  await ensureSchoolBrandingRow();
  const row = await prisma.schoolBranding.findUnique({
    where: { id: 1 },
    select: { schoolName: true },
  });
  return { schoolName: row?.schoolName?.trim() || DEFAULT_NAME };
});

export const getSchoolBranding = cache(async function getSchoolBranding(): Promise<SchoolBrandingDTO> {
  await ensureSchoolBrandingRow();
  const row = await prisma.schoolBranding.findUnique({ where: { id: 1 } });
  return {
    schoolName: row?.schoolName?.trim() || DEFAULT_NAME,
    logoDataUrl: row?.logoDataUrl?.trim() || null,
  };
});
