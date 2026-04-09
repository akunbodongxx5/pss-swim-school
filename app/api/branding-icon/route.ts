import { NextResponse } from "next/server";
import { dataUrlToImageBuffer, isSupportedPwaImageMime } from "@/lib/data-url-buffer";
import { renderSquarePwaIcon } from "@/lib/pwa-icon-render";
import { getSchoolBranding } from "@/lib/school-branding-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseSizeParam(req: Request): number {
  const raw = new URL(req.url).searchParams.get("size");
  const n = raw ? parseInt(raw, 10) : 512;
  if (!Number.isFinite(n)) return 512;
  return Math.min(1024, Math.max(48, n));
}

/**
 * Ikon PWA / apple-touch: logo sekolah diolah jadi persegi (latar terang + area aman maskable).
 * Tanpa logo → redirect /icon.png (app/icon.png).
 */
export async function GET(req: Request) {
  const pixelSize = parseSizeParam(req);
  const b = await getSchoolBranding();

  if (b.logoDataUrl) {
    const parsed = dataUrlToImageBuffer(b.logoDataUrl);
    if (parsed && isSupportedPwaImageMime(parsed.contentType)) {
      const png = await renderSquarePwaIcon(parsed.buffer, pixelSize);
      if (png) {
        return new NextResponse(new Uint8Array(png), {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          },
        });
      }
    }
  }

  return NextResponse.redirect(new URL("/icon.png", req.url), 302);
}
