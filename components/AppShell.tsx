"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Home,
  LogIn,
  Menu,
  Settings,
  Trash2,
  Users,
  Waves,
  X,
} from "lucide-react";
import { clearAllSchedulesWithUndo } from "@/lib/schedule-undo";
import { useBranding } from "@/lib/branding-context";
import { useApp, type ThemeMode } from "@/lib/i18n-context";

type Role = "admin" | "coach";

function titleForPath(pathname: string, t: (k: string) => string): string {
  if (pathname === "/" || pathname === "") return t("titles.home");
  if (pathname.startsWith("/jadwal")) return t("titles.schedule");
  if (pathname.startsWith("/murid")) return t("titles.students");
  if (pathname.startsWith("/pelatih")) return t("titles.coaches");
  if (pathname.startsWith("/waitlist")) return t("titles.waitlist");
  if (pathname.startsWith("/laporan")) return t("titles.reports");
  if (/^\/murid\/[^/]+\/laporan/.test(pathname)) return t("titles.studentReportHistory");
  if (pathname.startsWith("/login")) return t("titles.login");
  if (pathname.startsWith("/settings")) return t("titles.settings");
  return t("appName");
}

function desktopNavLink(active: boolean): string {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
    active
      ? "bg-[var(--accent-soft)] text-[var(--accent-dim)] dark:text-[var(--accent)]"
      : "text-[var(--text)] hover:bg-[var(--border)]/50"
  }`;
}

export function AppShell({ children, initialRole }: { children: React.ReactNode; initialRole: Role }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { t, locale, setLocale, theme, setTheme, m } = useApp();
  const { branding } = useBranding();
  const [menuOpen, setMenuOpen] = useState(false);
  const [clearingSchedule, setClearingSchedule] = useState(false);
  /** Sinkron dengan cookie httpOnly: layout bisa stale setelah login/ganti peran tanpa full reload. */
  const [role, setRole] = useState<Role>(initialRole);

  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: { role?: string }) => {
        if (cancelled) return;
        if (d.role === "admin" || d.role === "coach") setRole(d.role);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  /** H2: tutup drawer saat resize ke desktop (lg+) supaya state menuOpen tidak “nyangkut”. */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const page = titleForPath(pathname, t);
    document.title = `${page} | ${branding.schoolName}`;
  }, [pathname, branding.schoolName, t]);

  const title = titleForPath(pathname, t);
  const roleLabel = role === "coach" ? t("login.coach") : t("login.admin");

  const isCoach = role === "coach";
  const tabs = isCoach
    ? [
        { href: "/jadwal", label: m.nav.schedule, Icon: CalendarDays },
        { href: "/laporan", label: m.nav.reports, Icon: FileText },
      ]
    : [
        { href: "/jadwal", label: m.nav.schedule, Icon: CalendarDays },
        { href: "/murid", label: m.nav.students, Icon: Users },
        { href: "/pelatih", label: m.nav.coaches, Icon: Waves },
        { href: "/laporan", label: m.nav.reports, Icon: FileText },
      ];

  const pathActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex min-h-[100dvh] flex-col text-[var(--text)] lg:flex-row">
      {/* Desktop: sidebar kiri — navigasi penuh, tanpa bottom nav */}
      <aside className="hidden lg:flex lg:w-[17rem] lg:flex-shrink-0 lg:flex-col lg:border-r lg:border-[var(--border)] lg:bg-[var(--surface)] lg:shadow-[inset_-1px_0_0_0_var(--border)]">
        <div className="border-b border-[var(--border)] p-4">
          <Link
            href="/"
            prefetch={false}
            className="flex items-center gap-3 rounded-xl p-1.5 -m-1.5 transition-colors hover:bg-[var(--border)]/40"
          >
            {branding.logoDataUrl ? (
              <img
                src={branding.logoDataUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-2xl bg-zinc-100 object-contain p-0.5 shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:ring-zinc-700"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--mint)] text-white shadow-md shadow-[var(--accent)]/25">
                <Waves className="h-6 w-6" strokeWidth={2.2} />
              </div>
            )}
            <span className="min-w-0 truncate text-sm font-bold leading-tight text-[var(--text)]">{branding.schoolName}</span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{m.menu.desktopMainNav}</p>
          {tabs.map(({ href, label, Icon }) => {
            const active = pathActive(href);
            return (
              <Link key={href} href={href} prefetch={false} className={desktopNavLink(active)}>
                <Icon className={`h-5 w-5 shrink-0 ${active ? "text-[var(--accent-dim)] dark:text-[var(--accent)]" : "text-[var(--muted)]"}`} strokeWidth={active ? 2.25 : 1.85} />
                {label}
              </Link>
            );
          })}

          <div className="my-3 border-t border-[var(--border)] px-3 pt-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{m.menu.desktopMoreNav}</p>
          </div>
          <Link href="/" prefetch={false} className={desktopNavLink(pathname === "/" || pathname === "")}>
            <Home className="h-5 w-5 shrink-0 text-[var(--accent)]" />
            {m.menu.home}
          </Link>
          {!isCoach ? (
            <>
              <Link href="/waitlist" prefetch={false} className={desktopNavLink(pathActive("/waitlist"))}>
                <ClipboardList className="h-5 w-5 shrink-0 text-violet-500" />
                {m.menu.waitlist}
              </Link>
              <Link href="/settings" prefetch={false} className={desktopNavLink(pathActive("/settings"))}>
                <Settings className="h-5 w-5 shrink-0 text-slate-500" />
                {m.menu.schoolSettings}
              </Link>
            </>
          ) : null}
          <Link href="/login" prefetch={false} className={desktopNavLink(pathActive("/login"))}>
            <LogIn className="h-5 w-5 shrink-0 text-[var(--mint)]" />
            {m.menu.roleLogin}
          </Link>

          {role === "admin" && (
            <button
              type="button"
              disabled={clearingSchedule}
              onClick={() => {
                void (async () => {
                  if (!confirm(t("menu.clearAllScheduleConfirm"))) return;
                  setClearingSchedule(true);
                  try {
                    const r = await clearAllSchedulesWithUndo();
                    if (!r.ok) {
                      window.alert(t("menu.clearAllScheduleFail"));
                      return;
                    }
                    router.refresh();
                  } finally {
                    setClearingSchedule(false);
                  }
                })();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--danger)] transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              <Trash2 className="h-5 w-5 shrink-0" />
              {clearingSchedule ? "…" : m.menu.clearAllSchedule}
            </button>
          )}

          <p className="mt-2 px-3 text-xs text-[var(--muted)]">
            {m.login.role}: {roleLabel}
          </p>
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{m.menu.theme}</p>
          <div className="flex flex-wrap gap-2">
            {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTheme(mode)}
                className={`pss-btn rounded-full px-3 py-2 text-xs font-medium ${
                  theme === mode
                    ? "bg-[var(--accent)] text-white shadow-md"
                    : "bg-[var(--border)]/40 text-[var(--text)]"
                }`}
              >
                {mode === "light" ? m.menu.themeLight : mode === "dark" ? m.menu.themeDark : m.menu.themeSystem}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--border)] p-3 pb-4">
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{m.menu.language}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLocale("id")}
              className={`pss-btn rounded-full px-4 py-2 text-xs font-semibold ${
                locale === "id" ? "bg-[var(--accent)] text-white shadow-md" : "bg-[var(--border)]/40"
              }`}
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`pss-btn rounded-full px-4 py-2 text-xs font-semibold ${
                locale === "en" ? "bg-[var(--accent)] text-white shadow-md" : "bg-[var(--border)]/40"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile: header + menu */}
        <header
          className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/85 text-[var(--text)] shadow-[0_1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/90 dark:bg-zinc-950/80 dark:text-zinc-50 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)] lg:hidden"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="mx-auto flex h-[3.35rem] max-w-lg items-center justify-between gap-2 px-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {branding.logoDataUrl ? (
                <img
                  src={branding.logoDataUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-2xl bg-zinc-100 object-contain p-0.5 shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-800 dark:ring-zinc-700"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--mint)] text-white shadow-md shadow-[var(--accent)]/25">
                  <Waves className="h-6 w-6" strokeWidth={2.2} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[var(--muted)]">{branding.schoolName}</p>
                <h1 className="truncate text-base font-bold leading-tight tracking-tight text-[var(--text)]">{title}</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="pss-btn flex h-11 w-11 items-center justify-center rounded-xl text-[var(--muted)] hover:bg-zinc-100 active:bg-zinc-200/80 dark:hover:bg-zinc-800 dark:active:bg-zinc-700"
              aria-label={m.menu.title}
            >
              <Menu className="h-6 w-6" strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* Desktop: bar judul halaman */}
        <div className="hidden lg:flex lg:shrink-0 lg:items-center lg:justify-between lg:gap-4 lg:border-b lg:border-[var(--border)] lg:bg-[var(--surface)]/90 lg:px-8 lg:py-4 lg:backdrop-blur-sm">
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">{title}</h1>
          <span className="text-sm text-[var(--muted)]">
            {m.login.role}: <span className="font-medium text-[var(--text)]">{roleLabel}</span>
          </span>
        </div>

        <main
          className="mx-auto min-w-0 w-full max-w-lg flex-1 px-3 pt-4 sm:px-4 max-lg:pb-[max(7rem,calc(5.5rem+env(safe-area-inset-bottom)))] lg:max-w-6xl lg:min-h-0 lg:px-8 lg:pt-6 lg:!pb-12"
        >
          <div key={pathname}>{children}</div>
        </main>
      </div>

      <nav
        className="bottom-nav-shell fixed bottom-0 left-0 right-0 z-40 print:hidden lg:hidden"
        style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-lg px-4 pb-2">
          <div className="flex items-stretch justify-around gap-0.5 rounded-[1.35rem] border border-zinc-200/90 bg-white/95 py-1.5 shadow-[0_-8px_32px_-6px_rgba(15,23,42,0.12),0_0_0_1px_rgba(0,0,0,0.03)_inset] backdrop-blur-xl dark:border-zinc-700/90 dark:bg-zinc-900/95 dark:shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.55)]">
            {tabs.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  className={`pss-nav-tab flex min-h-[3.35rem] min-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.05rem] py-1.5 text-[10px] font-semibold transition-colors duration-200 ${
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--accent-dim)] dark:text-[var(--accent)]"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <Icon
                    className={`h-[1.35rem] w-[1.35rem] ${active ? "text-[var(--accent-dim)] dark:text-[var(--accent)]" : ""}`}
                    strokeWidth={active ? 2.25 : 1.85}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden" role="presentation">
          <button
            type="button"
            className="pss-menu-backdrop absolute inset-0 cursor-default bg-black/45"
            aria-hidden
            onClick={() => setMenuOpen(false)}
          />
          <aside
            className="pss-menu-panel relative z-10 h-full w-[min(100%,20rem)] border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <span className="font-bold text-[var(--text)]">{m.menu.title}</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="pss-btn flex h-10 w-10 items-center justify-center rounded-xl text-[var(--muted)] active:bg-[var(--border)]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1 p-3">
              <Link
                href="/"
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[var(--text)] transition-colors active:bg-[var(--accent-soft)]"
              >
                <Home className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                {m.menu.home}
              </Link>
              <Link
                href="/laporan"
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[var(--text)] transition-colors active:bg-[var(--accent-soft)]"
              >
                <FileText className="h-5 w-5 shrink-0 text-[var(--mint)]" />
                {m.nav.reports}
              </Link>
              {!isCoach ? (
                <>
                  <Link
                    href="/waitlist"
                    prefetch={false}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[var(--text)] transition-colors active:bg-[var(--accent-soft)]"
                  >
                    <ClipboardList className="h-5 w-5 shrink-0 text-violet-500" />
                    {m.menu.waitlist}
                  </Link>
                  <Link
                    href="/settings"
                    prefetch={false}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[var(--text)] transition-colors active:bg-[var(--accent-soft)]"
                  >
                    <Settings className="h-5 w-5 shrink-0 text-slate-500" />
                    {m.menu.schoolSettings}
                  </Link>
                </>
              ) : null}
              <Link
                href="/login"
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[var(--text)] transition-colors active:bg-[var(--accent-soft)]"
              >
                <LogIn className="h-5 w-5 shrink-0 text-[var(--mint)]" />
                {m.menu.roleLogin}
              </Link>
              {role === "admin" && (
                <button
                  type="button"
                  disabled={clearingSchedule}
                  onClick={() => {
                    void (async () => {
                      if (!confirm(t("menu.clearAllScheduleConfirm"))) return;
                      setClearingSchedule(true);
                      try {
                        const r = await clearAllSchedulesWithUndo();
                        if (!r.ok) {
                          window.alert(t("menu.clearAllScheduleFail"));
                          return;
                        }
                        setMenuOpen(false);
                        router.refresh();
                      } finally {
                        setClearingSchedule(false);
                      }
                    })();
                  }}
                  className="pss-btn flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-[var(--danger)] active:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 className="h-5 w-5 shrink-0" />
                  {clearingSchedule ? "…" : m.menu.clearAllSchedule}
                </button>
              )}
              <p className="px-4 pt-2 text-xs text-[var(--muted)]">
                {m.login.role}: {roleLabel}
              </p>
            </div>

            <div className="border-t border-[var(--border)] p-3">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {m.menu.theme}
              </p>
              <div className="flex flex-wrap gap-2">
                {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    className={`pss-btn rounded-full px-3 py-2 text-xs font-medium ${
                      theme === mode
                        ? "bg-[var(--accent)] text-white shadow-md"
                        : "bg-[var(--border)]/40 text-[var(--text)]"
                    }`}
                  >
                    {mode === "light" ? m.menu.themeLight : mode === "dark" ? m.menu.themeDark : m.menu.themeSystem}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--border)] p-3">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {m.menu.language}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLocale("id")}
                  className={`pss-btn rounded-full px-4 py-2 text-xs font-semibold ${
                    locale === "id" ? "bg-[var(--accent)] text-white shadow-md" : "bg-[var(--border)]/40"
                  }`}
                >
                  ID
                </button>
                <button
                  type="button"
                  onClick={() => setLocale("en")}
                  className={`pss-btn rounded-full px-4 py-2 text-xs font-semibold ${
                    locale === "en" ? "bg-[var(--accent)] text-white shadow-md" : "bg-[var(--border)]/40"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
