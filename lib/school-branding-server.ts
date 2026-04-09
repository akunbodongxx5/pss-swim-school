import { cache } from "react";
import { withDbRetry } from "@/lib/db-retry";
import { prisma } from "@/lib/prisma";

export type SchoolBrandingDTO = {
  schoolName: string;
  logoDataUrl: string | null;
};

const DEFAULT_NAME = "Swim School";

/** Satu kali per request RSC — hindari upsert tiap hit jika baris sudah ada. */
export const ensureSchoolBrandingRow = cache(async function ensureSchoolBrandingRow(): Promise<void> {
  const exists = await withDbRetry(() =>
    prisma.schoolBranding.findUnique({ where: { id: 1 }, select: { id: true } }),
  );
  if (exists) return;
  try {
    await withDbRetry(() =>
      prisma.schoolBranding.create({
        data: { id: 1, schoolName: DEFAULT_NAME, logoDataUrl: null },
      }),
    );
  } catch {
    /* race: baris dibuat request lain */
  }
});

/** Hanya nama + logoVersion — untuk metadata/manifest tanpa memuat kolom logo (besar) dari DB. */
export const getSchoolBrandingMeta = cache(async function getSchoolBrandingMeta(): Promise<{ schoolName: string; logoVersion: number }> {
  await ensureSchoolBrandingRow();
  const row = await withDbRetry(() =>
    prisma.schoolBranding.findUnique({
      where: { id: 1 },
      select: { schoolName: true, logoVersion: true },
    }),
  );
  return { schoolName: row?.schoolName?.trim() || DEFAULT_NAME, logoVersion: row?.logoVersion ?? 1 };
});

export const getSchoolBranding = cache(async function getSchoolBranding(): Promise<SchoolBrandingDTO> {
  await ensureSchoolBrandingRow();
  const row = await withDbRetry(() => prisma.schoolBranding.findUnique({ where: { id: 1 } }));
  return {
    schoolName: row?.schoolName?.trim() || DEFAULT_NAME,
    logoDataUrl: row?.logoDataUrl?.trim() || null,
  };
});
