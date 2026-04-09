"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ImagePlus, Save, Type } from "lucide-react";
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

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
        body: JSON.stringify({ schoolName, logoDataUrl }),
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
      <div className="pss-panel border-l-4 border-l-sky-500 p-4 text-sm leading-relaxed text-[var(--text)]">
        {m.settings.intro}
      </div>

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

      {message ? (
        <p className={`text-sm ${message.kind === "ok" ? "text-green-600 dark:text-green-400" : "text-[var(--danger)]"}`}>
          {message.text}
        </p>
      ) : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="pss-btn flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-600/25 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? m.settings.saving : m.settings.save}
      </button>
    </div>
  );
}
