"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/i18n-context";

type Student = { id: string; name: string; level: number };
type Pair = {
  id: string;
  studentAId: string;
  studentBId: string;
  studentA: Student;
  studentB: Student;
};

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
    void load();
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
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
          {t("students.coachReadOnly")}
        </p>
      )}

      {msg && <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{msg}</p>}
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <h2 className="text-base font-semibold">{t("students.listTitle")}</h2>
        <ul className="mt-3 divide-y divide-[var(--border)]">
          {students.map((s) => (
            <li key={s.id} className="py-3 text-sm first:pt-0">
              {editingId === s.id ? (
                <div className="space-y-3 rounded-xl bg-[var(--bg)]/50 p-3">
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
                      className="min-h-10 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
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
                <div className="flex min-h-12 flex-wrap items-center justify-between gap-2">
                  <span>
                    {s.name}{" "}
                    <span className="text-[var(--muted)]">
                      {t("students.level")} {s.level}
                    </span>
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
      </section>

      {canEdit && (
        <>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <h2 className="text-base font-semibold">{t("students.addTitle")}</h2>
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
                className="min-h-11 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
              >
                {t("students.save")}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <h2 className="text-base font-semibold">{t("students.conflictsTitle")}</h2>
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
                className="min-h-11 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
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
