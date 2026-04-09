"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useApp } from "@/lib/i18n-context";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useApp();
  const [role, setRole] = useState<"admin" | "coach">("admin");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const r = await fetch("/api/set-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, pin: role === "admin" ? pin : undefined }),
    });
    const data = await r.json();
    setLoading(false);
    if (!r.ok) {
      setErr(data.error ?? "Gagal");
      return;
    }
    router.refresh();
    router.push("/jadwal");
  }

  const fieldClass =
    "mt-1 w-full min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)]";

  return (
    <div className="space-y-6">
      <div className="pss-panel flex items-start gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-teal-600 text-white shadow-lg shadow-sky-500/20">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight text-[var(--text)]">{t("login.headline")}</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{t("login.body")}</p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="pss-animate-fade-in-up pss-panel space-y-5 p-5"
      >
        <div>
          <span className="text-xs font-semibold text-[var(--muted)]">{t("login.role")}</span>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition-all ${
                role === "admin"
                  ? "border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/25 dark:bg-sky-500/15"
                  : "border-zinc-200 bg-zinc-50/50 hover:border-sky-200 dark:border-zinc-700 dark:bg-zinc-900/40"
              }`}
            >
              <ShieldCheck
                className={`h-9 w-9 ${role === "admin" ? "text-sky-600" : "text-[var(--muted)]"}`}
                strokeWidth={2}
              />
              <span className="text-sm font-bold text-[var(--text)]">{t("login.admin")}</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("coach")}
              className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition-all ${
                role === "coach"
                  ? "border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/25 dark:bg-teal-500/15"
                  : "border-zinc-200 bg-zinc-50/50 hover:border-teal-200 dark:border-zinc-700 dark:bg-zinc-900/40"
              }`}
            >
              <UserRound
                className={`h-9 w-9 ${role === "coach" ? "text-teal-600" : "text-[var(--muted)]"}`}
                strokeWidth={2}
              />
              <span className="text-sm font-bold text-[var(--text)]">{t("login.coach")}</span>
            </button>
          </div>
        </div>

        {role === "admin" && (
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
        )}
        {err && <p className="text-sm font-medium text-[var(--danger)]">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 text-sm font-bold text-white shadow-lg shadow-sky-600/25 disabled:opacity-50"
        >
          {loading ? t("login.saving") : t("login.apply")}
        </button>
      </form>
      <p className="text-center text-xs text-[var(--muted)]">
        Pelatih bisa masuk tanpa PIN. Admin butuh PIN.
      </p>
    </div>
  );
}
