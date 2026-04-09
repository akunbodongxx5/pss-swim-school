"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCheck, ClipboardList, ListPlus, StickyNote, User } from "lucide-react";
import { useApp } from "@/lib/i18n-context";

type Student = { id: string; name: string; levelId: string; swimLevel?: { name: string } };
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
      <div className="pss-panel flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md shadow-violet-500/20">
          <ClipboardList className="h-5 w-5" />
        </div>
        <p className="text-sm leading-relaxed text-[var(--text)]">{t("waitlist.hint")}</p>
      </div>

      {canEdit && (
        <form
          onSubmit={add}
          className="pss-panel flex flex-col gap-4 p-5"
        >
          <label className="block text-sm font-medium">
            <span className="flex items-center gap-2 text-[var(--text)]">
              <User className="h-4 w-4 text-violet-500" />
              {t("waitlist.student")}
            </span>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={fieldClass}>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.swimLevel?.name ?? s.levelId.slice(0, 8)})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            <span className="flex items-center gap-2 text-[var(--text)]">
              <StickyNote className="h-4 w-4 text-amber-500" />
              {t("waitlist.note")}
            </span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
          </label>
          <button
            type="submit"
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-sm font-bold text-white shadow-lg shadow-violet-500/25"
          >
            <ListPlus className="h-5 w-5" />
            {t("waitlist.add")}
          </button>
        </form>
      )}
      <ul className="space-y-3">
        {entries.map((x) => (
          <li
            key={x.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-md"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-teal-100 dark:from-sky-900/40 dark:to-teal-900/30">
                <User className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <span className="font-bold text-[var(--text)]">{x.student.name}</span>
                {x.note && <span className="mt-1 block text-sm text-[var(--muted)]">{x.note}</span>}
              </div>
            </div>
            {canEdit && (
              <button
                type="button"
                className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 text-sm font-bold text-emerald-700 dark:text-emerald-400"
                onClick={() => void done(x.id)}
              >
                <CheckCheck className="h-4 w-4" />
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
