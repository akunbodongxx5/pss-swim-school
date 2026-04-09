import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Sama seperti lib/dates calendarDateFromIso — tengah hari UTC per tanggal kalender. */
function calendarDate(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) throw new Error(`Tanggal invalid: ${isoDate}`);
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo, d, 12, 0, 0, 0));
}

function addDaysIso(iso, days) {
  const dt = calendarDate(iso);
  dt.setUTCDate(dt.getUTCDate() + days);
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const da = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Tgl 29–31 = ekor bulan (default libur di app); seed pakai maks tgl 28 bulan itu. */
function clampIsoToMaxDom28(iso) {
  const dom = Number(iso.slice(8, 10));
  if (dom <= 28) return iso;
  return addDaysIso(iso, 28 - dom);
}

function sessionDate(iso) {
  return calendarDate(clampIsoToMaxDom28(iso));
}

/**
 * Senin mulai jadwal dummy: minggu depan relatif hari ini WIB (supaya mayoritas slot
 * masih di depan dan masuk rentang "hari ini + 13 hari" di UI).
 */
function nextMondayIsoWib() {
  const todayIso = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const base = calendarDate(todayIso);
  const w = base.getUTCDay();
  const daysUntilMon = w === 0 ? 1 : w === 1 ? 7 : 8 - w;
  base.setUTCDate(base.getUTCDate() + daysUntilMon);
  const y = base.getUTCFullYear();
  const mo = String(base.getUTCMonth() + 1).padStart(2, "0");
  const da = String(base.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

const WEEKS = 3;
const SCHOOL_ID = 1;

async function main() {
  await prisma.schoolBranding.upsert({
    where: { id: 1 },
    create: { id: 1, schoolName: "PSS Swim School", logoDataUrl: null },
    update: {},
  });

  await prisma.scheduledSession.deleteMany({});
  await prisma.conflictPair.deleteMany({});
  await prisma.waitlistEntry.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.coach.deleteMany({});
  await prisma.sessionBundleDefinition.deleteMany({ where: { schoolId: SCHOOL_ID } });
  await prisma.swimLevel.deleteMany({ where: { schoolId: SCHOOL_ID } });

  for (let i = 1; i <= 9; i++) {
    await prisma.swimLevel.create({
      data: { schoolId: SCHOOL_ID, sortOrder: i, name: `Level ${i}` },
    });
  }

  const levels = await prisma.swimLevel.findMany({
    where: { schoolId: SCHOOL_ID },
    orderBy: { sortOrder: "asc" },
  });
  const idByOrder = (n) => levels.find((l) => l.sortOrder === n).id;

  const bundleMixed13 = await prisma.sessionBundleDefinition.create({
    data: {
      schoolId: SCHOOL_ID,
      slug: "MIXED_1_3",
      name: "Level 1–3",
      sortOrder: 1,
      levelIds: JSON.stringify([1, 2, 3].map(idByOrder)),
      allowedLanesJson: JSON.stringify([1]),
      maxStudents1Coach: 10,
      maxStudents2Coach: 13,
      maxConcurrentSessionsOnLane1: 2,
    },
  });

  const bundle4 = await prisma.sessionBundleDefinition.create({
    data: {
      schoolId: SCHOOL_ID,
      slug: "LEVEL_4",
      name: "Level 4",
      sortOrder: 2,
      levelIds: JSON.stringify([idByOrder(4)]),
      allowedLanesJson: JSON.stringify([2, 3, 4]),
      maxStudents1Coach: 10,
      maxStudents2Coach: 13,
      maxConcurrentSessionsOnLane1: null,
    },
  });

  const bundle56 = await prisma.sessionBundleDefinition.create({
    data: {
      schoolId: SCHOOL_ID,
      slug: "MIXED_5_6",
      name: "Level 5–6",
      sortOrder: 3,
      levelIds: JSON.stringify([5, 6].map(idByOrder)),
      allowedLanesJson: JSON.stringify([2, 3, 4]),
      maxStudents1Coach: 10,
      maxStudents2Coach: 13,
      maxConcurrentSessionsOnLane1: null,
    },
  });

  const bundle7 = await prisma.sessionBundleDefinition.create({
    data: {
      schoolId: SCHOOL_ID,
      slug: "LEVEL_7",
      name: "Level 7",
      sortOrder: 4,
      levelIds: JSON.stringify([idByOrder(7)]),
      allowedLanesJson: JSON.stringify([2, 3, 4]),
      maxStudents1Coach: 10,
      maxStudents2Coach: 13,
      maxConcurrentSessionsOnLane1: null,
    },
  });

  const bundle89 = await prisma.sessionBundleDefinition.create({
    data: {
      schoolId: SCHOOL_ID,
      slug: "MIXED_8_9",
      name: "Level 8–9",
      sortOrder: 5,
      levelIds: JSON.stringify([8, 9].map(idByOrder)),
      allowedLanesJson: JSON.stringify([2, 3, 4]),
      maxStudents1Coach: 10,
      maxStudents2Coach: 13,
      maxConcurrentSessionsOnLane1: null,
    },
  });

  const coachSpecs = [
    { name: "Pelatih A", orders: [1, 2, 3, 4] },
    { name: "Pelatih P", orders: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { name: "Pelatih B", orders: [1, 2, 3, 4, 5] },
    { name: "Pelatih Ay", orders: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { name: "Pelatih N", orders: [4, 5, 6] },
  ];

  for (const c of coachSpecs) {
    const ids = c.orders.map(idByOrder);
    await prisma.coach.create({
      data: {
        name: c.name,
        teachLevels: JSON.stringify(ids),
        traineeLevels: "[]",
      },
    });
  }

  const coachAy = await prisma.coach.findFirstOrThrow({ where: { name: "Pelatih Ay" } });

  const studentRows = [
    { name: "Aisha Putri", order: 1 },
    { name: "Bima Pratama", order: 2 },
    { name: "Citra Lestari", order: 3 },
    { name: "Dimas Wijaya", order: 4 },
    { name: "Erika Santoso", order: 5 },
    { name: "Fajar Hidayat", order: 6 },
    { name: "Gita Mahendra", order: 7 },
    { name: "Hadi Gunawan", order: 8 },
    { name: "Indah Permata", order: 9 },
  ];

  for (const s of studentRows) {
    await prisma.student.create({
      data: { name: s.name, levelId: idByOrder(s.order) },
    });
  }

  const students = await prisma.student.findMany({
    include: { swimLevel: true },
    orderBy: { swimLevel: { sortOrder: "asc" } },
  });
  const byOrder = (n) => students.find((s) => s.swimLevel.sortOrder === n).id;

  const baseMonday = nextMondayIsoWib();

  for (let w = 0; w < WEEKS; w++) {
    const mon = addDaysIso(baseMonday, w * 7);
    const tue = addDaysIso(mon, 1);
    const wed = addDaysIso(mon, 2);
    const thu = addDaysIso(mon, 3);
    const fri = addDaysIso(mon, 4);
    const sat = addDaysIso(mon, 5);

    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(mon),
        hour: 14,
        lane: 1,
        bundleId: bundleMixed13.id,
        coachPrimaryId: coachAy.id,
        enrollments: {
          create: [{ studentId: byOrder(1) }, { studentId: byOrder(2) }, { studentId: byOrder(3) }],
        },
      },
    });

    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(wed),
        hour: 14,
        lane: 2,
        bundleId: bundle4.id,
        coachPrimaryId: coachAy.id,
        enrollments: { create: [{ studentId: byOrder(4) }] },
      },
    });

    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(tue),
        hour: 15,
        lane: 2,
        bundleId: bundle56.id,
        coachPrimaryId: coachAy.id,
        enrollments: { create: [{ studentId: byOrder(5) }, { studentId: byOrder(6) }] },
      },
    });
    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(fri),
        hour: 14,
        lane: 3,
        bundleId: bundle56.id,
        coachPrimaryId: coachAy.id,
        enrollments: { create: [{ studentId: byOrder(5) }, { studentId: byOrder(6) }] },
      },
    });

    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(wed),
        hour: 16,
        lane: 3,
        bundleId: bundle7.id,
        coachPrimaryId: coachAy.id,
        enrollments: { create: [{ studentId: byOrder(7) }] },
      },
    });
    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(fri),
        hour: 17,
        lane: 4,
        bundleId: bundle7.id,
        coachPrimaryId: coachAy.id,
        enrollments: { create: [{ studentId: byOrder(7) }] },
      },
    });

    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(thu),
        hour: 15,
        lane: 2,
        bundleId: bundle89.id,
        coachPrimaryId: coachAy.id,
        enrollments: { create: [{ studentId: byOrder(8) }, { studentId: byOrder(9) }] },
      },
    });
    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(sat),
        hour: 10,
        lane: 2,
        bundleId: bundle89.id,
        coachPrimaryId: coachAy.id,
        enrollments: { create: [{ studentId: byOrder(8) }, { studentId: byOrder(9) }] },
      },
    });
  }

  const sessionCount = await prisma.scheduledSession.count();

  console.log(
    `Seed: ${students.length} murid, ${sessionCount} sesi jadwal (${WEEKS} minggu), 9 level + 5 bundle. ` +
      "L1–4: 1×/minggu; L5–9: 2×/minggu."
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
