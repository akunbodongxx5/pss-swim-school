/**
 * Layar loading navigasi: sengaja ringan — tanpa DB / tanpa /api/branding-icon
 * (route ikon itu memuat logo penuh dari Prisma + sharp, sangat mahal untuk splash).
 */
export function LoadingSplash({ backgroundHex }: { backgroundHex: string }) {
  return (
    <div
      className="pss-splash-root relative flex min-h-[min(70dvh,28rem)] w-full flex-col items-center justify-center px-8 py-10 text-slate-800 dark:text-slate-100"
      style={{
        backgroundColor: backgroundHex,
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[12%] h-[min(70vw,20rem)] w-[min(70vw,20rem)] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-500/15"
      />
      <div className="relative flex max-w-sm flex-col items-center text-center">
        <div className="pss-splash-logo-wrap rounded-3xl bg-white/90 p-3 shadow-lg ring-1 ring-slate-200/80 dark:bg-white/10 dark:ring-white/10">
          {/* app/icon.png → GET /icon.png (file metadata Next.js) */}
          <img
            src="/icon.png"
            alt=""
            width={176}
            height={176}
            className="h-36 w-36 rounded-2xl object-contain sm:h-40 sm:w-40"
          />
        </div>
        <p className="mt-8 text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Memuat
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Mohon tunggu sebentar</p>
        <div className="mt-8 flex gap-2" aria-hidden>
          <span className="pss-splash-dot h-2 w-2 rounded-full bg-sky-500 dark:bg-sky-400" />
          <span className="pss-splash-dot h-2 w-2 rounded-full bg-sky-500 dark:bg-sky-400" />
          <span className="pss-splash-dot h-2 w-2 rounded-full bg-sky-500 dark:bg-sky-400" />
        </div>
      </div>
    </div>
  );
}
