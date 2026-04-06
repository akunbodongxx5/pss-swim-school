"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Locale, MessageTree } from "@/messages/types";
import en from "@/messages/en";
import id from "@/messages/id";

const DICTS: Record<Locale, MessageTree> = { id, en };

export type ThemeMode = "light" | "dark" | "system";

const THEME_KEY = "pss-theme";
const LOCALE_KEY = "pss-locale";

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => {
    if (o && typeof o === "object" && k in o) return (o as Record<string, unknown>)[k];
    return undefined;
  }, obj);
}

export function formatTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

type AppContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  m: MessageTree;
  bundleLabel: (key: string) => string;
};

const AppContext = createContext<AppContextValue | null>(null);

function applyThemeClass(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (mode === "light") root.classList.add("light");
  else if (mode === "dark") root.classList.add("dark");
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("id");
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const s = localStorage.getItem(LOCALE_KEY) as Locale | null;
      if (s === "en" || s === "id") setLocaleState(s);
      const th = localStorage.getItem(THEME_KEY) as ThemeMode | null;
      if (th === "light" || th === "dark" || th === "system") setThemeState(th);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale === "en" ? "en" : "id";
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale, mounted]);

  useEffect(() => {
    if (!mounted) return;
    applyThemeClass(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeClass("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, mounted]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    applyThemeClass(t);
  }, []);

  const m = DICTS[locale];

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const raw = getByPath(m, path);
      const str = typeof raw === "string" ? raw : path;
      return vars ? formatTemplate(str, vars) : str;
    },
    [m]
  );

  const bundleLabel = useCallback(
    (key: string) => m.bundles[key] ?? key,
    [m]
  );

  const value = useMemo(
    () => ({ locale, setLocale, theme, setTheme, t, m, bundleLabel }),
    [locale, setLocale, theme, setTheme, t, bundleLabel]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProviders");
  return ctx;
}
