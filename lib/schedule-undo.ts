"use client";

export const SCHEDULE_UNDO_KEY = "pss_schedule_undo_v1";

export type UndoSessionPayload = {
  date: string;
  hour: number;
  lane: number;
  bundleId: string;
  coachPrimaryId: string;
  coachSecondaryId: string | null;
  studentIds: string[];
};

export type ScheduleUndoBlob = {
  savedAt: number;
  sessions: UndoSessionPayload[];
};

export function parseScheduleUndo(raw: string | null): ScheduleUndoBlob | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as ScheduleUndoBlob;
    if (!o || !Array.isArray(o.sessions)) return null;
    return o;
  } catch {
    return null;
  }
}

/** Map response GET /api/sessions ke payload undo (tanggal kalender WIB). */
export function sessionsResponseToUndoPayload(sessions: unknown[]): UndoSessionPayload[] {
  if (!Array.isArray(sessions)) return [];
  return (sessions as Record<string, unknown>[]).map((row) => ({
    date: new Date(String(row.date)).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }),
    hour: Number(row.hour),
    lane: Number(row.lane),
    bundleId: String(row.bundleId),
    coachPrimaryId: String(row.coachPrimaryId),
    coachSecondaryId: row.coachSecondaryId ? String(row.coachSecondaryId) : null,
    studentIds: Array.isArray(row.enrollments)
      ? (row.enrollments as { student: { id: string } }[]).map((e) => e.student.id)
      : [],
  }));
}

export function readScheduleUndo(): ScheduleUndoBlob | null {
  if (typeof window === "undefined") return null;
  return parseScheduleUndo(sessionStorage.getItem(SCHEDULE_UNDO_KEY));
}

export function writeScheduleUndo(sessions: UndoSessionPayload[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SCHEDULE_UNDO_KEY, JSON.stringify({ savedAt: Date.now(), sessions }));
  window.dispatchEvent(new Event("pss-schedule-undo"));
}

export function removeScheduleUndo() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SCHEDULE_UNDO_KEY);
  window.dispatchEvent(new Event("pss-schedule-undo"));
}

/** Snapshot penuh → hapus semua sesi → simpan undo di sessionStorage (tab yang sama). */
export async function clearAllSchedulesWithUndo(): Promise<
  { ok: true; deleted: number } | { ok: false; error: string }
> {
  const gr = await fetch("/api/sessions?from=2000-01-01&to=2099-12-31");
  if (!gr.ok) return { ok: false, error: "load" };
  const all = await gr.json();
  const snapshot = sessionsResponseToUndoPayload(all);
  const dr = await fetch("/api/sessions/all", { method: "DELETE" });
  if (!dr.ok) return { ok: false, error: "delete" };
  const data = (await dr.json()) as { deleted?: number };
  writeScheduleUndo(snapshot);
  return { ok: true, deleted: data.deleted ?? 0 };
}
