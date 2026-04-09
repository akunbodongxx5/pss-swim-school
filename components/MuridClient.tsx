"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Eye, GitMerge, Search, UserPlus, Users, UserX } from "lucide-react";
import { useApp } from "@/lib/i18n-context";

type Student = { id: string; name: string; level: number };
type Pair = {
  id: string;
  studentAId: string;
  studentBId: string;
  studentA: Student;
  studentB: Student;
};

function LevelBadge({ level }: { level: number }) {
  const color =
    level <= 3
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
      : level <= 6
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
        : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${color}`}
    >
      L{level}
    </span>
  );
}

function SkeletonRows() {
  return (
    <div className="mt-3 space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl bg-[var(--bg)]/60 p-4">
          <div className="flex items-center gap-3">
            <div className="h-4 w-32 rounded bg-[var(--border)]" />
            <div className="h-5 w-10 rounded-md bg-[var(--border)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-[var(--muted)]">
      <UserX className="h-12 w-12 text-sky-400/70 dark:text-sky-500/50" strokeWidth={1.5} />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function MuridClient({ canEdit }: { canEdit: boolean }) {
  const { t } = useApp();
  const [students, setStudents] = useState<Student[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [name, setName] = useState("");
  const [level, setLevel] = useState(1);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLevel, setEditLevel] = useState(1);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");

  const filteredStudents = useMemo(
    () =>
      searchQ
        ? students.filter((s) => s.name.toLowerCase().includes(searchQ.toLowerCase()))
        : students,
    [students, searchQ],
  );

  const fieldClass =
    "mt-1 w-full min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)]";
  const inputClass =
    "min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)]";

  const load = useCallback(async () => {
    const [st, pr] = await Promise.all([
      fetch("/api/students").then((r) => r.json()),
      fetch("/api/conflicts").then((r) => r.json()),
    ]);
    setStudents(st);
    setPairs(pr);
    setA((prev) => (prev && st.some((s: Student) => s.id === prev) ? prev : st[0]?.id ?? ""));
    setB((prev) => (prev && st.some((s: Student) => s.id === prev) ? prev : st[1]?.id ?? st[0]?.id ?? ""));
  }, []);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  function startEdit(s: Student) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditLevel(s.level);
    setErr(null);
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setErr(null);
    setMsg(null);
    setSavingStudentId(editingId);
    const r = await fetch(`/api/students?id=${encodeURIComponent(editingId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), level: editLevel }),
    });
    const data = await r.json();
    setSavingStudentId(null);
    if (!r.ok) {
      setErr(data.error ?? t("students.fail"));
      return;
    }
    setMsg(t("students.updated"));
    setEditingId(null);
    await load();
  }

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const r = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, level }),
    });
    const data = await r.json();
    if (!r.ok) {
      setErr(data.error ?? t("students.fail"));
      return;
    }
    setMsg(t("students.added"));
    setName("");
    setLevel(1);
    await load();
  }

  async function addPair(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const r = await fetch("/api/conflicts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentAId: a, studentBId: b }),
    });
    const data = await r.json();
    if (!r.ok) {
      setErr(data.error ?? t("students.fail"));
      return;
    }
    setMsg(t("students.pairSaved"));
    await load();
  }

  async function delPair(id: string) {
    await fetch(`/api/conflicts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  async function delStudent(id: string) {
    if (!confirm(t("students.deleteStudentConfirm"))) return;
    if (editingId === id) setEditingId(null);
    await fetch(`/api/students?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      {!canEdit && (
        <div className="pss-panel flex items-start gap-3 border-l-4 border-l-violet-500 px-4 py-3.5 text-sm text-[var(--text)]">
          <Eye className="mt-0.5 h-5 w-5 shrink-0 text-violet-500 dark:text-violet-400" strokeWidth={2} />
          <p>{t("students.coachReadOnly")}</p>
        </div>
      )}

      {msg && <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{msg}</p>}
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}

      <section className="pss-panel p-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text)]">
          <Users className="h-5 w-5 text-sky-500" />
          {t("students.listTitle")}
        </h2>

        {!loading && students.length > 0 && (
          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              strokeWidth={2}
            />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder={t("students.searchPlaceholder")}
              className={`${inputClass} pl-9`}
            />
          </div>
        )}

        {loading ? (
          <SkeletonRows />
        ) : students.length === 0 ? (
          <EmptyState message={t("students.emptyList")} />
        ) : (
          <ul className="pss-stagger mt-3 space-y-2">
            {filteredStudents.map((s, idx) => (
              <li
                key={s.id}
                style={{ "--pss-delay": `${Math.min(idx, 14) * 35}ms` } as CSSProperties}
                className="pss-card-lift rounded-2xl border border-zinc-200/70 bg-zinc-50/60 px-4 py-3 text-sm transition-colors duration-200 hover:bg-zinc-100/80 dark:border-zinc-700/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/50"
              >
                {editingId === s.id ? (
                  <div className="space-y-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={inputClass}
                      placeholder={t("students.namePlaceholder")}
                    />
                    <label className="flex items-center gap-3 text-sm">
                      <span className="text-[var(--muted)]">{t("students.level")}</span>
                      <input
                        type="number"
                        min={1}
                        max={9}
                        value={editLevel}
                        onChange={(e) => setEditLevel(Number(e.target.value))}
                        className="h-11 w-20 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={savingStudentId === s.id || !editName.trim()}
                        onClick={() => void saveEdit()}
                        className="min-h-10 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 px-4 text-sm font-bold text-white shadow-md shadow-sky-500/20 disabled:opacity-50"
                      >
                        {t("students.save")}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="min-h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-medium"
                      >
                        {t("students.cancelEdit")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-10 flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      <LevelBadge level={s.level} />
                    </span>
                    {canEdit && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="min-h-10 px-3 text-sm font-semibold text-[var(--accent)]"
                          onClick={() => startEdit(s)}
                        >
                          {t("students.edit")}
                        </button>
                        <button
                          type="button"
                          className="min-h-10 px-3 text-sm font-semibold text-[var(--danger)]"
                          onClick={() => void delStudent(s.id)}
                        >
                          {t("students.delete")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canEdit && (
        <>
          <section className="pss-panel border-l-4 border-l-emerald-500 p-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text)]">
              <UserPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {t("students.addTitle")}
            </h2>
            <form onSubmit={addStudent} className="mt-4 flex flex-col gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("students.namePlaceholder")}
                className={inputClass}
                required
              />
              <label className="flex items-center gap-3 text-sm">
                <span className="text-[var(--muted)]">{t("students.level")}</span>
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="h-11 w-20 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
                />
              </label>
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/25"
              >
                {t("students.save")}
              </button>
            </form>
          </section>

          <section className="pss-panel border-l-4 border-l-amber-500 p-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--text)]">
              <GitMerge className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              {t("students.conflictsTitle")}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{t("students.conflictsHint")}</p>
            <form onSubmit={addPair} className="mt-4 flex flex-col gap-3">
              <label className="block text-sm">
                {t("students.studentA")}
                <select value={a} onChange={(e) => setA(e.target.value)} className={fieldClass}>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                {t("students.studentB")}
                <select value={b} onChange={(e) => setB(e.target.value)} className={fieldClass}>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 text-sm font-bold text-white shadow-lg shadow-amber-500/25"
              >
                {t("students.addPair")}
              </button>
            </form>
            <ul className="mt-4 space-y-2 border-t border-[var(--border)] pt-3 text-sm">
              {pairs.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    {p.studentA.name} ↔ {p.studentB.name}
                  </span>
                  <button
                    type="button"
                    className="text-sm font-semibold text-[var(--danger)]"
                    onClick={() => void delPair(p.id)}
                  >
                    {t("students.delete")}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
