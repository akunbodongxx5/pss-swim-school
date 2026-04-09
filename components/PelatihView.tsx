"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Eye, Pencil, Sparkles, Trash2, UserPlus } from "lucide-react";
import { disjointTraineeFromLeadIds, normalizeLevelIdList } from "@/lib/bundle-def";
import { useApp } from "@/lib/i18n-context";

export type Coach = { id: string; name: string; teachLevels: unknown; traineeLevels?: unknown };

type SwimLevelRow = { id: string; name: string; sortOrder: number };

const inputClass =
  "mt-1 w-full min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)]";

/** Mobile: 1 kolom penuh lebar; dari ~420px 2 kolom; layar lebar 3 kolom. */
const levelPickGridClass = "grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-2";

const MAX_SWIM_LEVELS = 20;

type LevelDraft = { lead: Set<string>; train: Set<string> };

function formatIdsWithNames(ids: string[], levels: SwimLevelRow[]): string {
  const map = new Map(levels.map((l) => [l.id, l.name]));
  return ids.map((id) => map.get(id) ?? id.slice(0, 8)).join(", ");
}

function getDraftFrom(
  prev: Record<string, LevelDraft>,
  id: string,
  base: Coach
): { lead: Set<string>; train: Set<string> } {
  const d = prev[id];
  if (d) return { lead: new Set(d.lead), train: new Set(d.train) };
  const lead = normalizeLevelIdList(base.teachLevels);
  const train = disjointTraineeFromLeadIds(lead, normalizeLevelIdList(base.traineeLevels ?? []));
  return { lead: new Set(lead), train: new Set(train) };
}

