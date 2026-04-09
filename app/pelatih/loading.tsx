/** Loading khusus /pelatih — ringan, tidak full-screen (beda dari app/loading.tsx). */
export default function PelatihLoading() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center">
      <p className="text-sm font-medium text-[var(--text)]">Memuat data pelatih…</p>
      <p className="mt-2 text-xs text-[var(--muted)]">Mohon tunggu sebentar</p>
      <div className="mt-6 flex justify-center gap-2" aria-hidden>
        <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500/80" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500/80 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500/80 [animation-delay:300ms]" />
      </div>
    </div>
  );
}
