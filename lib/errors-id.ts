import type { SessionValidationError } from "@/lib/validate-session";

const MAP: Record<SessionValidationError["code"], string> = {
  CALENDAR_TAIL_CLOSED:
    "Tanggal 29–31 default libur (minggu ke-5). Atur pengecualian di Jadwal → ekor bulan untuk bulan ini.",
  OUTSIDE_OPERATING_HOURS:
    "Jam mulai tidak diizinkan: Sen–Jum 13:00–18:00 (mulai terakhir 17:00), Sab–Min 08:00–16:00 (mulai terakhir 15:00) WIB.",
  LANE_BUNDLE_MISMATCH: "Lintasan tidak cocok dengan aturan bundle kelas ini.",
  BUNDLE_NOT_FOUND: "Bundle kelas tidak ditemukan atau sudah dihapus.",
  COACH_PRIMARY_INVALID: "Pelatih utama tidak mencakup seluruh level bundle.",
  COACH_SECONDARY_NOT_FOUND: "Pelatih kedua tidak ditemukan.",
  COACH_SECONDARY_INVALID:
    "Pelatih kedua tidak mencakup bundle ini (atur level lead / trainee di menu Pelatih).",
  COACH_DUPLICATE: "Pelatih utama dan kedua tidak boleh sama.",
  LANE1_TOO_MANY_CLASSES: "Line 1 untuk level 1–3 sudah penuh (maksimal 2 kelas pada jam yang sama).",
  LANE_OCCUPIED: "Lintasan ini sudah dipakai kelas lain pada jam yang sama.",
  COACH_DOUBLE_BOOK: "Salah satu pelatih sudah mengajar di jam yang sama.",
  ENROLLMENT_OVER_CAPACITY: "Jumlah murid melebihi kapasitas untuk bundle dan jumlah pelatih.",
  STUDENT_LEVEL_MISMATCH: "Level murid tidak cocok dengan bundle kelas.",
  STUDENT_SAME_SESSION_TWICE: "Murid terdaftar dua kali dalam satu sesi.",
};

export function describeSessionErrors(errors: SessionValidationError[]): string[] {
  return errors.map((e) => {
    switch (e.code) {
      case "STUDENT_LEVEL_MISMATCH":
      case "STUDENT_SAME_SESSION_TWICE":
        return `${MAP[e.code]} (murid: ${e.studentId})`;
      default:
        return MAP[e.code];
    }
  });
}
