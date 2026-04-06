import { cookies } from "next/headers";
import { MuridClient } from "@/components/MuridClient";

export default function MuridPage() {
  const role = cookies().get("pss_role")?.value ?? "admin";
  const canEdit = role !== "coach";
  return <MuridClient canEdit={canEdit} />;
}
