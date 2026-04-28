"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ImagePlus, Info, KeyRound, Save, Type } from "lucide-react";
import { SessionBundlesManager } from "@/components/SessionBundlesManager";
import { useBranding } from "@/lib/branding-context";
import { useApp } from "@/lib/i18n-context";
import type { SchoolBrandingDTO } from "@/lib/school-branding-server";

const MAX_FILE_BYTES = 140_000;

type Role = "admin" | "coach";

export function SettingsClient({ initialBranding, role }: { initialBranding: SchoolBrandingDTO; role: Role }) {
  const { m } = useApp();
  const { refreshBranding } = useBranding();
  const router = useRouter();
  const [schoolName, setSchoolName] = useState(initialBranding.schoolName);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(initialBranding.logoDataUrl);
  const [adminReportsWrite, setAdminReportsWrite] = useState(initialBranding.adminCanWriteStudentReports);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pinConfiguredInDb, setPinConfiguredInDb] = useState<boolean | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [pinMessage, setPinMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (role !== "admin") return;
    let cancelled = false;
    fetch("/api/admin-pin", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: { pinConfiguredInDb?: boolean; error?: string }) => {
        if (cancelled) return;
        if (typeof d.pinConfiguredInDb === "boolean") setPinConfiguredInDb(d.pinConfiguredInDb);
        else setPinConfiguredInDb(false);
      })
      .catch(() => {
        if (!cancelled) setPinConfiguredInDb(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  const saveAdminPin = useCallback(async () => {
    setPinMessage(null);
    if (newPin.trim() !== confirmPin.trim()) {
      setPinMessage({ kind: "err", text: m.settings.errors.adminPin_mismatch });
      return;
    }
    setSavingPin(true);
    try {
      const res = await fetch("/api/admin-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ currentPin, newPin, confirmPin }),
      });
      const raw = await res.text();
      let data: { error?: string } = {};
      if (raw) {
        try {
          data = JSON.parse(raw) as { error?: string };
        } catch {
          setPinMessage({ kind: "err", text: m.settings.errors.generic });
          return;
        }
      }
      if (!res.ok) {
        const code = data.error;
        const text =
          code && code in m.settings.errors
            ? m.settings.errors[code as keyof typeof m.settings.errors]
            : m.settings.errors.generic;
        setPinMessage({ kind: "err", text });
        return;
      }
      setPinMessage({ kind: "ok", text: m.settings.adminPasscodeSaved });
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setPinConfiguredInDb(true);
    } catch {
      setPinMessage({ kind: "err", text: m.settings.errors.generic });
    } finally {
      setSavingPin(false);
    }
  }, [confirmPin, currentPin, m.settings.adminPasscodeSaved, m.settings.errors, newPin]);

  const onPickFile = useCallback(
    (file: File | null) => {
      setMessage(null);
      if (!file) return;
      if (file.size > MAX_FILE_BYTES) {
        setMessage({ kind: "err", text: m.settings.errors.logo_too_large });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result;
        if (typeof r !== "string") {
          setMessage({ kind: "err", text: m.settings.errors.logo_invalid });
          return;
        }
        setLogoDataUrl(r);
      };
      reader.onerror = () => setMessage({ kind: "err", text: m.settings.errors.generic });
      reader.readAsDataURL(file);
    },
    [m.settings.errors]
  );

  const save = useCallback(async () => {
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/school-branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ schoolName, logoDataUrl, adminCanWriteStudentReports: adminReportsWrite }),
      });

      const raw = await res.text();
      let data: { error?: string } = {};
      if (raw) {
        try {
          data = JSON.parse(raw) as { error?: string };
        } catch {
          const text =
            res.status >= 500
              ? m.settings.errors.server_error
              : m.settings.errors.bad_response;
          setMessage({ kind: "err", text });
          return;
        }
      }

      if (!res.ok) {
        let code = data.error;
        if (!code && res.status >= 500) code = "server_error";
        const text =
          code && code in m.settings.errors
            ? m.settings.errors[code as keyof typeof m.settings.errors]
            : m.settings.errors.generic;
        setMessage({ kind: "err", text });
        return;
      }
      setMessage({ kind: "ok", text: m.settings.saved });
      await refreshBranding();
      router.refresh();
    } catch {
      setMessage({ kind: "err", text: m.settings.errors.generic });
    } finally {
      setSaving(false);
    }
  }, [logoDataUrl, m.settings, refreshBranding, router, schoolName]);

  if (role === "coach") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted)]">{m.settings.coachReadOnly}</p>
        <div className="pss-panel p-4">
          <p className="text-lg font-semibold">{initialBranding.schoolName}</p>
          {initialBranding.logoDataUrl ? (
            <img
              src={initialBranding.logoDataUrl}
              alt=""
              className="mt-3 h-20 w-20 rounded-xl object-contain ring-1 ring-[var(--border)]"
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <details className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm open:border-sky-300/40 open:ring-1 open:ring-sky-500/15 dark:open:border-sky-700/40">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 text-sm font-medium text-[var(--text)] marker:content-none [&::-webkit-details-marker]:hidden sm:px-4">
          <Info className="h-4 w-4 shrink-0 text-sky-500" aria-hidden />
          <span className="min-w-0 flex-1">{m.settings.introSummary}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-200 group-open:rotate-180" aria-hidden />
        </summary>
        <div className="border-t border-[var(--border)] px-3 pb-3 pt-2 text-sm leading-relaxed text-[var(--muted)] sm:px-4">
          {m.settings.intro}
        </div>
      </details>

      <label className="block">
        <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <Type className="h-4 w-4 text-sky-500" />
          {m.settings.schoolNameLabel}
        </span>
        <input
          type="text"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          maxLength={100}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-[var(--text)] outline-none transition-shadow focus:border-sky-400 focus:ring-4 focus:ring-sky-500/15 dark:focus:ring-sky-500/10"
        />
        <span className="mt-1 block text-xs text-[var(--muted)]">{m.settings.schoolNameHint}</span>
      </label>

      <div>
        <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <ImagePlus className="h-4 w-4 text-violet-500" />
          {m.settings.logoLabel}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="pss-btn inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--accent-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--accent)] active:opacity-90">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
            {m.settings.pickLogo}
          </label>
          {logoDataUrl ? (
            <button
              type="button"
              onClick={() => {
                setLogoDataUrl(null);
                setMessage(null);
              }}
              className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--danger)] active:bg-[var(--border)]"
            >
              {m.settings.clearLogo}
            </button>
          ) : null}
        </div>
        <span className="mt-1 block text-xs text-[var(--muted)]">{m.settings.logoHint}</span>
        {logoDataUrl ? (
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">{m.settings.preview}</p>
            <img src={logoDataUrl} alt="" className="h-24 w-24 rounded-xl object-contain ring-1 ring-[var(--border)]" />
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-4 shadow-sm">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={adminReportsWrite}
            onChange={(e) => setAdminReportsWrite(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[var(--text)]">{m.settings.adminReportsToggleLabel}</span>
            <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">{m.settings.adminReportsToggleHint}</span>
          </span>
        </label>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-4 shadow-sm">
        <div className="mb-3 flex items-start gap-2">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text)]">{m.settings.adminPasscodeTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              {pinConfiguredInDb === null
                ? "…"
                : pinConfiguredInDb
                  ? m.settings.adminPasscodeHintReplace
                  : m.settings.adminPasscodeHintEnvFallback}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{m.settings.adminPasscodeCurrent}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--text)] outline-none transition-shadow focus:border-sky-400 focus:ring-4 focus:ring-sky-500/15"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{m.settings.adminPasscodeNew}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--text)] outline-none transition-shadow focus:border-sky-400 focus:ring-4 focus:ring-sky-500/15"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{m.settings.adminPasscodeConfirm}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--text)] outline-none transition-shadow focus:border-sky-400 focus:ring-4 focus:ring-sky-500/15"
            />
          </label>
          {pinMessage ? (
            <p className={`text-sm ${pinMessage.kind === "ok" ? "text-green-600 dark:text-green-400" : "text-[var(--danger)]"}`}>
              {pinMessage.text}
            </p>
          ) : null}
          <button
            type="button"
            disabled={savingPin}
            onClick={() => void saveAdminPin()}
            className="pss-btn w-full rounded-xl bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] ring-1 ring-[var(--border)] transition-colors hover:bg-[var(--border)]/30 disabled:opacity-50"
          >
            {savingPin ? m.settings.adminPasscodeSaving : m.settings.adminPasscodeSave}
          </button>
        </div>
      </div>

      <SessionBundlesManager />

      {message ? (
        <p className={`text-sm ${message.kind === "ok" ? "text-green-600 dark:text-green-400" : "text-[var(--danger)]"}`}>
          {message.text}
        </p>
      ) : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="pss-btn flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--mint)] py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/30 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? m.settings.saving : m.settings.save}
      </button>
    </div>
  );
}
