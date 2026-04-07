import type { MetadataRoute } from "next";
import { getSchoolBrandingMeta } from "@/lib/school-branding-server";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const b = await getSchoolBrandingMeta();
  const short = b.schoolName.length > 12 ? `${b.schoolName.slice(0, 11)}…` : b.schoolName;
  return {
    name: b.schoolName,
    short_name: short,
    description: `Schedule, students, and coaches — ${b.schoolName}`,
    start_url: "/jadwal",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0c1222",
    theme_color: "#2563eb",
    icons: [
      {
        src: `/api/branding-icon?v=${b.logoVersion}`,
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: `/api/branding-icon?v=${b.logoVersion}`,
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: `/api/branding-icon?v=${b.logoVersion}`,
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  };
}
