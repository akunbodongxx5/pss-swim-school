"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText, Loader2, RefreshCw } from "lucide-react";
import { formatIsoDateLocalMedium, todayIsoLocal } from "@/lib/report-date";
import { useApp } from "@/lib/i18n-context";

type ReportRow = {
  id: string;
  content: string;
  reportDate: string;
  createdAt: string;
  updatedAt: string;
  student: { id: string; name: string };
  authoredByAdmin: boolean;
  authorCoach: { id: string; name: string } | null;
};

export function MuridLaporanClient({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const { t, m } = useApp();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsCoachPick, setNeedsCoachPick] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/student-reports?studentId=${encodeURIComponent(studentId)}`, {
        credentials: "same-origin",
      });
      if (r.status === 404) {
        setReports([]);
        return;
      }
      const data = (await r.json()) as {
        reports?: ReportRow[];
        needsCoachPick?: boolean;
      };
      setReports(Array.isArray(data.reports) ? data.reports : []);
      setNeedsCoachPick(data.needsCoachPick === true);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [studentId]);

  useEffect(() => {
    document.title = `${studentName} · ${t("titles.studentReportHistory")}`;
  }, [studentName, t]);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-start gap-3">
        <Link
          href="/murid"
          prefetch={false}
          className="pss-btn inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("titles.students")}
        </Link>
      </div>

      <div className="pss-animate-fade-in flex items-start gap-4 pss-panel p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--mint)] text-white shadow-lg shadow-[var(--accent)]/25">
          <FileText className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-tight text-[var(--text)]">{studentName}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{m.reports.historySubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="pss-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          aria-label={m.reports.refresh}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/laporan?studentId=${encodeURIComponent(studentId)}&reportDate=${encodeURIComponent(todayIsoLocal())}`}
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--mint)] px-4 text-sm font-semibold text-white shadow-md shadow-[var(--accent)]/25"
        >
          {m.reports.linkWriteForStudent}
        </Link>
      </div>

      {needsCoachPick ? (
        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          <p>{m.reports.needsCoachPick}</p>
          <Link
            href="/login"
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
          >
            {m.reports.openLogin}
          </Link>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">{m.reports.listTitle}</h2>
        {loading && reports.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> …
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{m.reports.emptyStudentHistory}</p>
        ) : (
          <ul className="space-y-3">
            {reports.map((rep) => (
              <li
                key={rep.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="space-y-1 border-b border-[var(--border)]/80 pb-2">
                  <span className="text-sm font-semibold text-[var(--text)]">
                    {formatIsoDateLocalMedium(rep.reportDate)}
                  </span>
                  <p className="text-xs text-[var(--muted)]">
                    {m.reports.recordedAtHint}:{" "}
                    {new Date(rep.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">{rep.content}</p>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {rep.authoredByAdmin ? (
                    m.reports.authorAdmin
                  ) : rep.authorCoach ? (
                    <>
                      {m.reports.authorCoach}:{" "}
                      <span className="font-medium text-[var(--text)]">{rep.authorCoach.name}</span>
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
