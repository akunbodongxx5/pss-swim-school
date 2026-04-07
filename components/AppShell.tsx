"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAllSchedulesWithUndo } from "@/lib/schedule-undo";
import { useBranding } from "@/lib/branding-context";
import { useApp, type ThemeMode } from "@/lib/i18n-context";

type Role = "admin" | "coach";

function IconCalendar({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5"
      />
    </svg>
  );
}

function IconUsers({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function IconCoach({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function titleForPath(pathname: string, t: (k: string) => string): string {
  if (pathname === "/" || pathname === "") return t("titles.home");
  if (pathname.startsWith("/jadwal")) return t("titles.schedule");
  if (pathname.startsWith("/murid")) return t("titles.students");
  if (pathname.startsWith("/pelatih")) return t("titles.coaches");
  if (pathname.startsWith("/waitlist")) return t("titles.waitlist");
  if (pathname.startsWith("/login")) return t("titles.login");
  if (pathname.startsWith("/settings")) return t("titles.settings");
  return t("appName");
}

export function AppShell({ children, initialRole }: { children: React.ReactNode; initialRole: Role }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { t, locale, setLocale, theme, setTheme, m } = useApp();
  const { branding } = useBranding();
  const [menuOpen, setMenuOpen] = useState(false);
  const [clearingSchedule, setClearingSchedule] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const page = titleForPath(pathname, t);
    document.title = `${page} | ${branding.schoolName}`;
  }, [pathname, branding.schoolName, t]);

  const title = titleForPath(pathname, t);
  const roleLabel = initialRole === "coach" ? t("login.coach") : t("login.admin");

  const tabs = [
    { href: "/jadwal", label: m.nav.schedule, icon: IconCalendar },
    { href: "/murid", label: m.nav.students, icon: IconUsers },
    { href: "/pelatih", label: m.nav.coaches, icon: IconCoach },
  ] as const;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--text)]">
      <header
        className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="mx-auto flex h-12 max-w-lg items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {branding.logoDataUrl ? (
              <img
                src={branding.logoDataUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg object-contain ring-1 ring-[var(--border)]"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-medium leading-tight text-[var(--muted)]">{branding.schoolName}</p>
              <h1 className="truncate text-base font-semibold leading-tight tracking-tight">{title}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="pss-btn flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text)] active:bg-[var(--border)]"
            aria-label={m.menu.title}
          >
            <IconMenu />
          </button>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-4"
        style={{ paddingBottom: "max(7rem, calc(5.5rem + env(safe-area-inset-bottom)))" }}
      >
        <div key={pathname} className="pss-animate-page">
          {children}
        </div>
      </main>

      <nav
        className="bottom-nav-shell fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className={`pss-nav-tab flex min-h-[3.25rem] min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-medium ${
                  active ? "text-[var(--accent)]" : "text-[var(--muted)]"
                }`}
              >
                <Icon active={active} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
          <button
            type="button"
            className="pss-menu-backdrop absolute inset-0 cursor-default bg-black/40"
            aria-hidden
            onClick={() => setMenuOpen(false)}
          />
          <aside
            className="pss-menu-panel relative z-10 h-full w-[min(100%,20rem)] border-l border-[var(--border)] bg-[var(--surface)] shadow-xl"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="font-semibold">{m.menu.title}</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="pss-btn flex h-10 w-10 items-center justify-center rounded-xl active:bg-[var(--border)]"
                aria-label="Close"
              >
                <IconClose />
              </button>
            </div>
            <div className="space-y-1 p-3">
              <Link
                href="/"
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 active:bg-[var(--border)]"
              >
                {m.menu.home}
              </Link>
              <Link
                href="/waitlist"
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 active:bg-[var(--border)]"
              >
                {m.menu.waitlist}
              </Link>
              <Link
                href="/settings"
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 active:bg-[var(--border)]"
              >
                {m.menu.schoolSettings}
              </Link>
              <Link
                href="/login"
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 active:bg-[var(--border)]"
              >
                {m.menu.roleLogin}
              </Link>
              {initialRole === "admin" && (
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
                  className="pss-btn w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-[var(--danger)] active:bg-[var(--border)] disabled:opacity-50"
                >
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
                        ? "bg-[var(--accent)] text-white"
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
                    locale === "id" ? "bg-[var(--accent)] text-white" : "bg-[var(--border)]/40"
                  }`}
                >
                  ID
                </button>
                <button
                  type="button"
                  onClick={() => setLocale("en")}
                  className={`pss-btn rounded-full px-4 py-2 text-xs font-semibold ${
                    locale === "en" ? "bg-[var(--accent)] text-white" : "bg-[var(--border)]/40"
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
