/** Simpan tanggal kalender sebagai UTC noon agar aman di SQLite / Prisma. */
export function calendarDateFromIso(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) throw new Error("Tanggal harus YYYY-MM-DD");
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo, d, 12, 0, 0, 0));
}

export function formatIsoDateInWIB(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}
