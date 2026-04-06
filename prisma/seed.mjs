import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const coaches = [
  { name: "Pelatih A", teachLevels: "[1,2,3,4]" },
  { name: "Pelatih P", teachLevels: "[1,2,3,4,5,6,7,8,9]" },
  { name: "Pelatih B", teachLevels: "[1,2,3,4,5]" },
  { name: "Pelatih Ay", teachLevels: "[1,2,3,4,5,6,7,8,9]" },
  { name: "Pelatih N", teachLevels: "[4,5,6]" },
];

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
  const w = base.getUTCDay(); // 0=Min … 6=Sab
  const daysUntilMon = w === 0 ? 1 : w === 1 ? 7 : 8 - w;
  base.setUTCDate(base.getUTCDate() + daysUntilMon);
  const y = base.getUTCFullYear();
  const mo = String(base.getUTCMonth() + 1).padStart(2, "0");
  const da = String(base.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

const WEEKS = 3;

async function main() {
  await prisma.scheduledSession.deleteMany({});
  await prisma.conflictPair.deleteMany({});
  await prisma.waitlistEntry.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.coach.deleteMany({});

  await prisma.coach.createMany({ data: coaches });

  const coachAy = await prisma.coach.findFirstOrThrow({ where: { name: "Pelatih Ay" } });

  const studentRows = [
    { name: "Aisha Putri", level: 1 },
    { name: "Bima Pratama", level: 2 },
    { name: "Citra Lestari", level: 3 },
    { name: "Dimas Wijaya", level: 4 },
    { name: "Erika Santoso", level: 5 },
    { name: "Fajar Hidayat", level: 6 },
    { name: "Gita Mahendra", level: 7 },
    { name: "Hadi Gunawan", level: 8 },
    { name: "Indah Permata", level: 9 },
  ];
  await prisma.student.createMany({ data: studentRows });

  const students = await prisma.student.findMany({ orderBy: { level: "asc" } });
  const byLevel = Object.fromEntries(students.map((s) => [s.level, s]));

  const L = (n) => byLevel[n].id;

  const baseMonday = nextMondayIsoWib();

  for (let w = 0; w < WEEKS; w++) {
    const mon = addDaysIso(baseMonday, w * 7);
    const tue = addDaysIso(mon, 1);
    const wed = addDaysIso(mon, 2);
    const thu = addDaysIso(mon, 3);
    const fri = addDaysIso(mon, 4);
    const sat = addDaysIso(mon, 5);

    // Level 1–3: 1× / minggu (gabung MIXED_1_3)
    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(mon),
        hour: 14,
        lane: 1,
        bundle: "MIXED_1_3",
        coachPrimaryId: coachAy.id,
        enrollments: {
          create: [{ studentId: L(1) }, { studentId: L(2) }, { studentId: L(3) }],
        },
      },
    });

    // Level 4: 1× / minggu
    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(wed),
        hour: 14,
        lane: 2,
        bundle: "LEVEL_4",
        coachPrimaryId: coachAy.id,
        enrollments: { create: [{ studentId: L(4) }] },
      },
    });

    // Level 5–6: 2× / minggu (kelas gabungan)
    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(tue),
        hour: 15,
        lane: 2,
        bundle: "MIXED_5_6",
        coachPrimaryId: coachAy.id,
        enrollments: { create: [{ studentId: L(5) }, { studentId: L(6) }] },
      },
    });
    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(fri),
        hour: 14,
        lane: 3,
        bundle: "MIXED_5_6",
        coachPrimaryId: coachAy.id,
        enrollments: { create: [{ studentId: L(5) }, { studentId: L(6) }] },
      },
    });

    // Level 7: 2× / minggu
    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(wed),
        hour: 16,
        lane: 3,
        bundle: "LEVEL_7",
        coachPrimaryId: coachAy.id,
        enrollments: { create: [{ studentId: L(7) }] },
      },
    });
    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(fri),
        hour: 17,
        lane: 4,
        bundle: "LEVEL_7",
        coachPrimaryId: coachAy.id,
        enrollments: { create: [{ studentId: L(7) }] },
      },
    });

    // Level 8–9: 2× / minggu (gabung MIXED_8_9)
    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(thu),
        hour: 15,
        lane: 2,
        bundle: "MIXED_8_9",
        coachPrimaryId: coachAy.id,
        enrollments: { create: [{ studentId: L(8) }, { studentId: L(9) }] },
      },
    });
    await prisma.scheduledSession.create({
      data: {
        date: sessionDate(sat),
        hour: 10,
        lane: 2,
        bundle: "MIXED_8_9",
        coachPrimaryId: coachAy.id,
        enrollments: { create: [{ studentId: L(8) }, { studentId: L(9) }] },
      },
    });
  }

  const sessionCount = await prisma.scheduledSession.count();

  await prisma.schoolBranding.upsert({
    where: { id: 1 },
    create: { id: 1, schoolName: "PSS Swim School", logoDataUrl: null },
    update: {},
  });

  console.log(
    `Seed: ${students.length} murid (nama + level 1–9), ${sessionCount} sesi jadwal (${WEEKS} minggu). ` +
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
