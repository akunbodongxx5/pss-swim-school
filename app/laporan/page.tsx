import { cookies } from "next/headers";
import { LaporanClient } from "@/components/LaporanClient";
import { getSchoolBranding } from "@/lib/school-branding-server";

export const dynamic = "force-dynamic";

export default async function LaporanPage() {
  const branding = await getSchoolBranding();
  const role = cookies().get("pss_role")?.value === "coach" ? "coach" : "admin";
  const coachId = cookies().get("pss_coach_id")?.value ?? null;

  return (
    <LaporanClient role={role} adminCanWrite={branding.adminCanWriteStudentReports} initialCoachId={coachId} />
  );
}
