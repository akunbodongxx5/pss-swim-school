import type { MetadataRoute } from "next";
import { getSchoolBrandingMeta } from "@/lib/school-branding-server";
import { pwaSplashBackgroundHex } from "@/lib/pwa-splash";

export const dynamic = "force-dynamic";

/** Label di bawah ikon: isi kata penuh sampai batas karakter (mis. "Pramono Swim"). */
function shortNameForLauncher(name: string, max = 12): string {
  const t = name.trim();
  if (t.length <= max) return t;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 1 && words[0].length > max) {
    return `${words[0].slice(0, max - 1)}…`;
  }
  let acc = words[0] ?? "";
  for (let i = 1; i < words.length; i++) {
    const next = `${acc} ${words[i]}`;
    if (next.length <= max) acc = next;
    else break;
  }
  if (acc.length >= 2) return acc;
  const chunk = t.slice(0, max);
  const sp = chunk.lastIndexOf(" ");
  if (sp >= 4) return chunk.slice(0, sp);
  return `${t.slice(0, max - 1)}…`;
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const b = await getSchoolBrandingMeta();
  const short = shortNameForLauncher(b.schoolName);
  const splashBg = pwaSplashBackgroundHex();
  return {
    name: b.schoolName,
    short_name: short,
    description: `Schedule, students, and coaches — ${b.schoolName}`,
    start_url: "/jadwal",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: splashBg,
    theme_color: "#2563eb",
    icons: [
      {
        src: `/api/branding-icon?size=192&v=${b.logoVersion}`,
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: `/api/branding-icon?size=512&v=${b.logoVersion}`,
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: `/api/branding-icon?size=512&v=${b.logoVersion}`,
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  };
}
