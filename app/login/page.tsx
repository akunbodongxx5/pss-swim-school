"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useApp } from "@/lib/i18n-context";

type CoachOpt = { id: string; name: string };

export default function LoginPage() {
  const { t } = useApp();
  const [role, setRole] = useState<"admin" | "coach">("admin");
  const [pin, setPin] = useState("");
  const [coachId, setCoachId] = useState("");
  const [coaches, setCoaches] = useState<CoachOpt[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (role !== "coach") {
      setCoachId("");
      return;
    }
    let cancelled = false;
    setLoadingList(true);
    fetch("/api/coaches", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: CoachOpt[]) => {
        if (cancelled) return;
        if (Array.isArray(d)) {
          setCoaches(d);
          if (d.length > 0) setCoachId((prev) => prev || d[0].id);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (role === "coach" && !coachId) {
      setErr(t("login.errCoachRequired"));
      return;
    }
    setLoading(true);
    const r = await fetch("/api/set-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(
        role === "admin" ? { role: "admin", pin } : { role: "coach", coachId },
      ),
    });
    let data: { ok?: boolean; error?: string } = {};
    try {
      data = (await r.json()) as { ok?: boolean; error?: string };
    } catch {
      /* ignore */
    }
    setLoading(false);
    if (!r.ok) {
      const code = data.error;
      if (code === "coach_required") setErr(t("login.errCoachRequired"));
      else if (code === "coach_invalid") setErr(t("login.errCoachInvalid"));
      else setErr(typeof code === "string" ? code : "Gagal");
      return;
    }
    /** Full navigation supaya layout membaca cookie peran baru (router alone bisa menyisakan UI pelatih). */
    window.location.assign("/jadwal");
  }

  const fieldClass =
    "mt-1 w-full min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] outline-none transition-shadow focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/15";

  return (
    <div className="space-y-6">
      <div className="pss-panel flex items-start gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--mint)] text-white shadow-lg shadow-[var(--accent)]/25">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight text-[var(--text)]">{t("login.headline")}</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{t("login.body")}</p>
        </div>
      </div>

      <form onSubmit={submit} className="pss-animate-fade-in-up pss-panel space-y-5 p-5">
        <div>
          <span className="text-xs font-semibold text-[var(--muted)]">{t("login.role")}</span>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition-all duration-200 ${
                role === "admin"
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]/25"
                  : "border-[var(--border)] bg-[var(--surface-2)]/50 hover:border-[var(--accent)]/40"
              }`}
            >
              <ShieldCheck
                className={`h-9 w-9 ${role === "admin" ? "text-[var(--accent-dim)]" : "text-[var(--muted)]"}`}
                strokeWidth={2}
              />
              <span className="text-sm font-bold text-[var(--text)]">{t("login.admin")}</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("coach")}
              className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition-all duration-200 ${
                role === "coach"
                  ? "border-[var(--mint)] bg-teal-500/10 ring-2 ring-teal-500/25 dark:bg-teal-500/15"
                  : "border-[var(--border)] bg-[var(--surface-2)]/50 hover:border-teal-400/35"
              }`}
            >
              <UserRound
                className={`h-9 w-9 ${role === "coach" ? "text-[var(--mint)]" : "text-[var(--muted)]"}`}
                strokeWidth={2}
              />
              <span className="text-sm font-bold text-[var(--text)]">{t("login.coach")}</span>
            </button>
          </div>
        </div>

        {role === "admin" ? (
          <label className="block text-sm">
            <span className="flex items-center gap-2 font-medium text-[var(--text)]">
              <KeyRound className="h-4 w-4 text-amber-500" />
              PIN Admin
            </span>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className={fieldClass}
              required
            />
          </label>
        ) : (
          <label className="block text-sm">
            <span className="flex items-center gap-2 font-medium text-[var(--text)]">
              <UserRound className="h-4 w-4 text-[var(--mint)]" />
              {t("login.coachPickLabel")}
            </span>
            <select
              required
              value={coachId}
              onChange={(e) => setCoachId(e.target.value)}
              disabled={loadingList || coaches.length === 0}
              className={fieldClass}
            >
              <option value="">{t("login.coachPickPlaceholder")}</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {err ? <p className="text-sm font-medium text-[var(--danger)]">{err}</p> : null}
        <button
          type="submit"
          disabled={loading || (role === "coach" && (!coachId || coaches.length === 0))}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--mint)] text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/30 disabled:opacity-50"
        >
          {loading ? t("login.saving") : t("login.apply")}
        </button>
      </form>
      <p className="text-center text-xs text-[var(--muted)]">
        Pelatih pilih nama dari daftar. Admin butuh PIN.
      </p>
    </div>
  );
}
