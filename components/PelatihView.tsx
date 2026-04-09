"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Eye, Sparkles, UserPlus } from "lucide-react";
import {
  disjointTraineeFromLead,
  formatTeachLevels,
  formatTraineeLevels,
  normalizeTeachLevels,
} from "@/lib/domain";
import { useApp } from "@/lib/i18n-context";

export type Coach = { id: string; name: string; teachLevels: unknown; traineeLevels?: unknown };

const LEVELS_1_9 = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const inputClass =
  "mt-1 w-full min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)]";

type LevelDraft = { lead: Set<number>; train: Set<number> };

function getDraftFrom(
  prev: Record<string, LevelDraft>,
  id: string,
  base: Coach
): { lead: Set<number>; train: Set<number> } {
  const d = prev[id];
  if (d) return { lead: new Set(d.lead), train: new Set(d.train) };
  const lead = normalizeTeachLevels(base.teachLevels);
  const train = disjointTraineeFromLead(lead, normalizeTeachLevels(base.traineeLevels ?? []));
  return { lead: new Set(lead), train: new Set(train) };
}

export function PelatihView({ initialCoaches, canEdit }: { initialCoaches: Coach[]; canEdit: boolean }) {
  const { t } = useApp();
  const [rows, setRows] = useState<Coach[]>(initialCoaches);
  const [nameDraft, setNameDraft] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, LevelDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newLevels, setNewLevels] = useState<LevelDraft>(() => ({
    lead: new Set(LEVELS_1_9),
    train: new Set<number>(),
  }));
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setRows(initialCoaches);
  }, [initialCoaches]);

  function getName(c: Coach) {
    return nameDraft[c.id] ?? c.name;
  }

  function setNameFor(id: string, value: string) {
    setNameDraft((prev) => ({ ...prev, [id]: value }));
  }

  function toggleLead(c: Coach, level: number) {
    setDrafts((prev) => {
      const cur = getDraftFrom(prev, c.id, c);
      const lead = new Set(cur.lead);
      const train = new Set(cur.train);
      if (lead.has(level)) lead.delete(level);
      else {
        lead.add(level);
        train.delete(level);
      }
      return { ...prev, [c.id]: { lead, train } };
    });
  }

  function toggleTrainee(c: Coach, level: number) {
    setDrafts((prev) => {
      const cur = getDraftFrom(prev, c.id, c);
      const lead = new Set(cur.lead);
      const train = new Set(cur.train);
      if (train.has(level)) train.delete(level);
      else {
        train.add(level);
        lead.delete(level);
      }
      return { ...prev, [c.id]: { lead, train } };
    });
  }

  function toggleNewLead(level: number) {
    setNewLevels((prev) => {
      const lead = new Set(prev.lead);
      const train = new Set(prev.train);
      if (lead.has(level)) lead.delete(level);
      else {
        lead.add(level);
        train.delete(level);
      }
      return { lead, train };
    });
  }

  function toggleNewTrainee(level: number) {
    setNewLevels((prev) => {
      const lead = new Set(prev.lead);
      const train = new Set(prev.train);
      if (train.has(level)) train.delete(level);
      else {
        train.add(level);
        lead.delete(level);
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
    const teachLevels = normalizeTeachLevels([...d.lead]);
    if (teachLevels.length === 0) {
      setErr(t("coaches.atLeastOneLevel"));
      return;
    }
    const traineeLevels = disjointTraineeFromLead(teachLevels, normalizeTeachLevels([...d.train]));
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
    const teachLevels = normalizeTeachLevels([...newLevels.lead]);
    const traineeLevels = disjointTraineeFromLead(teachLevels, normalizeTeachLevels([...newLevels.train]));
    setAdding(true);
    const r = await fetch("/api/coaches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        teachLevels: teachLevels.length ? teachLevels : [1, 2, 3, 4, 5, 6, 7, 8, 9],
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
    setNewLevels({ lead: new Set(LEVELS_1_9), train: new Set() });
  }

  const isExpanded = (id: string) => expandedId === id;

  return (
    <div className="space-y-4">
      <div className="pss-panel flex items-start gap-3 border-l-4 border-l-teal-500 px-4 py-3.5 text-sm leading-relaxed text-[var(--text)]">
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
        <section className="pss-panel p-4">
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
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {LEVELS_1_9.map((lv) => (
                <label
                  key={lv}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold ${
                    newLevels.lead.has(lv)
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={newLevels.lead.has(lv)}
                    onChange={() => toggleNewLead(lv)}
                  />
                  {lv}
                </label>
              ))}
            </div>
            <p className="text-xs font-medium text-[var(--text)]">{t("coaches.traineeLevelsLabel")}</p>
            <p className="text-xs text-[var(--muted)]">{t("coaches.pickTraineeLevels")}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {LEVELS_1_9.map((lv) => (
                <label
                  key={lv}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold ${
                    newLevels.train.has(lv)
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={newLevels.train.has(lv)}
                    onChange={() => toggleNewTrainee(lv)}
                  />
                  {lv}
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
          const leadArr = normalizeTeachLevels(c.teachLevels);
          const trainArr = disjointTraineeFromLead(leadArr, normalizeTeachLevels(c.traineeLevels ?? []));
          const expanded = isExpanded(c.id);

          return (
            <li
              key={c.id}
              className="pss-card-lift rounded-2xl border border-zinc-200/70 bg-[var(--surface)] shadow-sm dark:border-zinc-700/80"
            >
              <button
                type="button"
                onClick={() => canEdit && toggleExpand(c.id)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${
                  canEdit ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-[var(--accent)]">
                    {canEdit ? nm : c.name}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-2">
                  <span className="flex flex-wrap gap-1">
                    {leadArr.map((lv) => (
                      <span
                        key={`l${lv}`}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)]/15 text-xs font-semibold text-[var(--accent)]"
                      >
                        {lv}
                      </span>
                    ))}
                    {trainArr.map((lv) => (
                      <span
                        key={`t${lv}`}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-700 dark:text-amber-400"
                      >
                        {lv}
                      </span>
                    ))}
                  </span>

                  {canEdit && (
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
                      strokeWidth={2.2}
                    />
                  )}
                </span>
              </button>

              {!canEdit && (
                <div className="space-y-2 border-t border-[var(--border)] px-4 py-3">
                  <p className="text-sm">
                    <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                      {t("coaches.leadLevelsLabel")}{" "}
                    </span>
                    <span className="font-semibold text-[var(--text)]">{formatTeachLevels(c.teachLevels)}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                      {t("coaches.traineeLevelsLabel")}{" "}
                    </span>
                    <span className="font-semibold text-[var(--text)]">
                      {formatTraineeLevels(c.traineeLevels ?? [])}
                    </span>
                  </p>
                </div>
              )}

              {canEdit && expanded && (
                <div className="pss-expand-in border-t border-[var(--border)] space-y-3 px-4 pb-4 pt-3">
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
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {LEVELS_1_9.map((lv) => (
                      <label
                        key={lv}
                        className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${
                          d.lead.has(lv)
                            ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                            : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={d.lead.has(lv)}
                          onChange={() => toggleLead(c, lv)}
                        />
                        {lv}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-[var(--text)]">{t("coaches.traineeLevelsLabel")}</p>
                  <p className="text-xs text-[var(--muted)]">{t("coaches.pickTraineeLevels")}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {LEVELS_1_9.map((lv) => (
                      <label
                        key={lv}
                        className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${
                          d.train.has(lv)
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={d.train.has(lv)}
                          onChange={() => toggleTrainee(c, lv)}
                        />
                        {lv}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {t("coaches.leadLevelsLabel")}: {formatTeachLevels([...d.lead].sort((a, b) => a - b))} ·{" "}
                    {t("coaches.traineeLevelsLabel")}: {formatTraineeLevels([...d.train].sort((a, b) => a - b))}
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
