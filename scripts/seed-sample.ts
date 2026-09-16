import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  await prisma.series.upsert({
    where: { id: 1 },
    create: { id: 1, name: "Global Mazda MX-5 Fanatec Cup", category: "road" },
    update: {},
  });
  await prisma.season.upsert({
    where: { id: 1001 },
    create: {
      id: 1001,
      seriesId: 1,
      seasonName: "2023 Season 4 Fixed Week 4",
      year: 2023,
      quarter: 4,
      active: true,
      licenseGroup: 2,
    },
    update: {},
  });
  await prisma.track.upsert({
    where: { id: 200 },
    create: { id: 200, name: "WeatherTech Raceway at Laguna Seca", config: "Full Course" },
    update: {},
  });
  const week = await prisma.raceWeek.upsert({
    where: { seasonId_weekNum: { seasonId: 1001, weekNum: 3 } },
    create: { seasonId: 1001, weekNum: 3, trackId: 200, simulatedStartTime: new Date() },
    update: {},
  });
  await prisma.car.upsert({ where: { id: 5 }, create: { id: 5, name: "Mazda MX-5 Cup" }, update: {} });

  const rows = [];
  for (let i = 0; i < 220; i++) {
    const irating = Math.round(200 + Math.random() * 9000);
    const noise = (Math.random() - 0.5) * 6000;
    const base = 95000 + 2_000_000 / (irating + 300);
    for (const [lapType, mult] of [
      ["qualy", 0.985],
      ["fastest", 1],
      ["average", 1.03],
    ] as const) {
      rows.push({
        raceWeekId: week.id,
        carId: 5,
        subsessionId: 900000 + i,
        custId: 500000 + i,
        lapType,
        irating,
        lapTimeMs: Math.max(90000, Math.round(base * mult + noise)),
      });
    }
  }

  for (const row of rows) {
    await prisma.lapPoint.upsert({
      where: {
        subsessionId_custId_lapType_carId: {
          subsessionId: row.subsessionId,
          custId: row.custId,
          lapType: row.lapType,
          carId: row.carId,
        },
      },
      create: row,
      update: row,
    });
  }

  console.log(`Seeded ${rows.length} sample lap points`);
}

main().finally(() => prisma.$disconnect());
