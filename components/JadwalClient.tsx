"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  LayoutGrid,
  List,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  coachCanAssistBundle,
  coachCanTeachBundle,
  maxStudentsForDef,
  occupancyRatio,
  parseBundleDefRow,
} from "@/lib/domain";
import { useApp } from "@/lib/i18n-context";
import { tailDayOptionsForMonth } from "@/lib/calendar-month-rules";
import { sessionStartHoursForWibCalendarDate } from "@/lib/operating-hours";
import {
  clearAllSchedulesWithUndo,
  readScheduleUndo,
  removeScheduleUndo,
  type ScheduleUndoBlob,
} from "@/lib/schedule-undo";

type Coach = { id: string; name: string; teachLevels: unknown; traineeLevels?: unknown };
type ApiBundle = {
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
};
type Student = {
  id: string;
  name: string;
  levelId: string;
  swimLevel?: { name: string; sortOrder: number };
};
type SessionRow = {
  id: string;
  date: string;
  hour: number;
  lane: number;
  bundleId: string;
  bundle: ApiBundle;
  coachPrimaryId: string;
  coachSecondaryId: string | null;
  coachPrimary: Coach;
  coachSecondary: Coach | null;
  enrollments: { student: Student }[];
};

function maxCapForBundleRow(bundle: ApiBundle, coachCount: 1 | 2): number {
  return maxStudentsForDef(parseBundleDefRow(bundle), coachCount);
}

/* ── helpers ─────────────────────────────────────────────────── */

const DAY_NAMES_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;
const MONTH_NAMES_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
] as const;

function formatDateId(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const dayName = DAY_NAMES_ID[dt.getUTCDay()];
  const monthName = MONTH_NAMES_ID[m - 1];
  return `${dayName}, ${d} ${monthName} ${y}`;
}

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

function firstAllowedStartHour(iso: string) {
  const a = sessionStartHoursForWibCalendarDate(iso);
  return a[0] ?? 14;
}

function occBadgeClass(ratio: number): string {
  const pct = ratio * 100;
  if (pct >= 70) return "bg-emerald-500/20 text-emerald-400";
  if (pct >= 30) return "bg-amber-500/20 text-amber-400";
  return "bg-red-500/20 text-red-400";
}

