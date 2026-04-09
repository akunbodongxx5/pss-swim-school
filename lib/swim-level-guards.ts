import type { PrismaClient } from "@prisma/client";

const SCHOOL_ID = 1;

/** Pastikan semua id ada di SwimLevel sekolah ini. */
export async function assertSwimLevelIdsValid(db: PrismaClient, ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const n = await db.swimLevel.count({
    where: { schoolId: SCHOOL_ID, id: { in: ids } },
  });
  return n === ids.length;
}

export { SCHOOL_ID };
