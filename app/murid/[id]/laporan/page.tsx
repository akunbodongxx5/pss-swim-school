import { notFound } from "next/navigation";
import { MuridLaporanClient } from "@/components/MuridLaporanClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MuridLaporanPage({ params }: { params: { id: string } }) {
  const student = await prisma.student.findUnique({
    where: { id: params.id },
    select: { id: true, name: true },
  });
  if (!student) notFound();

  return <MuridLaporanClient studentId={student.id} studentName={student.name} />;
}
