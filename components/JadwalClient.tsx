"use client";

import type { LevelBundle } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { coachCanTeachBundle, maxStudentsForBundle, occupancyRatio } from "@/lib/domain";
import { useApp } from "@/lib/i18n-context";
import { tailDayOptionsForMonth } from "@/lib/calendar-month-rules";
import { sessionStartHoursForWibCalendarDate } from "@/lib/operating-hours";
import {
  clearAllSchedulesWithUndo,
  readScheduleUndo,
  removeScheduleUndo,
  type ScheduleUndoBlob,
} from "@/lib/schedule-undo";

type Coach = { id: string; name: string; teachLevels: unknown };
type Student = { id: string; name: string; level: number };
type SessionRow = {
  id: string;
  date: string;
  hour: number;
  lane: number;
  bundle: LevelBundle;
  coachPrimaryId: string;
  coachSecondaryId: string | null;
  coachPrimary: Coach;
  coachSecondary: Coach | null;
  enrollments: { student: Student }[];
};

function todayIsoWib(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const BUNDLES: LevelBundle[] = ["MIXED_1_3", "LEVEL_4", "MIXED_5_6", "LEVEL_7", "MIXED_8_9"];

function firstAllowedStartHour(iso: string) {
  const a = sessionStartHoursForWibCalendarDate(iso);
  return a[0] ?? 14;
}

export function JadwalClient({ canEdit }: { canEdit: boolean }) {
  const { t, bundleLabel } = useApp();
  const [from, setFrom] = useState(todayIsoWib);
  const [to, setTo] = useState(() => addDaysIso(todayIsoWib(), 13));
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [date, setDate] = useState(todayIsoWib);
  const [hour, setHour] = useState(() => firstAllowedStartHour(todayIsoWib()));
  const [lane, setLane] = useState(1);
  const [bundle, setBundle] = useState<LevelBundle>("MIXED_1_3");
  const [coachPrimaryId, setCoachPrimaryId] = useState("");
  const [coachSecondaryId, setCoachSecondaryId] = useState("");
  const [pickStudents, setPickStudents] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<
    { hour: number; lane: number; coachPrimaryId: string; reason: string }[]
  >([]);
  const [conflictModal, setConflictModal] = useState<
    null | { payload: Record<string, unknown>; labels: string[] }
  >(null);
  const [undoBlob, setUndoBlob] = useState<ScheduleUndoBlob | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [openTailDraft, setOpenTailDraft] = useState<number[]>([]);
  const [tailSaving, setTailSaving] = useState(false);

  useEffect(() => {
    function syncUndo() {
      setUndoBlob(readScheduleUndo());
    }
    syncUndo();
    window.addEventListener("pss-schedule-undo", syncUndo);
    return () => window.removeEventListener("pss-schedule-undo", syncUndo);
  }, []);

  const allowedStartHours = useMemo(() => sessionStartHoursForWibCalendarDate(date), [date]);

  const scheduleYm = useMemo(() => {
    const x = /^(\d{4})-(\d{2})/.exec(date);
    return x ? { y: Number(x[1]), m: Number(x[2]) } : null;
  }, [date]);

  const tailDayOpts = useMemo(() => {
    if (!scheduleYm) return [];
    return tailDayOptionsForMonth(scheduleYm.y, scheduleYm.m);
  }, [scheduleYm]);

  useEffect(() => {
    if (!allowedStartHours.includes(hour)) setHour(allowedStartHours[0] ?? 14);
  }, [date, hour, allowedStartHours]);

  useEffect(() => {
    if (!canEdit || !scheduleYm) return;
    let cancel = false;
    void fetch(`/api/schedule-month-config?year=${scheduleYm.y}&month=${scheduleYm.m}`)
      .then((r) => r.json())
      .then((d: { openTailDays?: number[] }) => {
        if (cancel) return;
        setOpenTailDraft(Array.isArray(d.openTailDays) ? d.openTailDays : []);
      })
      .catch(() => {
        if (!cancel) setOpenTailDraft([]);
      });
    return () => {
      cancel = true;
    };
  }, [canEdit, scheduleYm?.y, scheduleYm?.m]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [c, st, se] = await Promise.all([
        fetch("/api/coaches").then((r) => r.json()),
        fetch("/api/students").then((r) => r.json()),
        fetch(`/api/sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then((r) =>
          r.json()
        ),
      ]);
      setCoaches(c);
      setStudents(st);
      setSessions(se);
    } catch {
      setErr(t("schedule.loadError"));
    } finally {
      setLoading(false);
    }
  }, [from, to, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const eligibleCoaches = useMemo(
    () => coaches.filter((c) => coachCanTeachBundle(c.teachLevels, bundle)),
    [coaches, bundle]
  );

  const secondaryOptions = useMemo(
    () => eligibleCoaches.filter((c) => c.id !== coachPrimaryId),
    [eligibleCoaches, coachPrimaryId]
  );

  useEffect(() => {
    setCoachPrimaryId((prev) => {
      if (eligibleCoaches.some((c) => c.id === prev)) return prev;
      return eligibleCoaches[0]?.id ?? "";
    });
  }, [eligibleCoaches]);

  useEffect(() => {
    setCoachSecondaryId((prev) => {
      if (!prev) return "";
      if (!eligibleCoaches.some((c) => c.id === prev)) return "";
      if (prev === coachPrimaryId) return "";
      return prev;
    });
  }, [eligibleCoaches, coachPrimaryId]);

  const studentIds = useMemo(
    () => Object.entries(pickStudents).filter(([, v]) => v).map(([k]) => k),
    [pickStudents]
  );

  const coachCount = coachSecondaryId ? 2 : 1;
  const maxCap = maxStudentsForBundle(bundle, coachCount);

  async function loadSuggestions() {
    const r = await fetch(`/api/suggest?bundle=${bundle}&date=${encodeURIComponent(date)}`);
    const data = await r.json();
    if (!r.ok) {
      setErr(data.error ?? t("schedule.suggestError"));
      return;
    }
    setSuggestions(data);
  }

  function resetForm() {
    setEditingId(null);
    setPickStudents({});
    setCoachSecondaryId("");
  }

  function fillForm(s: SessionRow) {
    setEditingId(s.id);
    setDate(s.date.slice(0, 10));
    setHour(s.hour);
    setLane(s.lane);
    setBundle(s.bundle);
    setCoachPrimaryId(s.coachPrimaryId);
    setCoachSecondaryId(s.coachSecondaryId ?? "");
    const m: Record<string, boolean> = {};
    for (const e of s.enrollments) m[e.student.id] = true;
    setPickStudents(m);
  }

  async function save(confirmConflict?: boolean) {
    setMsg(null);
    setErr(null);
    const payload: Record<string, unknown> = {
      date,
      hour,
      lane,
      bundle,
      coachPrimaryId,
      coachSecondaryId: coachSecondaryId || null,
      studentIds,
      confirmConflict: !!confirmConflict,
    };
    const url = editingId ? `/api/sessions?id=${encodeURIComponent(editingId)}` : "/api/sessions";
    const method = editingId ? "PATCH" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (r.status === 409 && data.conflictWarnings) {
      setConflictModal({
        payload,
        labels: data.conflictWarnings.map((w: { label: string }) => w.label),
      });
      return;
    }
    if (!r.ok) {
      setErr((data.messages && data.messages.join("; ")) || data.error || t("schedule.saveError"));
      return;
    }
    setMsg(editingId ? t("schedule.savedUpdated") : t("schedule.savedCreated"));
    resetForm();
    await load();
  }

  async function confirmConflictOk() {
    if (!conflictModal) return;
    const payload = { ...conflictModal.payload, confirmConflict: true };
    const url = editingId ? `/api/sessions?id=${encodeURIComponent(editingId)}` : "/api/sessions";
    const method = editingId ? "PATCH" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    setConflictModal(null);
    if (!r.ok) {
      setErr((data.messages && data.messages.join("; ")) || data.error || t("schedule.saveError"));
      return;
    }
    setMsg(t("schedule.savedConflict"));
    resetForm();
    await load();
  }

  async function remove(id: string) {
    if (!confirm(t("schedule.deleteConfirm"))) return;
    await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  const eligibleStudents = students.filter((s) => {
    const allowed =
      bundle === "MIXED_1_3"
        ? [1, 2, 3]
        : bundle === "LEVEL_4"
          ? [4]
          : bundle === "MIXED_5_6"
            ? [5, 6]
            : bundle === "LEVEL_7"
              ? [7]
              : [8, 9];
    return allowed.includes(s.level);
  });

  const fieldClass =
    "mt-1 w-full min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)]";

  async function handleRestoreUndo() {
    const b = readScheduleUndo();
    if (!b?.sessions.length) return;
    setUndoBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/sessions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions: b.sessions }),
      });
      const data = (await r.json()) as { messages?: string[] };
      if (!r.ok) {
        const joined = Array.isArray(data.messages) ? data.messages.join(" ") : "";
        setErr(joined || t("schedule.undoRestoreFail"));
        return;
      }
      removeScheduleUndo();
      setUndoBlob(null);
      setMsg(t("schedule.undoRestoreOk"));
      await load();
    } finally {
      setUndoBusy(false);
    }
  }

  function handleDismissUndo() {
    removeScheduleUndo();
    setUndoBlob(null);
  }

  async function handleClearAllJadwal() {
    if (!confirm(t("menu.clearAllScheduleConfirm"))) return;
    setUndoBusy(true);
    setErr(null);
    try {
      const r = await clearAllSchedulesWithUndo();
      if (!r.ok) {
        setErr(t("menu.clearAllScheduleFail"));
        return;
      }
      setUndoBlob(readScheduleUndo());
      setMsg(t("menu.clearAllScheduleDone"));
      await load();
    } finally {
      setUndoBusy(false);
    }
  }

  function toggleTailDay(d: number) {
    setOpenTailDraft((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  }

  async function saveTailConfig() {
    if (!scheduleYm) return;
    setTailSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/schedule-month-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: scheduleYm.y,
          month: scheduleYm.m,
          openTailDays: openTailDraft,
        }),
      });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setErr(data.error ?? t("schedule.saveError"));
        return;
      }
      setMsg(t("schedule.tailSaved"));
    } finally {
      setTailSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {!canEdit && (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
          {t("schedule.coachReadOnly")}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block flex-1 text-sm">
          <span className="text-[var(--muted)]">{t("schedule.from")}</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={fieldClass} />
        </label>
        <label className="block flex-1 text-sm">
          <span className="text-[var(--muted)]">{t("schedule.to")}</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={fieldClass} />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-medium active:bg-[var(--border)]/40"
        >
          {t("schedule.reload")}
        </button>
        {canEdit && (
          <button
            type="button"
            disabled={undoBusy}
            onClick={() => void handleClearAllJadwal()}
            className="min-h-11 rounded-xl border border-[var(--danger)]/40 px-4 text-sm font-medium text-[var(--danger)] active:bg-[var(--danger)]/10 disabled:opacity-50"
          >
            {t("schedule.clearAllButton")}
          </button>
        )}
      </div>

      {canEdit && undoBlob && undoBlob.sessions.length > 0 && (
        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm dark:bg-amber-500/15">
          <p className="text-[var(--text)]">
            {t("schedule.undoBanner", { count: undoBlob.sessions.length })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={undoBusy}
              onClick={() => void handleRestoreUndo()}
              className="min-h-10 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("schedule.undoRestore")}
            </button>
            <button
              type="button"
              disabled={undoBusy}
              onClick={handleDismissUndo}
              className="min-h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-medium"
            >
              {t("schedule.undoDismiss")}
            </button>
          </div>
        </div>
      )}

      {msg && <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{msg}</p>}
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
      {loading && <p className="text-sm text-[var(--muted)]">{t("schedule.loading")}</p>}

      {canEdit && (
        <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <h2 className="text-base font-semibold">{editingId ? t("schedule.editSession") : t("schedule.addSession")}</h2>
          <div className="grid gap-4">
            <label className="block text-sm">
              {t("schedule.dateWib")}
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
            </label>
            {tailDayOpts.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/50 p-3">
                <h3 className="text-sm font-semibold">{t("schedule.tailMonthTitle")}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{t("schedule.tailMonthHint")}</p>
                <p className="mt-2 text-xs font-medium text-[var(--text)]">
                  {scheduleYm?.y}-{String(scheduleYm?.m ?? 0).padStart(2, "0")}
                </p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {tailDayOpts.map((d) => (
                    <label key={d} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={openTailDraft.includes(d)}
                        onChange={() => toggleTailDay(d)}
                      />
                      <span>{t("schedule.tailOpenDay", { day: d })}</span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={tailSaving}
                  onClick={() => void saveTailConfig()}
                  className="mt-3 min-h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-medium active:bg-[var(--border)]/40 disabled:opacity-50"
                >
                  {t("schedule.tailSave")}
                </button>
              </div>
            )}
            <label className="block text-sm">
              {t("schedule.startHour")}
              <select
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className={fieldClass}
              >
                {allowedStartHours.map((h) => (
                  <option key={h} value={h}>
                    {h}:00
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-[var(--muted)]">{t("schedule.operatingHoursHint")}</span>
            </label>
            <label className="block text-sm">
              {t("schedule.lane")}
              <input
                type="number"
                min={1}
                max={4}
                value={lane}
                onChange={(e) => setLane(Number(e.target.value))}
                className={fieldClass}
              />
            </label>
            <label className="block text-sm">
              {t("schedule.bundle")}
              <select
                value={bundle}
                onChange={(e) => setBundle(e.target.value as LevelBundle)}
                className={fieldClass}
              >
                {BUNDLES.map((b) => (
                  <option key={b} value={b}>
                    {bundleLabel(b)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              {t("schedule.coachPrimary")}
              <select
                value={coachPrimaryId}
                onChange={(e) => setCoachPrimaryId(e.target.value)}
                className={fieldClass}
              >
                {eligibleCoaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              {t("schedule.coachSecondary")}
              <select
                value={coachSecondaryId}
                onChange={(e) => setCoachSecondaryId(e.target.value)}
                className={fieldClass}
              >
                <option value="">—</option>
                {secondaryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">
              {t("schedule.studentsPick")}: {studentIds.length}/{maxCap} — {t("schedule.capacity")}{" "}
              {(occupancyRatio(studentIds.length, maxCap) * 100).toFixed(0)}%
            </p>
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[var(--border)] p-2">
              {eligibleStudents.map((s) => (
                <label
                  key={s.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-1 text-sm active:bg-[var(--border)]/30"
                >
                  <input
                    type="checkbox"
                    checked={!!pickStudents[s.id]}
                    onChange={(e) => setPickStudents((p) => ({ ...p, [s.id]: e.target.checked }))}
                    className="h-5 w-5"
                  />
                  <span>
                    {s.name}{" "}
                    <span className="text-[var(--muted)]">
                      L{s.level}
                    </span>
                  </span>
                </label>
              ))}
              {eligibleStudents.length === 0 && (
                <p className="px-2 py-3 text-sm text-[var(--muted)]">{t("schedule.noMatchingLevel")}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save()}
              className="min-h-11 flex-1 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white active:opacity-90"
            >
              {t("schedule.save")}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-medium"
              >
                {t("schedule.cancelEdit")}
              </button>
            )}
            <button
              type="button"
              onClick={() => void loadSuggestions()}
              className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-medium"
            >
              {t("schedule.suggestSlots")}
            </button>
          </div>
          {suggestions.length > 0 && (
            <ul className="space-y-2 border-t border-[var(--border)] pt-3 text-sm text-[var(--muted)]">
              {suggestions.slice(0, 8).map((sug, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="text-left font-medium text-[var(--accent)] active:underline"
                    onClick={() => {
                      setHour(sug.hour);
                      setLane(sug.lane);
                      setCoachPrimaryId(sug.coachPrimaryId);
                    }}
                  >
                    {t("schedule.slotLine", { hour: sug.hour, lane: sug.lane })}
                  </button>
                  <span className="block text-xs opacity-90">{sug.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("schedule.sessionList")}</h2>
        <ul className="space-y-3">
          {sessions.map((s) => {
            const cc = s.coachSecondaryId ? 2 : 1;
            const max = maxStudentsForBundle(s.bundle, cc);
            const occ = occupancyRatio(s.enrollments.length, max);
            return (
              <li
                key={s.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-bold text-[var(--accent)]">
                      {s.date.slice(0, 10)} · {s.hour}:00
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {t("schedule.thLane")} {s.lane} · {bundleLabel(s.bundle)}
                    </p>
                  </div>
                  <p className="rounded-full bg-[var(--border)]/40 px-3 py-1 text-xs font-semibold">
                    {s.enrollments.length}/{max} ({(occ * 100).toFixed(0)}%)
                  </p>
                </div>
                <p className="mt-2 text-sm">
                  <span className="text-[var(--muted)]">{t("schedule.thCoaches")}: </span>
                  {s.coachPrimary.name}
                  {s.coachSecondary ? ` + ${s.coachSecondary.name}` : ""}
                </p>
                <p className="mt-1 text-sm">
                  <span className="text-[var(--muted)]">{t("schedule.thStudents")}: </span>
                  {s.enrollments.map((e) => e.student.name).join(", ") || "—"}
                </p>
                {canEdit && (
                  <div className="mt-3 flex gap-4 border-t border-[var(--border)] pt-3">
                    <button
                      type="button"
                      className="min-h-10 text-sm font-semibold text-[var(--accent)]"
                      onClick={() => fillForm(s)}
                    >
                      {t("schedule.edit")}
                    </button>
                    <button
                      type="button"
                      className="min-h-10 text-sm font-semibold text-[var(--danger)]"
                      onClick={() => void remove(s.id)}
                    >
                      {t("schedule.delete")}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {sessions.length === 0 && !loading && (
          <p className="py-8 text-center text-sm text-[var(--muted)]">{t("schedule.noSessions")}</p>
        )}
      </section>

      {conflictModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl">
            <h3 className="font-semibold text-[var(--warn)]">{t("schedule.conflictTitle")}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
              {conflictModal.labels.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm">{t("schedule.conflictConfirm")}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="min-h-11 flex-1 rounded-xl bg-[var(--warn)] px-4 text-sm font-semibold text-black active:opacity-90"
                onClick={() => void confirmConflictOk()}
              >
                {t("schedule.conflictYes")}
              </button>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-xl border border-[var(--border)] px-4 text-sm font-medium"
                onClick={() => setConflictModal(null)}
              >
                {t("schedule.conflictCancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
