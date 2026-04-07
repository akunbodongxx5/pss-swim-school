import { LoadingSplash } from "@/components/LoadingSplash";
import { getSchoolBrandingMeta } from "@/lib/school-branding-server";
import { pwaSplashBackgroundHex } from "@/lib/pwa-splash";

export const dynamic = "force-dynamic";

export default async function Loading() {
  const b = await getSchoolBrandingMeta();
  return (
    <LoadingSplash
      schoolName={b.schoolName}
      logoVersion={b.logoVersion}
      backgroundHex={pwaSplashBackgroundHex()}
    />
  );
}
