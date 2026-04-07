import { NextResponse } from "next/server";
import { dataUrlToImageBuffer, isSupportedPwaImageMime } from "@/lib/data-url-buffer";
import { getSchoolBranding } from "@/lib/school-branding-server";

export const runtime = "nodejs";

/**
 * Ikon PWA / apple-touch-icon: pakai logo sekolah (PNG/JPEG/WebP/SVG) kalau ada,
 * selain itu redirect ke /icon (huruf default).
 */
export async function GET(req: Request) {
  const b = await getSchoolBranding();
  if (b.logoDataUrl) {
    const parsed = dataUrlToImageBuffer(b.logoDataUrl);
    if (parsed && isSupportedPwaImageMime(parsed.contentType)) {
      return new NextResponse(new Uint8Array(parsed.buffer), {
        status: 200,
        headers: {
          "Content-Type": parsed.contentType,
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }
  }

  const dest = new URL("/icon", req.url);
  return NextResponse.redirect(dest, 302);
}
