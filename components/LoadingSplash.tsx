/**
 * Layar loading RSC: splash terang selaras PWA + animasi ringan.
 * Ditampilkan oleh `app/loading.tsx` saat navigasi/segment memuat.
 */
export function LoadingSplash({
  schoolName,
  logoVersion,
  backgroundHex,
}: {
  schoolName: string;
  logoVersion: number;
  backgroundHex: string;
}) {
  const iconSrc = `/api/branding-icon?size=176&v=${logoVersion}`;

  return (
    <div
      className="pss-splash-root fixed inset-0 z-[100] flex flex-col items-center justify-center px-8 text-slate-800 dark:!bg-[#0c1222] dark:text-slate-100"
      style={{
        backgroundColor: backgroundHex,
        paddingTop: "max(2rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-[min(85vw,24rem)] w-[min(85vw,24rem)] -translate-x-1/2 rounded-full bg-[#2563eb]/12 blur-3xl dark:bg-[#3b82f6]/18"
      />
      <div className="relative flex max-w-sm flex-col items-center text-center">
        <div className="pss-splash-logo-wrap rounded-3xl bg-white/90 p-3 shadow-lg ring-1 ring-slate-200/80 dark:bg-white/10 dark:ring-white/10">
          <img
            src={iconSrc}
            alt=""
            width={176}
            height={176}
            className="h-36 w-36 rounded-2xl object-contain sm:h-40 sm:w-40"
          />
        </div>
        <h1 className="mt-8 text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          {schoolName}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Memuat · Loading</p>
        <div className="mt-8 flex gap-2" aria-hidden>
          <span className="pss-splash-dot h-2 w-2 rounded-full bg-[#2563eb] dark:bg-[#60a5fa]" />
          <span className="pss-splash-dot h-2 w-2 rounded-full bg-[#2563eb] dark:bg-[#60a5fa]" />
          <span className="pss-splash-dot h-2 w-2 rounded-full bg-[#2563eb] dark:bg-[#60a5fa]" />
        </div>
      </div>
    </div>
  );
}
