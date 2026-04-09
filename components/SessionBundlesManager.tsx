"use client";

import { useCallback, useEffect, useState } from "react";
import { Boxes, Pencil, Plus, Trash2 } from "lucide-react";
import { parseAllowedLanesJson, parseLevelIdsJson } from "@/lib/bundle-def";
import { useApp } from "@/lib/i18n-context";

type SwimLevelRow = { id: string; name: string; sortOrder: number };

type BundleRow = {
  id: string;
  schoolId: number;
  slug: string;
  name: string;
  sortOrder: number;
  levelIds: string;
  allowedLanesJson: string;
  maxStudents1Coach: number;
  maxStudents2Coach: number;
  maxConcurrentSessionsOnLane1: number | null;
};

type Draft = {
  name: string;
  slug: string;
  levelIds: string[];
  allowedLanes: number[];
  max1: number;
  max2: number;
  maxLane1: string;
};

const LANES = [1, 2, 3, 4] as const;

function rowToDraft(b: BundleRow): Draft {
  return {
    name: b.name,
    slug: b.slug,
    levelIds: parseLevelIdsJson(b.levelIds),
    allowedLanes: parseAllowedLanesJson(b.allowedLanesJson),
    max1: b.maxStudents1Coach,
    max2: b.maxStudents2Coach,
    maxLane1: b.maxConcurrentSessionsOnLane1 == null ? "" : String(b.maxConcurrentSessionsOnLane1),
  };
}

function emptyDraft(): Draft {
  return {
    name: "",
    slug: "",
    levelIds: [],
    allowedLanes: [1],
    max1: 10,
    max2: 13,
    maxLane1: "",
  };
}

