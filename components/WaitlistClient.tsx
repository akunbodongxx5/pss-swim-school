"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/i18n-context";

type Student = { id: string; name: string; level: number };
type Entry = { id: string; note: string | null; student: Student; createdAt: string };

export function WaitlistClient({ canEdit }: { canEdit: boolean }) {
  const { t } = useApp();
  const [students, setStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [studentId, setStudentId] = useState("");
  const [note, setNote] = useState("");

  const fieldClass =
    "mt-1 w-full min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)]";

  const load = useCallback(async () => {
    const [st, w] = await Promise.all([
      fetch("/api/students").then((r) => r.json()),
      fetch("/api/waitlist").then((r) => r.json()),
    ]);
    setStudents(st);
    setEntries(w);
    setStudentId((prev) => (prev && st.some((s: Student) => s.id === prev) ? prev : st[0]?.id ?? ""));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, note }),
    });
    setNote("");
    await load();
  }

  async function done(id: string) {
    await fetch(`/api/waitlist?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "fulfilled" }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-[var(--muted)]">{t("waitlist.hint")}</p>
      {canEdit && (
        <form
          onSubmit={add}
          className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
        >
          <label className="block text-sm">
            {t("waitlist.student")}
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={fieldClass}>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (L{s.level})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {t("waitlist.note")}
            <input value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
          >
            {t("waitlist.add")}
          </button>
        </form>
      )}
      <ul className="space-y-3">
        {entries.map((x) => (
          <li
            key={x.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-[var(--text)]">{x.student.name}</span>
              {x.note && <span className="mt-1 block text-sm text-[var(--muted)]">{x.note}</span>}
            </div>
            {canEdit && (
              <button
                type="button"
                className="min-h-10 shrink-0 text-sm font-semibold text-[var(--accent)]"
                onClick={() => void done(x.id)}
              >
                {t("waitlist.markDone")}
              </button>
            )}
          </li>
        ))}
        {entries.length === 0 && <li className="py-8 text-center text-sm text-[var(--muted)]">{t("waitlist.empty")}</li>}
      </ul>
    </div>
  );
}
