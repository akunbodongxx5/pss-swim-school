import {
  coachCanAssistBundleDef,
  coachCanTeachBundleDef,
  normalizeLevelIdList,
  serializeLevelIdList,
} from "@/lib/bundle-def";
import type { SessionBundleDefParsed } from "@/lib/bundle-def";

export type { SessionBundleDefParsed } from "@/lib/bundle-def";
export {
  laneAllowedForDef,
  maxStudentsForDef,
  normalizeLevelIdList,
  normalizeLevelIdSet,
  parseBundleDefRow,
  parseLevelIdsJson,
  serializeLevelIdList,
} from "@/lib/bundle-def";

/** Alias nama untuk kolom Coach.teachLevels / traineeLevels. */
export function serializeTeachLevels(ids: string[]): string {
  return serializeLevelIdList(ids);
}

export function serializeTraineeLevels(ids: string[]): string {
  return serializeLevelIdList(ids);
}

export function formatLevelIdList(raw: unknown): string {
  const ids = normalizeLevelIdList(raw);
  return ids.length ? ids.map((id) => id.slice(0, 8)).join(" · ") : "—";
}

export function occupancyRatio(enrolled: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, enrolled / max);
}

export function coachCanTeachBundle(
  teachLevelsRaw: unknown,
  def: SessionBundleDefParsed
): boolean {
  return coachCanTeachBundleDef(teachLevelsRaw, def);
}

export function coachCanAssistBundle(
  teachLevelsRaw: unknown,
  traineeLevelsRaw: unknown,
  def: SessionBundleDefParsed
): boolean {
  return coachCanAssistBundleDef(teachLevelsRaw, traineeLevelsRaw, def);
}
