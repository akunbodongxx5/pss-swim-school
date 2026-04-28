/** Tanggal laporan YYYY-MM-DD → UTC midnight untuk kolom @db.Date. */
export function parseReportDateIso(iso: string | undefined | null): Date | null {
  if (!iso || typeof iso !== "string") return null;
  const t = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const [y, m, d] = t.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  const min = Date.UTC(2000, 0, 1);
  const dtUtc = dt.getTime();
  if (dtUtc < min) return null;
  const today = new Date();
  const maxSlack = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 2);
  if (dtUtc > maxSlack) return null;
  return dt;
}

/** Hari ini kalender lokal → YYYY-MM-DD untuk `<input type="date">`. */
export function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** YYYY-MM-DD → tanggal medium locale (untuk tampilan kartu). */
export function formatIsoDateLocalMedium(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { dateStyle: "medium" });
}
