import { LoadingSplash } from "@/components/LoadingSplash";
import { pwaSplashBackgroundHex } from "@/lib/pwa-splash";

/** Tanpa async/DB: splash navigasi harus instan (lihat LoadingSplash). */
export default function Loading() {
  return <LoadingSplash backgroundHex={pwaSplashBackgroundHex()} />;
}
