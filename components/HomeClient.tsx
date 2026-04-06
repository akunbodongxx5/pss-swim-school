"use client";

import Link from "next/link";
import { useApp } from "@/lib/i18n-context";

export function HomeClient() {
  const { t, m } = useApp();

  return (
    <div className="space-y-6">
      <p className="text-2xl font-semibold leading-tight tracking-tight">{t("home.headline")}</p>
      <p className="text-sm leading-relaxed text-[var(--muted)]">{t("home.body")}</p>
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
