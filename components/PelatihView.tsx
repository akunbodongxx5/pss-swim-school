"use client";

import { useEffect, useState } from "react";
import { formatTeachLevels, normalizeTeachLevels } from "@/lib/domain";
import { useApp } from "@/lib/i18n-context";

type Coach = { id: string; name: string; teachLevels: unknown };

const LEVELS_1_9 = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const inputClass =
  "mt-1 w-full min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)]";

export function PelatihView({ initialCoaches, canEdit }: { initialCoaches: Coach[]; canEdit: boolean }) {
  const { t } = useApp();
  const [rows, setRows] = useState<Coach[]>(initialCoaches);
  const [nameDraft, setNameDraft] = useState<Record<string, string>>({});
  const [levelDraft, setLevelDraft] = useState<Record<string, Set<number>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newLevels, setNewLevels] = useState<Set<number>>(() => new Set(LEVELS_1_9));
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

  function getLevelSet(c: Coach): Set<number> {
    const d = levelDraft[c.id];
    if (d) return new Set(d);
    return new Set(normalizeTeachLevels(c.teachLevels));
  }

  function toggleLevelDraft(coachId: string, level: number, base: Coach) {
    setLevelDraft((prev) => {
      const cur = prev[coachId] ?? new Set(normalizeTeachLevels(base.teachLevels));
      const copy = new Set(cur);
      if (copy.has(level)) copy.delete(level);
      else copy.add(level);
      return { ...prev, [coachId]: copy };
    });
  }

  function toggleNewLevel(level: number) {
    setNewLevels((prev) => {
      const copy = new Set(prev);
      if (copy.has(level)) copy.delete(level);
      else copy.add(level);
      return copy;
    });
  }

  async function saveCoach(c: Coach) {
    setErr(null);
    setMsg(null);
    const name = getName(c).trim();
    if (!name) {
      setErr(t("coaches.saveFailed"));
      return;
    }
    const levels = normalizeTeachLevels([...getLevelSet(c)]);
    if (levels.length === 0) {
      setErr(t("coaches.atLeastOneLevel"));
      return;
    }
    setSavingId(c.id);
    const r = await fetch(`/api/coaches?id=${encodeURIComponent(c.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, teachLevels: levels }),
    });
    const data = await r.json();
    setSavingId(null);
    if (!r.ok) {
      setErr(data.error ?? t("coaches.saveFailed"));
      return;
    }
    setMsg(t("coaches.saved"));
    setRows((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...data } : x)));
    setNameDraft((d) => {
      const n = { ...d };
      delete n[c.id];
      return n;
    });
    setLevelDraft((d) => {
      const n = { ...d };
      delete n[c.id];
      return n;
    });
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
    setNameDraft((d) => {
      const n = { ...d };
      delete n[c.id];
      return n;
    });
    setLevelDraft((d) => {
      const n = { ...d };
      delete n[c.id];
      return n;
    });
  }

  async function addCoach() {
    setErr(null);
    setMsg(null);
    const name = newName.trim();
    if (!name) {
      setErr(t("coaches.saveFailed"));
      return;
    }
    const levels = normalizeTeachLevels([...newLevels]);
    setAdding(true);
    const r = await fetch("/api/coaches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        teachLevels: levels.length ? levels : [1, 2, 3, 4, 5, 6, 7, 8, 9],
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
    setNewLevels(new Set(LEVELS_1_9));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-[var(--muted)]">{t("coaches.hint")}</p>
      {!canEdit && (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
          {t("coaches.coachReadOnly")}
        </p>
      )}
      {msg && <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{msg}</p>}
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}

      {canEdit && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <h2 className="text-base font-semibold">{t("coaches.addTitle")}</h2>
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
            <p className="text-xs text-[var(--muted)]">{t("coaches.pickLevels")}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {LEVELS_1_9.map((lv) => (
                <label
                  key={lv}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold ${
                    newLevels.has(lv)
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={newLevels.has(lv)}
                    onChange={() => toggleNewLevel(lv)}
                  />
                  {lv}
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={adding}
              onClick={() => void addCoach()}
              className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("coaches.addButton")}
            </button>
          </div>
        </section>
      )}

      <ul className="space-y-3">
        {rows.map((c) => {
          const nm = getName(c);
          const set = getLevelSet(c);
          return (
            <li
              key={c.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
            >
              {!canEdit && (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-[var(--accent)]">{c.name}</p>
                  </div>
                  <div className="text-right text-sm text-[var(--muted)]">
                    <span className="block text-xs uppercase tracking-wide">{t("coaches.thLevel")}</span>
                    <span className="font-semibold text-[var(--text)]">{formatTeachLevels(c.teachLevels)}</span>
                  </div>
                </div>
              )}

              {canEdit && (
                <div className="space-y-3">
                  <label className="block text-sm">
                    {t("coaches.thName")}
                    <input
                      value={nm}
                      onChange={(e) => setNameFor(c.id, e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <p className="text-xs text-[var(--muted)]">{t("coaches.pickLevels")}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {LEVELS_1_9.map((lv) => (
                      <label
                        key={lv}
                        className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${
                          set.has(lv)
                            ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                            : "border-[var(--border)] bg-[var(--bg)] text-[var(--muted)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={set.has(lv)}
                          onChange={() => toggleLevelDraft(c.id, lv, c)}
                        />
                        {lv}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {t("coaches.thLevel")}: {formatTeachLevels([...set].sort((a, b) => a - b))}
                  </p>
                  <button
                    type="button"
                    disabled={savingId === c.id}
                    onClick={() => void saveCoach(c)}
                    className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
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
