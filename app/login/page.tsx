"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
      <p className="text-xl font-semibold">{t("login.headline")}</p>
      <p className="text-sm leading-relaxed text-[var(--muted)]">{t("login.body")}</p>
      <form
        onSubmit={submit}
        className="pss-animate-fade-in-up space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
      >
        <label className="block text-sm">
          <span className="text-[var(--muted)]">{t("login.role")}</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "coach")}
            className={fieldClass}
          >
            <option value="admin">{t("login.admin")}</option>
            <option value="coach">{t("login.coach")}</option>
          </select>
        </label>
        {role === "admin" && (
          <label className="block text-sm">
            <span className="text-[var(--muted)]">PIN Admin</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="****"
              className={fieldClass}
              required
            />
          </label>
        )}
        {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 w-full rounded-xl bg-[var(--accent)] text-sm font-semibold text-white disabled:opacity-50"
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
