import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PelatihView } from "@/components/PelatihView";

export default async function PelatihPage() {
  const role = cookies().get("pss_role")?.value ?? "admin";
  const canEdit = role !== "coach";
  const coaches = await prisma.coach.findMany({ orderBy: { name: "asc" } });
  return <PelatihView initialCoaches={coaches} canEdit={canEdit} />;
}
