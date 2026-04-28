"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, RefreshCw, Send } from "lucide-react";
import { useApp } from "@/lib/i18n-context";

type StudentOpt = { id: string; name: string };
type ReportRow = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  student: { id: string; name: string };
  authoredByAdmin: boolean;
  authorCoach: { id: string; name: string } | null;
};

export function LaporanClient({
  role,
  adminCanWrite,
  initialCoachId,
}: {
  role: "admin" | "coach";
  adminCanWrite: boolean;
  initialCoachId: string | null;
}) {
  const { t, m } = useApp();
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsCoachPick, setNeedsCoachPick] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const canCompose =
    role === "coach"
      ? !!initialCoachId
      : adminCanWrite;

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch("/api/student-reports", { credentials: "same-origin" });
      const data = (await r.json()) as {
        reports?: ReportRow[];
        needsCoachPick?: boolean;
      };
      if (!r.ok) {
        setMsg({ kind: "err", text: m.reports.loadError });
        return;
      }
      setReports(Array.isArray(data.reports) ? data.reports : []);
      setNeedsCoachPick(data.needsCoachPick === true);
    } catch {
      setMsg({ kind: "err", text: m.reports.loadError });
    } finally {
      setLoading(false);
    }
  }, [m.reports.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetch("/api/students", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: StudentOpt[]) => {
        if (Array.isArray(d)) setStudents(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const sid = new URL(window.location.href).searchParams.get("studentId");
      if (sid) setStudentId(sid);
    } catch {
      /* ignore */
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canCompose || !studentId.trim() || !content.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/student-reports", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, content }),
      });
      const raw = await r.json().catch(() => ({}));
      if (r.status === 403 && raw?.error === "admin_write_disabled") {
        setMsg({ kind: "err", text: m.reports.forbiddenAdminWrite });
        return;
      }
      if (!r.ok) {
        setMsg({ kind: "err", text: m.reports.loadError });
        return;
      }
      setContent("");
      setMsg({ kind: "ok", text: m.reports.saved });
      await load();
    } catch {
      setMsg({ kind: "err", text: m.reports.loadError });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="pss-animate-fade-in flex items-start gap-4 pss-panel p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--mint)] text-white shadow-lg shadow-[var(--accent)]/25">
          <FileText className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{t("titles.reports")}</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{m.reports.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="pss-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          aria-label={m.reports.refresh}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {role === "admin" ? (
        <p className="text-sm leading-relaxed text-[var(--muted)]">{m.reports.adminReadHint}</p>
      ) : null}

      {needsCoachPick ? (
        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          <p>{m.reports.needsCoachPick}</p>
          <Link
            href="/login"
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95"
          >
            {m.reports.openLogin}
          </Link>
        </div>
      ) : null}

      {canCompose && !needsCoachPick ? (
        <form onSubmit={submit} className="pss-panel space-y-4 p-5 shadow-sm">
          <h2 className="text-base font-bold text-[var(--text)]">
            {role === "coach" ? m.reports.formTitleCoach : m.reports.formTitleAdmin}
          </h2>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {m.reports.studentLabel}
            </span>
            <select
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full min-h-12 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-[var(--text)] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/15"
            >
              <option value="">—</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {m.reports.contentLabel}
            </span>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder={m.reports.contentPlaceholder}
              className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-[var(--text)] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/15"
              maxLength={12000}
            />
          </label>
          {msg ? (
            <p className={`text-sm ${msg.kind === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--danger)]"}`}>
              {msg.text}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="pss-btn flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--mint)] font-semibold text-white shadow-lg shadow-[var(--accent)]/25 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {saving ? m.reports.submitting : m.reports.submit}
          </button>
        </form>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">{m.reports.listTitle}</h2>
        {loading && reports.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> …
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{m.reports.empty}</p>
        ) : (
          <ul className="space-y-3">
            {reports.map((rep) => (
              <li
                key={rep.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)]/80 pb-2">
                  <span className="font-semibold text-[var(--text)]">{rep.student.name}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(rep.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">{rep.content}</p>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {rep.authoredByAdmin ? (
                    <>
                      {m.reports.authorAdmin}
                    </>
                  ) : rep.authorCoach ? (
                    <>
                      {m.reports.authorCoach}: <span className="font-medium text-[var(--text)]">{rep.authorCoach.name}</span>
                    </>
                  ) : (
                    m.reports.authorCoach
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
