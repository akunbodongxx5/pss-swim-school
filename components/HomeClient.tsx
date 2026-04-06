"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/i18n-context";

interface Stats {
  totalStudents: number;
  totalCoaches: number;
  todaySessions: number;
  weekSessions: number;
}

export function HomeClient() {
  const { t, m } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = stats
    ? [
        { value: stats.todaySessions, label: t("home.todaySessions") },
        { value: stats.weekSessions, label: t("home.sessionsThisWeek") },
        { value: stats.totalStudents, label: t("home.totalStudents") },
        { value: stats.totalCoaches, label: t("home.totalCoaches") },
      ]
    : [];

  return (
    <div className="space-y-6">
      <p className="text-lg font-semibold tracking-tight">{t("home.statsTitle")}</p>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="mb-2 h-8 w-12 rounded-lg bg-[var(--border)]" />
              <div className="h-4 w-20 rounded bg-[var(--border)]" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <p className="text-2xl font-bold text-[var(--accent)]">{c.value}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{c.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">{t("home.noData")}</p>
      )}

      <div className="flex flex-col gap-3">
        <Link
          href="/jadwal"
          className="flex min-h-12 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 text-center text-sm font-semibold text-white shadow-sm active:opacity-90"
        >
          {t("home.openSchedule")}
        </Link>
        <Link
          href="/murid"
          className="flex min-h-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 text-center text-sm font-semibold text-[var(--accent)] active:bg-[var(--border)]/30"
        >
          {t("home.manageStudents")}
        </Link>
      </div>
      <p className="text-center text-xs text-[var(--muted)]">{m.appName}</p>
    </div>
  );
}
