"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/i18n-context";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useApp();
  const [role, setRole] = useState<"admin" | "coach">("admin");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/set-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setLoading(false);
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
        className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
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
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 w-full rounded-xl bg-[var(--accent)] text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? t("login.saving") : t("login.apply")}
        </button>
      </form>
    </div>
  );
}
