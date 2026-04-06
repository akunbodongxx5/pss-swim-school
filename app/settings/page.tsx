import { cookies } from "next/headers";
import { SettingsClient } from "@/components/SettingsClient";
import { ensureSchoolBrandingRow, getSchoolBranding } from "@/lib/school-branding-server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await ensureSchoolBrandingRow();
  const branding = await getSchoolBranding();
  const role = cookies().get("pss_role")?.value === "coach" ? "coach" : "admin";
  return <SettingsClient initialBranding={branding} role={role} />;
}
