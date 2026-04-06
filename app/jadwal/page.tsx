import { cookies } from "next/headers";
import { JadwalClient } from "@/components/JadwalClient";

export default function JadwalPage() {
  const role = cookies().get("pss_role")?.value ?? "admin";
  const canEdit = role !== "coach";
  return <JadwalClient canEdit={canEdit} />;
}
