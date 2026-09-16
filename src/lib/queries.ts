import { prisma } from "./db";

export async function getSeriesList(category: string) {
  const series = await prisma.series.findMany({
    where: { category },
    orderBy: { name: "asc" },
    include: {
      seasons: {
        where: { active: true },
        orderBy: { id: "desc" },
        take: 1,
        include: {
          weeks: {
            orderBy: { simulatedStartTime: "desc" },
            take: 1,
            include: { track: true },
          },
        },
      },
    },
  });

  const rows = await Promise.all(
    series.map(async (s) => {
      const season = s.seasons[0];
      const week = season?.weeks[0];
      let driverCount = 0;
      if (week) {
        const distinct = await prisma.lapPoint.findMany({
          where: { raceWeekId: week.id, lapType: "fastest" },
          distinct: ["custId"],
          select: { custId: true },
        });
        driverCount = distinct.length;
      }
      return { series: s, season, week, driverCount };
    }),
  );

  return rows.filter((r) => r.season);
}

export function getSeasonsForSeries(seriesId: number) {
  return prisma.season.findMany({
    where: { seriesId },
    orderBy: [{ year: "desc" }, { quarter: "desc" }],
    include: { series: true },
  });
}

export function getWeeksForSeason(seasonId: number) {
  return prisma.raceWeek.findMany({
    where: { seasonId },
    orderBy: { weekNum: "asc" },
    include: { track: true, season: { include: { series: true } } },
  });
}

export function getRaceWeek(seasonId: number, weekNum: number) {
  return prisma.raceWeek.findUnique({
    where: { seasonId_weekNum: { seasonId, weekNum } },
    include: { track: true, season: { include: { series: true } } },
  });
}

export type LapType = "qualy" | "fastest" | "average";

export function getLapPoints(raceWeekId: number, lapType: LapType, carId?: number) {
  return prisma.lapPoint.findMany({
    where: { raceWeekId, lapType, ...(carId ? { carId } : {}) },
    select: { irating: true, lapTimeMs: true, custId: true },
  });
}

export function getCarsForRaceWeek(raceWeekId: number) {
  return prisma.car.findMany({
    where: { laps: { some: { raceWeekId } } },
    orderBy: { name: "asc" },
  });
}
