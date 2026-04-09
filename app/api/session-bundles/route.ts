import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SCHOOL_ID = 1;

export async function GET() {
  const bundles = await prisma.sessionBundleDefinition.findMany({
    where: { schoolId: SCHOOL_ID },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(bundles);
}

export async function POST(req: Request) {
  const jar = await cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    slug?: string;
    levelIds?: string[];
    allowedLanes?: number[];
    maxStudents1Coach?: number;
    maxStudents2Coach?: number;
    maxConcurrentSessionsOnLane1?: number | null;
    sortOrder?: number;
  };

  const name = body.name?.trim();
  const slug = body.slug?.trim().replace(/\s+/g, "_");
  if (!name || !slug) return NextResponse.json({ error: "Nama dan slug bundle wajib." }, { status: 400 });
  if (!Array.isArray(body.levelIds) || body.levelIds.length === 0) {
    return NextResponse.json({ error: "Pilih minimal satu level untuk bundle." }, { status: 400 });
  }
  if (!Array.isArray(body.allowedLanes) || body.allowedLanes.length === 0) {
    return NextResponse.json({ error: "Lintasan yang diizinkan wajib diisi." }, { status: 400 });
  }

  const levels = await prisma.swimLevel.findMany({
    where: { schoolId: SCHOOL_ID, id: { in: body.levelIds } },
  });
  if (levels.length !== body.levelIds.length) {
    return NextResponse.json({ error: "Ada level id yang tidak dikenal." }, { status: 400 });
  }

  const max1 = body.maxStudents1Coach ?? 10;
  const max2 = body.maxStudents2Coach ?? 13;
  if (max1 < 1 || max2 < 1) {
    return NextResponse.json({ error: "Kapasitas tidak valid." }, { status: 400 });
  }

  const count = await prisma.sessionBundleDefinition.count({ where: { schoolId: SCHOOL_ID } });
  const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : count + 1;

  const created = await prisma.sessionBundleDefinition
    .create({
      data: {
        schoolId: SCHOOL_ID,
        slug,
        name,
        sortOrder,
        levelIds: JSON.stringify(body.levelIds),
        allowedLanesJson: JSON.stringify(body.allowedLanes),
        maxStudents1Coach: max1,
        maxStudents2Coach: max2,
        maxConcurrentSessionsOnLane1:
          body.maxConcurrentSessionsOnLane1 === null || body.maxConcurrentSessionsOnLane1 === undefined
            ? null
            : body.maxConcurrentSessionsOnLane1,
      },
    })
    .catch(() => null);

  if (!created) {
    return NextResponse.json({ error: "Slug bundle sudah dipakai atau gagal menyimpan." }, { status: 400 });
  }
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const jar = await cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Parameter id wajib." }, { status: 400 });

  const body = (await req.json()) as {
    name?: string;
    slug?: string;
    levelIds?: string[];
    allowedLanes?: number[];
    maxStudents1Coach?: number;
    maxStudents2Coach?: number;
    maxConcurrentSessionsOnLane1?: number | null;
    sortOrder?: number;
  };

  const existing = await prisma.sessionBundleDefinition.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Bundle tidak ditemukan." }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const n = body.name.trim();
    if (!n) return NextResponse.json({ error: "Nama tidak boleh kosong." }, { status: 400 });
    data.name = n;
  }
  if (body.slug !== undefined) {
    data.slug = body.slug.trim().replace(/\s+/g, "_") || existing.slug;
  }
  if (body.levelIds !== undefined) {
    if (!Array.isArray(body.levelIds) || body.levelIds.length === 0) {
      return NextResponse.json({ error: "Minimal satu level." }, { status: 400 });
    }
    const levels = await prisma.swimLevel.findMany({
      where: { schoolId: SCHOOL_ID, id: { in: body.levelIds } },
    });
    if (levels.length !== body.levelIds.length) {
      return NextResponse.json({ error: "Ada level id yang tidak dikenal." }, { status: 400 });
    }
    data.levelIds = JSON.stringify(body.levelIds);
  }
  if (body.allowedLanes !== undefined) {
    if (!Array.isArray(body.allowedLanes) || body.allowedLanes.length === 0) {
      return NextResponse.json({ error: "Lintasan wajib diisi." }, { status: 400 });
    }
    data.allowedLanesJson = JSON.stringify(body.allowedLanes);
  }
  if (body.maxStudents1Coach !== undefined) data.maxStudents1Coach = body.maxStudents1Coach;
  if (body.maxStudents2Coach !== undefined) data.maxStudents2Coach = body.maxStudents2Coach;
  if (body.maxConcurrentSessionsOnLane1 !== undefined) {
    data.maxConcurrentSessionsOnLane1 = body.maxConcurrentSessionsOnLane1;
  }
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }

  const updated = await prisma.sessionBundleDefinition.update({ where: { id }, data }).catch(() => null);
  if (!updated) return NextResponse.json({ error: "Gagal menyimpan." }, { status: 400 });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const jar = await cookies();
  if ((jar.get("pss_role")?.value ?? "admin") !== "admin") {
    return NextResponse.json({ error: "Hanya admin." }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Parameter id wajib." }, { status: 400 });

  const n = await prisma.scheduledSession.count({ where: { bundleId: id } });
  if (n > 0) {
    return NextResponse.json({ error: `Bundle masih dipakai ${n} sesi jadwal.` }, { status: 409 });
  }

  await prisma.sessionBundleDefinition.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
