import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PelatihView } from "@/components/PelatihView";

export default async function PelatihPage() {
  const jar = await cookies();
  const role = jar.get("pss_role")?.value ?? "admin";
  const canEdit = role !== "coach";
  const rows = await prisma.coach.findMany({ orderBy: { name: "asc" } });
  const coaches = rows.map((c) => ({
    id: c.id,
    name: c.name,
    teachLevels: c.teachLevels,
    traineeLevels: c.traineeLevels ?? "[]",
  }));
  return <PelatihView initialCoaches={coaches} canEdit={canEdit} />;
}