function scrollToSessionEditor() {
  if (typeof document === "undefined") return;
  const el = document.getElementById("pss-session-editor");
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

/** Pelatih kedua hanya lolos lewat level trainee (bukan lead) untuk bundle ini. */
function secondaryIsTraineeOnly(c: Coach, bundle: ApiBundle | null): boolean {
  if (!bundle) return false;
  const def = parseBundleDefRow(bundle);
  return (
    coachCanAssistBundle(c.teachLevels, c.traineeLevels, def) &&
    !coachCanTeachBundle(c.teachLevels, def)
  );
}

/* ── component ───────────────────────────────────────────────── */

export function JadwalClient({ canEdit }: { canEdit: boolean }) {
  const { t } = useApp();

  /* range & data */
  const [from, setFrom] = useState(todayIsoWib);
  const [to, setTo] = useState(() => addDaysIso(todayIsoWib(), 13));
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);

  /* toast (replaces plain msg / err) */
  const [toast, setToast] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  /* form */
  const [date, setDate] = useState(todayIsoWib);
  const [hour, setHour] = useState(() => firstAllowedStartHour(todayIsoWib()));
  const [lane, setLane] = useState(1);
  const [bundleDefs, setBundleDefs] = useState<ApiBundle[]>([]);
  const [bundleId, setBundleId] = useState("");
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

  /* search & view mode */
  const [searchQ, setSearchQ] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "timetable">("list");

  /* ── toast auto-dismiss ─────────────────────────────────────── */
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  function showToast(text: string, type: "ok" | "err") {
    setToast({ text, type });
  }

  /* ── undo listener ──────────────────────────────────────────── */
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
  }, [canEdit, scheduleYm]);

  /* ── data loading ───────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    setToast(null);
    try {
      const [c, st, se, bd] = await Promise.all([
        fetch("/api/coaches").then((r) => r.json()),
        fetch("/api/students").then((r) => r.json()),
        fetch(`/api/sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then((r) =>
          r.json()
        ),
        fetch("/api/session-bundles").then((r) => r.json()),
      ]);
      setCoaches(c);
      setStudents(st);
      setSessions(se);
      setBundleDefs(Array.isArray(bd) ? bd : []);
    } catch {
      showToast(t("schedule.loadError"), "err");
    } finally {
      setLoading(false);
    }
  }, [from, to, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedBundleDef = useMemo(() => {
    const row = bundleDefs.find((b) => b.id === bundleId);
    return row ? parseBundleDefRow(row) : null;
  }, [bundleDefs, bundleId]);

  useEffect(() => {
    if (bundleDefs.length && !bundleDefs.some((b) => b.id === bundleId)) {
      setBundleId(bundleDefs[0].id);
    }
  }, [bundleDefs, bundleId]);

  /* ── derived coaches / students ─────────────────────────────── */
  const eligibleCoaches = useMemo(
    () =>
      selectedBundleDef
        ? coaches.filter((c) => coachCanTeachBundle(c.teachLevels, selectedBundleDef))
        : [],
    [coaches, selectedBundleDef]
  );

  const secondaryOptions = useMemo(
    () =>
      selectedBundleDef
        ? coaches.filter(
            (c) =>
              c.id !== coachPrimaryId &&
              coachCanAssistBundle(c.teachLevels, c.traineeLevels, selectedBundleDef)
          )
        : [],
    [coaches, coachPrimaryId, selectedBundleDef]
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
      if (!coaches.some((c) => c.id === prev)) return "";
      if (prev === coachPrimaryId) return "";
      const c = coaches.find((x) => x.id === prev);
      if (c && selectedBundleDef && !coachCanAssistBundle(c.teachLevels, c.traineeLevels, selectedBundleDef))
        return "";
      return prev;
    });
  }, [coaches, coachPrimaryId, selectedBundleDef]);

  const studentIds = useMemo(
    () => Object.entries(pickStudents).filter(([, v]) => v).map(([k]) => k),
    [pickStudents]
  );

  const coachCount = coachSecondaryId ? 2 : 1;
  const maxCap = selectedBundleDef ? maxStudentsForDef(selectedBundleDef, coachCount) : 0;

  /* ── filtered sessions (search) ─────────────────────────────── */
  const filteredSessions = useMemo(() => {
    if (!searchQ.trim()) return sessions;
    const q = searchQ.toLowerCase();
    return sessions.filter((s) => {
      if (s.coachPrimary.name.toLowerCase().includes(q)) return true;
      if (s.coachSecondary?.name.toLowerCase().includes(q)) return true;
      if (s.enrollments.some((e) => e.student.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [sessions, searchQ]);

  /* ── timetable grouped data ─────────────────────────────────── */
  const timetableData = useMemo(() => {
    const byDate = new Map<string, SessionRow[]>();
    for (const s of filteredSessions) {
      const d = s.date.slice(0, 10);
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(s);
    }
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredSessions]);

  /* ── actions ────────────────────────────────────────────────── */
  async function loadSuggestions() {
    if (!bundleId) return;
    const r = await fetch(
      `/api/suggest?bundleId=${encodeURIComponent(bundleId)}&date=${encodeURIComponent(date)}`
    );
    const data = await r.json();
    if (!r.ok) {
      showToast(data.error ?? t("schedule.suggestError"), "err");
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
    setBundleId(s.bundleId);
    setCoachPrimaryId(s.coachPrimaryId);
    setCoachSecondaryId(s.coachSecondaryId ?? "");
    const mp: Record<string, boolean> = {};
    for (const e of s.enrollments) mp[e.student.id] = true;
    setPickStudents(mp);
    requestAnimationFrame(() => scrollToSessionEditor());
  }

  async function save(confirmConflict?: boolean) {
    setToast(null);
    const payload: Record<string, unknown> = {
      date,
      hour,
      lane,
      bundleId,
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
      showToast(
        (data.messages && data.messages.join("; ")) || data.error || t("schedule.saveError"),
        "err",
      );
      return;
    }
    showToast(editingId ? t("schedule.savedUpdated") : t("schedule.savedCreated"), "ok");
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
      showToast(
        (data.messages && data.messages.join("; ")) || data.error || t("schedule.saveError"),
        "err",
      );
      return;
    }
    showToast(t("schedule.savedConflict"), "ok");
    resetForm();
    await load();
  }

  async function remove(id: string) {
    if (!confirm(t("schedule.deleteConfirm"))) return;
    await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  const eligibleStudents = students.filter((s) => {
    if (!selectedBundleDef) return false;
    return selectedBundleDef.levelIds.includes(s.levelId);
  });

  const fieldClass =
    "mt-1 w-full min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)]";

  async function handleRestoreUndo() {
    const b = readScheduleUndo();
    if (!b?.sessions.length) return;
    setUndoBusy(true);
    setToast(null);
    try {
      const r = await fetch("/api/sessions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions: b.sessions }),
      });
      const data = (await r.json()) as { messages?: string[] };
      if (!r.ok) {
        const joined = Array.isArray(data.messages) ? data.messages.join(" ") : "";
        showToast(joined || t("schedule.undoRestoreFail"), "err");
        return;
      }
      removeScheduleUndo();
      setUndoBlob(null);
      showToast(t("schedule.undoRestoreOk"), "ok");
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
    setToast(null);
    try {
      const r = await clearAllSchedulesWithUndo();
      if (!r.ok) {
        showToast(t("menu.clearAllScheduleFail"), "err");
        return;
      }
      setUndoBlob(readScheduleUndo());
      showToast(t("menu.clearAllScheduleDone"), "ok");
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
    setToast(null);
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
        showToast(data.error ?? t("schedule.saveError"), "err");
        return;
      }
      showToast(t("schedule.tailSaved"), "ok");
    } finally {
      setTailSaving(false);
    }
  }

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* ── Toast notification ──────────────────────────────── */}
      {toast && (
        <div
          style={{ position: "fixed", top: "1rem", left: "1rem", right: "1rem", zIndex: 70 }}
          className={`pss-toast mx-auto max-w-lg lg:max-w-2xl rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "ok"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}

      {!canEdit && (
        <div className="pss-panel flex items-start gap-3 border-l-4 border-l-teal-500 px-4 py-3.5 text-sm text-[var(--text)]">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" />
          <p>{t("schedule.coachReadOnly")}</p>
        </div>
      )}

      {/* ── Range filters + actions ─────────────────────────── */}
      <div className="pss-panel flex flex-col gap-3 p-3 print:hidden sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block flex-1 text-sm">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
            <CalendarClock className="h-3.5 w-3.5 text-sky-500" />
            {t("schedule.from")}
          </span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={fieldClass} />
        </label>
        <label className="block flex-1 text-sm">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
            <CalendarClock className="h-3.5 w-3.5 text-cyan-500" />
            {t("schedule.to")}
          </span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={fieldClass} />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold active:bg-sky-50 dark:bg-[var(--surface)]"
        >
          <RefreshCw className="h-4 w-4 text-sky-500" />
          {t("schedule.reload")}
        </button>
        {canEdit && (
          <button
            type="button"
            disabled={undoBusy}
            onClick={() => void handleClearAllJadwal()}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 active:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
            {t("schedule.clearAllButton")}
          </button>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold active:bg-slate-50 dark:bg-[var(--surface)]"
        >
          <Printer className="h-4 w-4 text-[var(--muted)]" />
          {t("schedule.exportPrint")}
        </button>
      </div>

      {/* ── Undo banner ─────────────────────────────────────── */}
      {canEdit && undoBlob && undoBlob.sessions.length > 0 && (
        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm print:hidden dark:bg-amber-500/15">
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

      {loading && <p className="text-sm text-[var(--muted)]">{t("schedule.loading")}</p>}

      {/* ── Form (editor) ───────────────────────────────────── */}
      {canEdit && (
        <section
          id="pss-session-editor"
          tabIndex={-1}
          className="space-y-4 scroll-mt-20 rounded-3xl border border-sky-100 bg-[var(--surface)] p-5 shadow-xl print:hidden dark:border-[var(--border)]"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text)]">
            {editingId ? (
              <Pencil className="h-5 w-5 text-amber-500" />
            ) : (
              <CalendarPlus className="h-5 w-5 text-sky-500" />
            )}
            {editingId ? t("schedule.editSession") : t("schedule.addSession")}
          </h2>
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
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                className={fieldClass}
              >
                {bundleDefs.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
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
            <p className="text-xs text-[var(--muted)]">{t("schedule.coachSecondaryHint")}</p>
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
                      {s.swimLevel?.name ?? s.levelId.slice(0, 8)}
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
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200"
            >
              <Sparkles className="h-4 w-4" />
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

      {/* ── Search bar + view toggle ────────────────────────── */}
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder={t("schedule.searchPlaceholder")}
            className={`${fieldClass} mt-0 w-full pl-9`}
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`pss-btn flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
              viewMode === "list"
                ? "bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-md shadow-sky-600/20"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            <List className="h-4 w-4" />
            {t("schedule.listView")}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("timetable")}
            className={`pss-btn flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
              viewMode === "timetable"
                ? "bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-md shadow-sky-600/20"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            {t("schedule.timetableView")}
          </button>
        </div>
      </div>

      {/* ── List view ───────────────────────────────────────── */}
      {viewMode === "list" && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text)]">
            <ClipboardList className="h-5 w-5 text-sky-500" />
            {t("schedule.sessionList")}
          </h2>
          <ul className="pss-stagger space-y-3">
            {filteredSessions.map((s, idx) => {
              const cc = s.coachSecondaryId ? 2 : 1;
              const max = maxCapForBundleRow(s.bundle, cc);
              const occ = occupancyRatio(s.enrollments.length, max);
              return (
                <li
                  key={s.id}
                  style={{ "--pss-delay": `${Math.min(idx, 12) * 40}ms` } as CSSProperties}
                  className="pss-card-lift rounded-2xl border border-zinc-200/70 bg-[var(--surface)] p-4 shadow-sm dark:border-zinc-700/80"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
                        {formatDateId(s.date.slice(0, 10))} · {s.hour}:00
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        {t("schedule.thLane")} {s.lane} · {s.bundle.name}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${occBadgeClass(occ)}`}
                    >
                      {s.enrollments.length}/{max} ({(occ * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="text-[var(--muted)]">{t("schedule.thCoaches")}: </span>
                    {s.coachPrimary.name}
                    {s.coachSecondary
                      ? ` + ${s.coachSecondary.name}${
                          secondaryIsTraineeOnly(s.coachSecondary, s.bundle)
                            ? ` (${t("schedule.traineeTag")})`
                            : ""
                        }`
                      : ""}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="text-[var(--muted)]">{t("schedule.thStudents")}: </span>
                    {s.enrollments.map((e) => e.student.name).join(", ") || "—"}
                  </p>
                  {canEdit && (
                    <div className="mt-3 flex gap-4 border-t border-[var(--border)] pt-3 print:hidden">
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
          {filteredSessions.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-[var(--muted)]">{t("schedule.noSessions")}</p>
          )}
        </section>
      )}

      {/* ── Timetable view ──────────────────────────────────── */}
      {viewMode === "timetable" && (
        <section className="space-y-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text)]">
            <LayoutGrid className="h-5 w-5 text-teal-500" />
            {t("schedule.sessionList")}
          </h2>
          {timetableData.map(([dateStr, dateSessions]) => {
            const hours = [...new Set(dateSessions.map((s) => s.hour))].sort((a, b) => a - b);
            const lanes = [1, 2, 3, 4];
            return (
              <div key={dateStr}>
                <h3 className="mb-2 text-sm font-bold text-[var(--accent)]">
                  {formatDateId(dateStr)}
                </h3>
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--surface)]">
                        <th className="border-b border-[var(--border)] px-3 py-2 text-left font-semibold">
                          {t("schedule.startHour")}
                        </th>
                        {lanes.map((l) => (
                          <th
                            key={l}
                            className="border-b border-[var(--border)] px-3 py-2 text-left font-semibold"
                          >
                            {t("schedule.thLane")} {l}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hours.map((h) => (
                        <tr key={h} className="border-b border-[var(--border)] last:border-b-0">
                          <td className="px-3 py-2 font-medium">{h}:00</td>
                          {lanes.map((l) => {
                            const cell = dateSessions.find((s) => s.hour === h && s.lane === l);
                            if (!cell) {
                              return (
                                <td key={l} className="px-3 py-2 text-[var(--muted)]">
                                  —
                                </td>
                              );
                            }
                            const cc = cell.coachSecondaryId ? 2 : 1;
                            const mx = maxCapForBundleRow(cell.bundle, cc);
                            const oc = occupancyRatio(cell.enrollments.length, mx);
                            return (
                              <td key={l} className="px-3 py-2">
                                <p className="font-medium">{cell.bundle.name}</p>
                                <p className="text-xs text-[var(--muted)]">
                                  {cell.coachPrimary.name}
                                  {cell.coachSecondary
                                    ? ` + ${cell.coachSecondary.name}${
                                        secondaryIsTraineeOnly(cell.coachSecondary, cell.bundle)
                                          ? ` (${t("schedule.traineeTag")})`
                                          : ""
                                      }`
                                    : ""}
                                </p>
                                <span
                                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${occBadgeClass(oc)}`}
                                >
                                  {cell.enrollments.length}/{mx}
                                </span>
                                {canEdit && (
                                  <button
                                    type="button"
                                    className="mt-2 block text-left text-xs font-semibold text-[var(--accent)] active:underline"
                                    onClick={() => fillForm(cell)}
                                  >
                                    {t("schedule.edit")}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {timetableData.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-[var(--muted)]">{t("schedule.noSessions")}</p>
          )}
        </section>
      )}

      {/* ── Conflict modal ──────────────────────────────────── */}
      {conflictModal && (
        <div className="pss-modal-root fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="pss-modal-panel max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl">
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
