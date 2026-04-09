"use client";

export default function PelatihError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-5 text-sm text-[var(--text)]">
      <p className="font-semibold text-red-700 dark:text-red-300">Gagal memuat halaman Pelatih</p>
      <p className="mt-2 break-words text-[var(--muted)]">{error.message}</p>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Cek koneksi database, jalankan <code className="rounded bg-[var(--border)]/50 px-1">npx prisma generate</code> setelah
        ubah schema, lalu muat ulang.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 min-h-11 w-full rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white active:opacity-90"
      >
        Coba lagi
      </button>
    </div>
  );
}
