/**
 * Definisi bundle dari DB (SessionBundleDefinition) — dipakai validasi & UI.
 */

export type SessionBundleDefParsed = {
  id: string;
  schoolId: number;
  slug: string;
  name: string;
  sortOrder: number;
  /** ID SwimLevel yang boleh dalam kelas ini. */
  levelIds: string[];
  /** Lintasan yang diizinkan, mis. [1] atau [2,3,4]. */
  allowedLanes: number[];
  maxStudents1Coach: number;
  maxStudents2Coach: number;
  /** Jika di-set: maks sesi bundle ini di line 1 pada jam yang sama (mis. 2). */
  maxConcurrentSessionsOnLane1: number | null;
};

export function parseAllowedLanesJson(raw: string): number[] {
  try {
    const a = JSON.parse(raw) as unknown;
    if (!Array.isArray(a)) return [];
    const out: number[] = [];
    for (const x of a) {
      const n = typeof x === "number" ? x : Number(x);
      if (Number.isInteger(n) && n >= 1 && n <= 8) out.push(n);
    }
    return [...new Set(out)].sort((x, y) => x - y);
  } catch {
    return [];
  }
}

export function parseLevelIdsJson(raw: string): string[] {
  try {
    const a = JSON.parse(raw) as unknown;
    if (!Array.isArray(a)) return [];
    const out: string[] = [];
    for (const x of a) {
      if (typeof x === "string" && x.length > 0) out.push(x);
    }
    return [...new Set(out)];
  } catch {
    return [];
  }
}

export function parseBundleDefRow(row: {
  id: string;
  schoolId: number;
  slug: string;
  name: string;
  sortOrder: number;
  levelIds: string;
  allowedLanesJson: string;
  maxStudents1Coach: number;
  maxStudents2Coach: number;
  maxConcurrentSessionsOnLane1: number | null;
}): SessionBundleDefParsed {
  return {
    id: row.id,
    schoolId: row.schoolId,
    slug: row.slug,
    name: row.name,
    sortOrder: row.sortOrder,
    levelIds: parseLevelIdsJson(row.levelIds),
    allowedLanes: parseAllowedLanesJson(row.allowedLanesJson),
    maxStudents1Coach: row.maxStudents1Coach,
    maxStudents2Coach: row.maxStudents2Coach,
    maxConcurrentSessionsOnLane1: row.maxConcurrentSessionsOnLane1,
  };
}

export function laneAllowedForDef(def: SessionBundleDefParsed, lane: number): boolean {
  return def.allowedLanes.includes(lane);
}

export function maxStudentsForDef(def: SessionBundleDefParsed, coachCount: 1 | 2): number {
  return coachCount === 1 ? def.maxStudents1Coach : def.maxStudents2Coach;
}

export function coachCanTeachBundleDef(teachLevelIdsRaw: unknown, def: SessionBundleDefParsed): boolean {
  const have = normalizeLevelIdSet(teachLevelIdsRaw);
  const needed = def.levelIds;
  return needed.length > 0 && needed.every((id) => have.has(id));
}

export function coachCanAssistBundleDef(
  teachLevelIdsRaw: unknown,
  traineeLevelIdsRaw: unknown,
  def: SessionBundleDefParsed
): boolean {
  const lead = normalizeLevelIdSet(teachLevelIdsRaw);
  const train = disjointTraineeFromLeadIdSet(lead, normalizeLevelIdList(traineeLevelIdsRaw));
  const needed = def.levelIds;
  return needed.length > 0 && needed.every((id) => lead.has(id) || train.has(id));
}

/** Lead & trainee disjoint untuk id level (string). */
export function disjointTraineeFromLeadIds(lead: string[], trainee: string[]): string[] {
  const L = new Set(lead);
  return trainee.filter((t) => !L.has(t));
}

function disjointTraineeFromLeadIdSet(lead: Set<string>, trainee: string[]): Set<string> {
  return new Set(trainee.filter((t) => !lead.has(t)));
}

/** Normalisasi JSON array id level (string cuid). */
export function normalizeLevelIdList(input: unknown): string[] {
  if (input == null) return [];
  let arr: unknown[] = [];
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return [];
    try {
      const p = JSON.parse(s) as unknown;
      arr = Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  } else if (Array.isArray(input)) {
    arr = input;
  } else return [];
  const out: string[] = [];
  for (const x of arr) {
    if (typeof x === "string" && x.length > 0) out.push(x);
  }
  return [...new Set(out)];
}

export function normalizeLevelIdSet(input: unknown): Set<string> {
  return new Set(normalizeLevelIdList(input));
}

export function serializeLevelIdList(ids: string[]): string {
  return JSON.stringify(normalizeLevelIdList(ids));
}