export function SessionBundlesManager() {
  const { t } = useApp();
  const [levels, setLevels] = useState<SwimLevelRow[]>([]);
  const [bundles, setBundles] = useState<BundleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [lv, bd] = await Promise.all([
        fetch("/api/swim-levels").then((r) => r.json()),
        fetch("/api/session-bundles").then((r) => r.json()),
      ]);
      if (Array.isArray(lv)) {
        setLevels([...lv].sort((a: SwimLevelRow, b: SwimLevelRow) => a.sortOrder - b.sortOrder));
      }
      if (Array.isArray(bd)) {
        setBundles(bd);
      }
    } catch {
      setErr(t("bundlesAdmin.failed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(b: BundleRow) {
    setEditingId(b.id);
    setDraft(rowToDraft(b));
    setMsg(null);
    setErr(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft());
  }

  function toggleLevel(id: string) {
    setDraft((d) => {
      const s = new Set(d.levelIds);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return { ...d, levelIds: [...s] };
    });
  }

  function toggleLane(ln: number) {
    setDraft((d) => {
      const s = new Set(d.allowedLanes);
      if (s.has(ln)) {
        s.delete(ln);
        if (s.size === 0) return d;
      } else {
        s.add(ln);
      }
      return { ...d, allowedLanes: [...s].sort((a, b) => a - b) };
    });
  }

  function toggleNewLevel(id: string) {
    setNewDraft((d) => {
      const s = new Set(d.levelIds);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return { ...d, levelIds: [...s] };
    });
  }

  function toggleNewLane(ln: number) {
    setNewDraft((d) => {
      const s = new Set(d.allowedLanes);
      if (s.has(ln)) {
        s.delete(ln);
        if (s.size === 0) return d;
      } else {
        s.add(ln);
      }
      return { ...d, allowedLanes: [...s].sort((a, b) => a - b) };
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    if (!draft.name.trim() || !draft.slug.trim() || draft.levelIds.length === 0 || draft.allowedLanes.length === 0) {
      setErr(t("bundlesAdmin.validation"));
      return;
    }
    let maxLane1: number | null = null;
    if (draft.maxLane1.trim() !== "") {
      const p = parseInt(draft.maxLane1, 10);
      if (!Number.isFinite(p) || p < 1) {
        setErr(t("bundlesAdmin.validation"));
        return;
      }
      maxLane1 = p;
    }
    setSaving(true);
    setErr(null);
    const r = await fetch(`/api/session-bundles?id=${encodeURIComponent(editingId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        levelIds: draft.levelIds,
        allowedLanes: draft.allowedLanes,
        maxStudents1Coach: draft.max1,
        maxStudents2Coach: draft.max2,
        maxConcurrentSessionsOnLane1: maxLane1,
      }),
    });
    const data = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) {
      setErr((data as { error?: string }).error ?? t("bundlesAdmin.failed"));
      return;
    }
    setMsg(t("bundlesAdmin.saved"));
    setEditingId(null);
    await load();
  }

  async function createBundle() {
    if (levels.length === 0) {
      setErr(t("bundlesAdmin.needsLevels"));
      return;
    }
    const slug =
      newDraft.slug.trim() ||
      `bundle_${Date.now().toString(36)}`;
    if (!newDraft.name.trim() || newDraft.levelIds.length === 0 || newDraft.allowedLanes.length === 0) {
      setErr(t("bundlesAdmin.validation"));
      return;
    }
    let maxLane1: number | null = null;
    if (newDraft.maxLane1.trim() !== "") {
      const p = parseInt(newDraft.maxLane1, 10);
      if (!Number.isFinite(p) || p < 1) {
        setErr(t("bundlesAdmin.validation"));
        return;
      }
      maxLane1 = p;
    }
    setCreating(true);
    setErr(null);
    const r = await fetch("/api/session-bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newDraft.name.trim(),
        slug: slug.replace(/\s+/g, "_"),
        levelIds: newDraft.levelIds,
        allowedLanes: newDraft.allowedLanes,
        maxStudents1Coach: newDraft.max1,
        maxStudents2Coach: newDraft.max2,
        maxConcurrentSessionsOnLane1: maxLane1,
      }),
    });
    const data = await r.json().catch(() => ({}));
    setCreating(false);
    if (!r.ok) {
      setErr((data as { error?: string }).error ?? t("bundlesAdmin.failed"));
      return;
    }
    setMsg(t("bundlesAdmin.saved"));
    setNewOpen(false);
    setNewDraft(emptyDraft());
    await load();
  }

  async function deleteBundle(b: BundleRow) {
    if (!confirm(t("bundlesAdmin.deleteConfirm", { name: b.name }))) return;
    setDeletingId(b.id);
    setErr(null);
    const r = await fetch(`/api/session-bundles?id=${encodeURIComponent(b.id)}`, { method: "DELETE" });
    const data = await r.json().catch(() => ({}));
    setDeletingId(null);
    if (!r.ok) {
      setErr((data as { error?: string }).error ?? t("bundlesAdmin.failed"));
      return;
    }
    if (editingId === b.id) cancelEdit();
    setMsg(t("bundlesAdmin.deleted"));
    await load();
  }

  const field =
    "mt-1 w-full min-h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]";

  return (
    <section className="pss-panel min-w-0 space-y-3 border-l-4 border-l-violet-500 p-3 sm:p-4">
      <div className="flex items-start gap-2">
        <Boxes className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
        <div>
          <h2 className="text-base font-bold text-[var(--text)]">{t("bundlesAdmin.title")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{t("bundlesAdmin.hint")}</p>
        </div>
      </div>

      {msg && <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{msg}</p>}
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">{t("schedule.loading")}</p>
      ) : levels.length === 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">{t("bundlesAdmin.needsLevels")}</p>
      ) : (
        <>
          <ul className="space-y-3">
            {bundles.map((b) => (
              <li
                key={b.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg)]/40 p-3 sm:p-4"
              >
                {editingId === b.id ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 min-[480px]:grid-cols-2">
                      <label className="block text-sm">
                        <span className="text-[var(--muted)]">{t("bundlesAdmin.nameLabel")}</span>
                        <input
                          className={field}
                          value={draft.name}
                          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-[var(--muted)]">{t("bundlesAdmin.slugLabel")}</span>
                        <input
                          className={field}
                          value={draft.slug}
                          onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                        />
                        <span className="mt-0.5 block text-[10px] text-[var(--muted)]">{t("bundlesAdmin.slugHint")}</span>
                      </label>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--text)]">{t("bundlesAdmin.levelsLabel")}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {levels.map((lv) => (
                          <label
                            key={lv.id}
                            className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                              draft.levelIds.includes(lv.id)
                                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                                : "border-[var(--border)] text-[var(--muted)]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={draft.levelIds.includes(lv.id)}
                              onChange={() => toggleLevel(lv.id)}
                            />
                            {lv.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--text)]">{t("bundlesAdmin.lanesLabel")}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {LANES.map((ln) => (
                          <label
                            key={ln}
                            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium ${
                              draft.allowedLanes.includes(ln)
                                ? "border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                                : "border-[var(--border)] text-[var(--muted)]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={draft.allowedLanes.includes(ln)}
                              onChange={() => toggleLane(ln)}
                            />
                            {t("bundlesAdmin.laneN", { n: ln })}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-3 min-[400px]:grid-cols-2">
                      <label className="block text-sm">
                        <span className="text-[var(--muted)]">{t("bundlesAdmin.max1Label")}</span>
                        <input
                          type="number"
                          min={1}
                          className={field}
                          value={draft.max1}
                          onChange={(e) => setDraft((d) => ({ ...d, max1: Number(e.target.value) || 1 }))}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-[var(--muted)]">{t("bundlesAdmin.max2Label")}</span>
                        <input
                          type="number"
                          min={1}
                          className={field}
                          value={draft.max2}
                          onChange={(e) => setDraft((d) => ({ ...d, max2: Number(e.target.value) || 1 }))}
                        />
                      </label>
                    </div>
                    <label className="block text-sm">
                      <span className="text-[var(--muted)]">{t("bundlesAdmin.maxLane1Label")}</span>
                      <input
                        type="number"
                        min={1}
                        placeholder={t("bundlesAdmin.maxLane1Placeholder")}
                        className={field}
                        value={draft.maxLane1}
                        onChange={(e) => setDraft((d) => ({ ...d, maxLane1: e.target.value }))}
                      />
                      <span className="mt-0.5 block text-[10px] text-[var(--muted)]">{t("bundlesAdmin.maxLane1Hint")}</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void saveEdit()}
                        className="min-h-10 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {t("bundlesAdmin.save")}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={cancelEdit}
                        className="min-h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-medium"
                      >
                        {t("bundlesAdmin.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text)]">{b.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {t("bundlesAdmin.slugShort")}: {b.slug}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {parseLevelIdsJson(b.levelIds).length} {t("bundlesAdmin.levelsCount")} ·{" "}
                        {t("bundlesAdmin.lanesShort")}: {parseAllowedLanesJson(b.allowedLanesJson).join(", ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(b)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-sm font-medium text-[var(--accent)]"
                      >
                        <Pencil className="h-4 w-4" />
                        {t("bundlesAdmin.edit")}
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === b.id}
                        onClick={() => void deleteBundle(b)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("bundlesAdmin.delete")}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {newOpen ? (
            <div className="rounded-2xl border border-dashed border-[var(--accent)]/50 bg-[var(--accent)]/5 p-3 sm:p-4">
              <h3 className="text-sm font-bold text-[var(--text)]">{t("bundlesAdmin.newTitle")}</h3>
              <div className="mt-3 space-y-3">
                <div className="grid gap-3 min-[480px]:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-[var(--muted)]">{t("bundlesAdmin.nameLabel")}</span>
                    <input
                      className={field}
                      value={newDraft.name}
                      onChange={(e) => setNewDraft((d) => ({ ...d, name: e.target.value }))}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-[var(--muted)]">{t("bundlesAdmin.slugLabel")}</span>
                    <input
                      className={field}
                      value={newDraft.slug}
                      onChange={(e) => setNewDraft((d) => ({ ...d, slug: e.target.value }))}
                      placeholder={t("bundlesAdmin.slugOptional")}
                    />
                  </label>
                </div>
                <div>
                  <p className="text-xs font-medium">{t("bundlesAdmin.levelsLabel")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {levels.map((lv) => (
                      <label
                        key={lv.id}
                        className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                          newDraft.levelIds.includes(lv.id)
                            ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                            : "border-[var(--border)] text-[var(--muted)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={newDraft.levelIds.includes(lv.id)}
                          onChange={() => toggleNewLevel(lv.id)}
                        />
                        {lv.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium">{t("bundlesAdmin.lanesLabel")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LANES.map((ln) => (
                      <label
                        key={ln}
                        className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium ${
                          newDraft.allowedLanes.includes(ln)
                            ? "border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                            : "border-[var(--border)] text-[var(--muted)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={newDraft.allowedLanes.includes(ln)}
                          onChange={() => toggleNewLane(ln)}
                        />
                        {t("bundlesAdmin.laneN", { n: ln })}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 min-[400px]:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-[var(--muted)]">{t("bundlesAdmin.max1Label")}</span>
                    <input
                      type="number"
                      min={1}
                      className={field}
                      value={newDraft.max1}
                      onChange={(e) => setNewDraft((d) => ({ ...d, max1: Number(e.target.value) || 1 }))}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-[var(--muted)]">{t("bundlesAdmin.max2Label")}</span>
                    <input
                      type="number"
                      min={1}
                      className={field}
                      value={newDraft.max2}
                      onChange={(e) => setNewDraft((d) => ({ ...d, max2: Number(e.target.value) || 1 }))}
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="text-[var(--muted)]">{t("bundlesAdmin.maxLane1Label")}</span>
                  <input
                    type="number"
                    min={1}
                    placeholder={t("bundlesAdmin.maxLane1Placeholder")}
                    className={field}
                    value={newDraft.maxLane1}
                    onChange={(e) => setNewDraft((d) => ({ ...d, maxLane1: e.target.value }))}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => void createBundle()}
                    className="min-h-10 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {t("bundlesAdmin.addSubmit")}
                  </button>
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => {
                      setNewOpen(false);
                      setNewDraft(emptyDraft());
                      setErr(null);
                    }}
                    className="min-h-10 rounded-xl border border-[var(--border)] px-4 text-sm"
                  >
                    {t("bundlesAdmin.cancel")}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNewOpen(true);
                setNewDraft(emptyDraft());
                setMsg(null);
              }}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-2 text-sm font-medium text-[var(--accent)] active:bg-[var(--border)]/30"
            >
              <Plus className="h-4 w-4" />
              {t("bundlesAdmin.openNew")}
            </button>
          )}
        </>
      )}
    </section>
  );
}
