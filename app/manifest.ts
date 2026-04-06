import type { MetadataRoute } from "next";
import { ensureSchoolBrandingRow, getSchoolBranding } from "@/lib/school-branding-server";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  await ensureSchoolBrandingRow();
  const b = await getSchoolBranding();
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
        src: "/icon?size=192",
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: "/icon?size=512",
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: "/icon?size=512",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  };
}