export function PelatihView({ initialCoaches, canEdit }: { initialCoaches: Coach[]; canEdit: boolean }) {
  const { t } = useApp();
  const [rows, setRows] = useState<Coach[]>(initialCoaches);
  const [levels, setLevels] = useState<SwimLevelRow[]>([]);
  const [nameDraft, setNameDraft] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, LevelDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newLevels, setNewLevels] = useState<LevelDraft>(() => ({
    lead: new Set<string>(),
    train: new Set<string>(),
  }));
  const [adding, setAdding] = useState(false);

  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [editingLevelName, setEditingLevelName] = useState("");
  const [savingLevelId, setSavingLevelId] = useState<string | null>(null);
  const [newLevelNameInput, setNewLevelNameInput] = useState("");
  const [addingLevel, setAddingLevel] = useState(false);
  const [deletingLevelId, setDeletingLevelId] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialCoaches);
  }, [initialCoaches]);

  function loadLevels() {
    void fetch("/api/swim-levels")
      .then((r) => r.json())
      .then((d: SwimLevelRow[]) => {
        if (!Array.isArray(d)) return;
        const sorted = [...d].sort((a, b) => a.sortOrder - b.sortOrder);
        setLevels(sorted);
        setNewLevels((prev) => ({
          lead: prev.lead.size ? prev.lead : new Set(sorted.map((l) => l.id)),
          train: prev.train,
        }));
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadLevels();
  }, []);

  async function saveSwimLevelName(id: string) {
    const name = editingLevelName.trim();
    if (!name) return;
    setSavingLevelId(id);
    setErr(null);
    const r = await fetch(`/api/swim-levels?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await r.json();
    setSavingLevelId(null);
    if (!r.ok) {
      setErr(data.error ?? t("coaches.saveFailed"));
      return;
    }
    setLevels((prev) => prev.map((x) => (x.id === id ? { ...x, name: data.name } : x)));
    setEditingLevelId(null);
    setMsg(t("coaches.swimLevelsRenamed"));
  }

  async function addSwimLevel() {
    const name = newLevelNameInput.trim();
    if (!name || levels.length >= MAX_SWIM_LEVELS) return;
    setAddingLevel(true);
    setErr(null);
    const r = await fetch("/api/swim-levels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await r.json();
    setAddingLevel(false);
    if (!r.ok) {
      setErr(data.error ?? t("coaches.saveFailed"));
      return;
    }
    setNewLevelNameInput("");
    loadLevels();
    setMsg(t("coaches.swimLevelAdded"));
  }

  async function deleteSwimLevel(lv: SwimLevelRow) {
    if (!confirm(t("coaches.swimLevelDeleteConfirm", { name: lv.name }))) return;
    setDeletingLevelId(lv.id);
    setErr(null);
    const r = await fetch(`/api/swim-levels?id=${encodeURIComponent(lv.id)}`, { method: "DELETE" });
    const data = await r.json().catch(() => ({}));
    setDeletingLevelId(null);
    if (!r.ok) {
      setErr(
        r.status === 409
          ? (data.error ?? t("coaches.swimLevelDeleteBlocked"))
          : (data.error ?? t("coaches.saveFailed"))
      );
      return;
    }
    setLevels((prev) => prev.filter((x) => x.id !== lv.id));
    setNewLevels((prev) => {
      const lead = new Set(prev.lead);
      const train = new Set(prev.train);
      lead.delete(lv.id);
      train.delete(lv.id);
      return { lead, train };
    });
    if (editingLevelId === lv.id) setEditingLevelId(null);
    setMsg(t("coaches.swimLevelDeleted"));
  }

  function getName(c: Coach) {
    return nameDraft[c.id] ?? c.name;
  }

  function setNameFor(id: string, value: string) {
    setNameDraft((prev) => ({ ...prev, [id]: value }));
  }

  function toggleLead(c: Coach, levelId: string) {
    setDrafts((prev) => {
      const cur = getDraftFrom(prev, c.id, c);
      const lead = new Set(cur.lead);
      const train = new Set(cur.train);
      if (lead.has(levelId)) lead.delete(levelId);
      else {
        lead.add(levelId);
        train.delete(levelId);
      }
      return { ...prev, [c.id]: { lead, train } };
    });
  }

  function toggleTrainee(c: Coach, levelId: string) {
    setDrafts((prev) => {
      const cur = getDraftFrom(prev, c.id, c);
      const lead = new Set(cur.lead);
      const train = new Set(cur.train);
      if (train.has(levelId)) train.delete(levelId);
      else {
        train.add(levelId);
        lead.delete(levelId);
      }
      return { ...prev, [c.id]: { lead, train } };
    });
  }

  function toggleNewLead(levelId: string) {
    setNewLevels((prev) => {
      const lead = new Set(prev.lead);
      const train = new Set(prev.train);
      if (lead.has(levelId)) lead.delete(levelId);
      else {
        lead.add(levelId);
        train.delete(levelId);
      }
      return { lead, train };
    });
  }

  function toggleNewTrainee(levelId: string) {
    setNewLevels((prev) => {
      const lead = new Set(prev.lead);
      const train = new Set(prev.train);
      if (train.has(levelId)) train.delete(levelId);
      else {
        train.add(levelId);
        lead.delete(levelId);
      }
      return { lead, train };
    });
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function saveCoach(c: Coach) {
    setErr(null);
    setMsg(null);
    const name = getName(c).trim();
    if (!name) {
      setErr(t("coaches.saveFailed"));
      return;
    }
    const d = getDraftFrom(drafts, c.id, c);
    const teachLevels = [...d.lead];
    if (teachLevels.length === 0) {
      setErr(t("coaches.atLeastOneLevel"));
      return;
    }
    const traineeLevels = disjointTraineeFromLeadIds(teachLevels, [...d.train]);
    setSavingId(c.id);
    const r = await fetch(`/api/coaches?id=${encodeURIComponent(c.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, teachLevels, traineeLevels }),
    });
    const data = await r.json();
    setSavingId(null);
    if (!r.ok) {
      setErr(data.error ?? t("coaches.saveFailed"));
      return;
    }
    setMsg(t("coaches.saved"));
    setRows((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...data } : x)));
    setNameDraft((d0) => {
      const n = { ...d0 };
      delete n[c.id];
      return n;
    });
    setDrafts((d0) => {
      const n = { ...d0 };
      delete n[c.id];
      return n;
    });
    setExpandedId(null);
  }

  async function deleteCoach(c: Coach) {
    if (!confirm(t("coaches.deleteConfirm"))) return;
    setErr(null);
    setMsg(null);
    const r = await fetch(`/api/coaches?id=${encodeURIComponent(c.id)}`, { method: "DELETE" });
    const data = await r.json();
    if (!r.ok) {
      setErr(data.error ?? t("coaches.saveFailed"));
      return;
    }
    setMsg(t("coaches.deleted"));
    setRows((prev) => prev.filter((x) => x.id !== c.id));
    setNameDraft((d0) => {
      const n = { ...d0 };
      delete n[c.id];
      return n;
    });
    setDrafts((d0) => {
      const n = { ...d0 };
      delete n[c.id];
      return n;
    });
    setExpandedId(null);
  }

  async function addCoach() {
    setErr(null);
    setMsg(null);
    const name = newName.trim();
    if (!name) {
      setErr(t("coaches.saveFailed"));
      return;
    }
    const teachLevels = [...newLevels.lead];
    const traineeLevels = disjointTraineeFromLeadIds(teachLevels, [...newLevels.train]);
    setAdding(true);
    const r = await fetch("/api/coaches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        teachLevels: teachLevels.length ? teachLevels : undefined,
        traineeLevels,
      }),
    });
    const data = await r.json();
    setAdding(false);
    if (!r.ok) {
      setErr(data.error ?? t("coaches.saveFailed"));
      return;
    }
    setMsg(t("coaches.saved"));
    setRows((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName("");
    setNewLevels({
      lead: new Set(levels.map((l) => l.id)),
      train: new Set(),
    });
  }

  const isExpanded = (id: string) => expandedId === id;

  const nameById = new Map(levels.map((l) => [l.id, l.name]));

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      <div className="pss-panel flex items-start gap-3 border-l-4 border-l-teal-500 px-3 py-3.5 text-sm leading-relaxed text-[var(--text)] sm:px-4">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" strokeWidth={2} />
        <p>{t("coaches.hint")}</p>
      </div>
      {!canEdit && (
        <div className="pss-panel flex items-start gap-3 border-l-4 border-l-violet-500 px-4 py-3.5 text-sm text-[var(--text)]">
          <Eye className="mt-0.5 h-5 w-5 shrink-0 text-violet-500 dark:text-violet-400" strokeWidth={2} />
          <p>{t("coaches.coachReadOnly")}</p>
        </div>
      )}
      {msg && <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{msg}</p>}
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}

      {canEdit && (
        <section className="pss-panel min-w-0 p-3 sm:p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-base font-bold text-[var(--text)]">{t("coaches.swimLevelsTitle")}</h2>
            <p className="text-xs text-[var(--muted)]">
              {levels.length}/{MAX_SWIM_LEVELS} · {t("coaches.swimLevelsMaxHint")}
            </p>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{t("coaches.swimLevelsHint")}</p>

          <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
            <label className="min-w-0 flex-1 text-sm">
              <span className="text-[var(--muted)]">{t("coaches.swimLevelAddName")}</span>
              <input
                value={newLevelNameInput}
                onChange={(e) => setNewLevelNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addSwimLevel();
                  }
                }}
                disabled={levels.length >= MAX_SWIM_LEVELS || addingLevel}
                placeholder={t("students.namePlaceholder")}
                className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] disabled:opacity-50"
              />
            </label>
            <button
              type="button"
              disabled={
                levels.length >= MAX_SWIM_LEVELS || addingLevel || !newLevelNameInput.trim()
              }
              onClick={() => void addSwimLevel()}
              className="min-h-11 shrink-0 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50 sm:self-end"
            >
              {t("coaches.swimLevelAddButton")}
            </button>
          </div>

          {levels.length === 0 && (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">{t("coaches.swimLevelsEmpty")}</p>
          )}

          {levels.length > 0 && (
            <ul className="mt-3 space-y-2">
              {levels.map((lv) => (
                <li
                  key={lv.id}
                  className="flex min-w-0 flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)]/40 px-3 py-2.5"
                >
                  {editingLevelId === lv.id ? (
                    <div className="flex min-w-0 w-full flex-col gap-2 min-[400px]:flex-row min-[400px]:items-center">
                      <input
                        value={editingLevelName}
                        onChange={(e) => setEditingLevelName(e.target.value)}
                        className="min-h-10 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
                        aria-label={t("coaches.swimLevelsTitle")}
                      />
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={savingLevelId === lv.id || !editingLevelName.trim()}
                          onClick={() => void saveSwimLevelName(lv.id)}
                          className="min-h-10 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {t("coaches.swimLevelSave")}
                        </button>
                        <button
                          type="button"
                          disabled={savingLevelId === lv.id}
                          onClick={() => {
                            setEditingLevelId(null);
                            setErr(null);
                          }}
                          className="min-h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-medium"
                        >
                          {t("coaches.swimLevelCancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="min-w-0 flex-1 break-words text-sm font-semibold text-[var(--text)]">
                        <span className="text-xs font-normal text-[var(--muted)]">#{lv.sortOrder}</span>{" "}
                        {lv.name}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLevelId(lv.id);
                            setEditingLevelName(lv.name);
                            setErr(null);
                            setMsg(null);
                          }}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-sm font-medium text-[var(--accent)]"
                        >
                          <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                          {t("coaches.swimLevelEdit")}
                        </button>
                        <button
                          type="button"
                          disabled={deletingLevelId === lv.id}
                          onClick={() => void deleteSwimLevel(lv)}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                        >
                          <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                          {t("coaches.swimLevelDelete")}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {canEdit && levels.length === 0 && (
        <div className="pss-panel border border-amber-200/80 bg-amber-50/50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200 sm:px-4">
          {t("coaches.swimLevelsNeedLevelsForCoach")}
        </div>
      )}

      {canEdit && levels.length > 0 && (
        <section className="pss-panel min-w-0 p-3 sm:p-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text)]">
            <UserPlus className="h-5 w-5 text-teal-500" />
            {t("coaches.addTitle")}
          </h2>
          <div className="mt-3 space-y-3">
            <label className="block text-sm">
              {t("coaches.thName")}
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={inputClass}
                placeholder={t("students.namePlaceholder")}
              />
            </label>
            <p className="text-xs font-medium text-[var(--text)]">{t("coaches.leadLevelsLabel")}</p>
            <p className="text-xs text-[var(--muted)]">{t("coaches.pickLevels")}</p>
            <div className={levelPickGridClass}>
              {levels.map((lv) => (
                <label
                  key={lv.id}
                  className={`flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold break-words hyphens-auto ${
                    newLevels.lead.has(lv.id)
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={newLevels.lead.has(lv.id)}
                    onChange={() => toggleNewLead(lv.id)}
                  />
                  {lv.name}
                </label>
              ))}
            </div>
            <p className="text-xs font-medium text-[var(--text)]">{t("coaches.traineeLevelsLabel")}</p>
            <p className="text-xs text-[var(--muted)]">{t("coaches.pickTraineeLevels")}</p>
            <div className={levelPickGridClass}>
              {levels.map((lv) => (
                <label
                  key={`t-${lv.id}`}
                  className={`flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold break-words hyphens-auto ${
                    newLevels.train.has(lv.id)
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={newLevels.train.has(lv.id)}
                    onChange={() => toggleNewTrainee(lv.id)}
                  />
                  {lv.name}
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={adding}
              onClick={() => void addCoach()}
              className="min-h-11 w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-4 text-sm font-bold text-white shadow-lg shadow-teal-500/25 disabled:opacity-50"
            >
              {t("coaches.addButton")}
            </button>
          </div>
        </section>
      )}

      <ul className="space-y-3">
        {rows.map((c) => {
          const nm = getName(c);
          const d = getDraftFrom(drafts, c.id, c);
          const leadArr = normalizeLevelIdList(c.teachLevels);
          const trainArr = disjointTraineeFromLeadIds(leadArr, normalizeLevelIdList(c.traineeLevels ?? []));
          const expanded = isExpanded(c.id);

          return (
            <li
              key={c.id}
              className="pss-card-lift min-w-0 rounded-2xl border border-zinc-200/70 bg-[var(--surface)] shadow-sm dark:border-zinc-700/80"
            >
              <button
                type="button"
                onClick={() => canEdit && toggleExpand(c.id)}
                className={`flex w-full min-w-0 flex-col gap-2 px-3 py-3 text-left sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-4 ${
                  canEdit ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <div className="flex min-w-0 w-full items-center justify-between gap-2 sm:w-auto sm:flex-1 sm:justify-start">
                  <span className="min-w-0 flex-1 text-base font-bold leading-snug text-[var(--accent)] break-words">
                    {canEdit ? nm : c.name}
                  </span>
                  {canEdit && (
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[var(--muted)] transition-transform sm:ml-0 ${expanded ? "rotate-180" : ""}`}
                      strokeWidth={2.2}
                    />
                  )}
                </div>

                <div className="flex min-w-0 w-full flex-wrap gap-1.5 sm:max-w-[min(100%,28rem)] sm:justify-end">
                  {leadArr.map((lid) => (
                    <span
                      key={`l${lid}`}
                      className="inline-flex max-w-full items-center rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-semibold leading-tight text-[var(--accent)]"
                      title={nameById.get(lid) ?? lid}
                    >
                      <span className="break-words text-center">{nameById.get(lid) ?? lid.slice(0, 8)}</span>
                    </span>
                  ))}
                  {trainArr.map((lid) => (
                    <span
                      key={`t${lid}`}
                      className="inline-flex max-w-full items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold leading-tight text-amber-800 dark:text-amber-300"
                      title={nameById.get(lid) ?? lid}
                    >
                      <span className="break-words text-center">{nameById.get(lid) ?? lid.slice(0, 8)}</span>
                    </span>
                  ))}
                </div>
              </button>

              {!canEdit && (
                <div className="space-y-2 border-t border-[var(--border)] px-4 py-3">
                  <p className="text-sm">
                    <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                      {t("coaches.leadLevelsLabel")}{" "}
                    </span>
                    <span className="font-semibold text-[var(--text)]">
                      {formatIdsWithNames(leadArr, levels)}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                      {t("coaches.traineeLevelsLabel")}{" "}
                    </span>
                    <span className="font-semibold text-[var(--text)]">
                      {formatIdsWithNames(trainArr, levels)}
                    </span>
                  </p>
                </div>
              )}

              {canEdit && expanded && levels.length > 0 && (
                <div className="pss-expand-in border-t border-[var(--border)] space-y-3 px-3 pb-4 pt-3 sm:px-4">
                  <label className="block text-sm">
                    {t("coaches.thName")}
                    <input
                      value={nm}
                      onChange={(e) => setNameFor(c.id, e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <p className="text-xs font-medium text-[var(--text)]">{t("coaches.leadLevelsLabel")}</p>
                  <p className="text-xs text-[var(--muted)]">{t("coaches.pickLevels")}</p>
                  <div className={levelPickGridClass}>
                    {levels.map((lv) => (
                      <label
                        key={lv.id}
                        className={`flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold break-words transition-colors ${
                          d.lead.has(lv.id)
                            ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                            : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={d.lead.has(lv.id)}
                          onChange={() => toggleLead(c, lv.id)}
                        />
                        {lv.name}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-[var(--text)]">{t("coaches.traineeLevelsLabel")}</p>
                  <p className="text-xs text-[var(--muted)]">{t("coaches.pickTraineeLevels")}</p>
                  <div className={levelPickGridClass}>
                    {levels.map((lv) => (
                      <label
                        key={`et-${lv.id}`}
                        className={`flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold break-words transition-colors ${
                          d.train.has(lv.id)
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={d.train.has(lv.id)}
                          onChange={() => toggleTrainee(c, lv.id)}
                        />
                        {lv.name}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {t("coaches.leadLevelsLabel")}: {formatIdsWithNames([...d.lead], levels)} ·{" "}
                    {t("coaches.traineeLevelsLabel")}: {formatIdsWithNames([...d.train], levels)}
                  </p>
                  <button
                    type="button"
                    disabled={savingId === c.id}
                    onClick={() => void saveCoach(c)}
                    className="min-h-11 w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-4 text-sm font-bold text-white shadow-md shadow-teal-500/20 disabled:opacity-50"
                  >
                    {t("coaches.save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteCoach(c)}
                    className="min-h-11 w-full rounded-xl border border-[var(--danger)]/50 px-4 text-sm font-semibold text-[var(--danger)]"
                  >
                    {t("coaches.deleteCoach")}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
