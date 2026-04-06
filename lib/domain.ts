import type { LevelBundle } from "@prisma/client";

export const BUNDLE_LABEL: Record<LevelBundle, string> = {
  MIXED_1_3: "Level 1–3 (gabung)",
  LEVEL_4: "Level 4",
  MIXED_5_6: "Level 5–6 (gabung)",
  LEVEL_7: "Level 7",
  MIXED_8_9: "Level 8–9 (gabung)",
};

/** Level renang yang boleh dalam satu kelas untuk bundle ini. */
export function levelsAllowedForBundle(bundle: LevelBundle): number[] {
  switch (bundle) {
    case "MIXED_1_3":
      return [1, 2, 3];
    case "LEVEL_4":
      return [4];
    case "MIXED_5_6":
      return [5, 6];
    case "LEVEL_7":
      return [7];
    case "MIXED_8_9":
      return [8, 9];
    default:
      return [];
  }
}

export function laneAllowedForBundle(bundle: LevelBundle, lane: number): boolean {
  if (bundle === "MIXED_1_3") return lane === 1;
  return lane >= 2 && lane <= 4;
}

/** Kapasitas maks murid sesuai bundle dan jumlah pelatih (1 atau 2). */
export function maxStudentsForBundle(bundle: LevelBundle, coachCount: 1 | 2): number {
  if (bundle === "MIXED_1_3") return coachCount === 1 ? 4 : 6;
  if (bundle === "LEVEL_4") return 6;
  return coachCount === 1 ? 10 : 13;
}

/** Serialisasi aman untuk kolom `Coach.teachLevels` (String di SQLite). */
export function serializeTeachLevels(levels: number[]): string {
  return JSON.stringify(normalizeTeachLevels(levels));
}

function coerceToLevelArray(input: unknown): unknown[] | null {
  if (input == null) return null;
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return null;
    try {
      const parsed = JSON.parse(s) as unknown;
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === "number" && Number.isInteger(parsed)) return [parsed];
      if (parsed && typeof parsed === "object" && "levelMin" in parsed && "levelMax" in parsed) {
        const o = parsed as { levelMin: unknown; levelMax: unknown };
        const min = Number(o.levelMin);
        const max = Number(o.levelMax);
        if (Number.isInteger(min) && Number.isInteger(max) && min >= 1 && max <= 9 && min <= max) {
          return Array.from({ length: max - min + 1 }, (_, i) => min + i);
        }
      }
    } catch {
      return null;
    }
    return null;
  }
  if (Array.isArray(input)) return input;
  if (typeof input === "number" && Number.isInteger(input)) return [input];
  return null;
}

/**
 * Normalisasi dari DB (string JSON), API, atau form: unik, 1–9, terurut.
 */
export function normalizeTeachLevels(input: unknown): number[] {
  const arr = coerceToLevelArray(input);
  if (!arr) return [];
  const out: number[] = [];
  for (const x of arr) {
    const n = typeof x === "number" ? x : Number(x);
    if (Number.isInteger(n) && n >= 1 && n <= 9) out.push(n);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

/** Pelatih boleh mengajar bundle jika setiap level dalam bundle ada di teachLevels. */
export function coachCanTeachBundle(teachLevelsRaw: unknown, bundle: LevelBundle): boolean {
  const levels = normalizeTeachLevels(teachLevelsRaw);
  const needed = levelsAllowedForBundle(bundle);
  return needed.length > 0 && needed.every((L) => levels.includes(L));
}

/** Teks ringkas untuk UI, mis. "1 · 2 · 4 · 8". */
export function formatTeachLevels(teachLevelsRaw: unknown): string {
  const levels = normalizeTeachLevels(teachLevelsRaw);
  return levels.length ? levels.join(" · ") : "—";
}

/** Occupancy 0–1 untuk UI. */
export function occupancyRatio(enrolled: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, enrolled / max);
}
