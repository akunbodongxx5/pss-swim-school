"use client";

import { useEffect } from "react";

/**
 * Production: daftarkan SW untuk PWA offline ringan.
 * Development: cabut semua SW (sisa `next start` / build lama) supaya tidak mem-blokir
 * `/_next/static/chunks/*` dan HMR.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const r of regs) void r.unregister();
      });
      if ("caches" in window) {
        void caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))));
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
