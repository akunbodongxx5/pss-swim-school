"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarRange,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import { useBranding } from "@/lib/branding-context";
import { useApp } from "@/lib/i18n-context";

interface Stats {
  totalStudents: number;
  totalCoaches: number;
  todaySessions: number;
  weekSessions: number;
}

const statIconStyles = [
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
];

export function HomeClient() {
  const { t } = useApp();
  const { branding } = useBranding();
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
        {
          value: stats.todaySessions,
          label: t("home.todaySessions"),
          Icon: CalendarCheck2,
          iconClass: statIconStyles[0],
        },
        {
          value: stats.weekSessions,
          label: t("home.sessionsThisWeek"),
          Icon: CalendarRange,
          iconClass: statIconStyles[1],
        },
        {
          value: stats.totalStudents,
          label: t("home.totalStudents"),
          Icon: Users,
          iconClass: statIconStyles[2],
        },
        {
          value: stats.totalCoaches,
          label: t("home.totalCoaches"),
          Icon: UserCog,
          iconClass: statIconStyles[3],
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="pss-animate-fade-in pss-panel relative overflow-hidden p-5">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-sky-400/15 blur-3xl dark:bg-sky-500/10" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-600 text-white shadow-lg shadow-sky-500/25">
            <Sparkles className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--muted)]">{branding.schoolName}</p>
            <p className="mt-0.5 text-lg font-bold leading-snug tracking-tight text-[var(--text)]">
              {t("home.statsTitle")}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
            >
              <div className="mb-2 h-8 w-12 rounded-lg bg-[var(--border)]" />
              <div className="h-4 w-20 rounded bg-[var(--border)]" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="pss-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((c, i) => (
            <div
              key={c.label}
              style={{ "--pss-delay": `${i * 55}ms` } as CSSProperties}
              className="pss-stat-card pss-card-lift relative p-4"
            >
              <div
                className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${c.iconClass}`}
              >
                <c.Icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <p className="text-3xl font-extrabold tabular-nums tracking-tight text-[var(--text)]">{c.value}</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-[var(--muted)]">{c.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">{t("home.noData")}</p>
      )}

      <div className="flex flex-col gap-3 lg:max-w-2xl lg:flex-row lg:gap-4">
        <Link
          href="/jadwal"
          className="pss-btn group flex min-h-14 flex-1 items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 text-left text-sm font-bold text-white shadow-lg shadow-sky-600/25 active:scale-[0.99]"
        >
          <span className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            {t("home.openSchedule")}
          </span>
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/murid"
          className="pss-btn flex min-h-14 flex-1 items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-[var(--surface)] px-5 text-sm font-bold text-[var(--text)] shadow-sm ring-1 ring-black/[0.03] active:bg-zinc-50 dark:border-zinc-700 dark:active:bg-zinc-800/80"
        >
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("home.manageStudents")}
          </span>
          <ArrowRight className="h-5 w-5 text-[var(--muted)]" />
        </Link>
      </div>
      <p className="text-center text-xs font-medium text-[var(--muted)]">{branding.schoolName}</p>
    </div>
  );
}
