"use client";

import { useEffect } from "react";

/** Hanya production: di dev, SW bisa mengganggu HMR dan terasa memperlambat reload. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
