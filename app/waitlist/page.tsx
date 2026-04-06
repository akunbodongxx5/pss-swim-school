import { cookies } from "next/headers";
import { WaitlistClient } from "@/components/WaitlistClient";

export default function WaitlistPage() {
  const role = cookies().get("pss_role")?.value ?? "admin";
  const canEdit = role !== "coach";
  return <WaitlistClient canEdit={canEdit} />;
}
