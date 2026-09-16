/**
 * Pulls road-series season/schedule/result data from the iRacing Data API
 * and upserts it into the local database.
 *
 * Run with: npm run ingest
 *
 * NOTE ON THE DATA API SHAPE: the endpoint paths and field names below
 * (/data/series/seasons, /data/results/search_series, /data/results/get)
 * reflect the documented iRacing Data API, but iRacing evolves this API and
 * the interactive reference at https://members-ng.iracing.com/data/doc
 * (requires a logged-in iRacing session) is the source of truth. If a call
 * here 404s or comes back with an unexpected shape, check that page first —
 * param names occasionally change between fields like `race_week_num` vs
 * `raceweek`, or `season_id` vs `season_year`+`season_quarter`.
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { getIracingClient } from "../src/lib/iracing-client";
import type {
  SearchSeriesResponse,
  SeriesSeason,
  SeriesSeasonsResponse,
  SubsessionResult,
} from "../src/lib/iracing-types";

const ROAD_ONLY = true;

// iRacing lap-time fields are in hundredths of a millisecond (1/10000 s).
function iracingTimeToMs(value: number | null | undefined): number | null {
  if (value === null || value === undefined || value < 0) return null;
  return Math.round(value / 10);
}

async function upsertSeasonAndSchedule(season: SeriesSeason) {
  await prisma.series.upsert({
    where: { id: season.series_id },
    create: { id: season.series_id, name: season.series_name, category: season.category },
    update: { name: season.series_name, category: season.category },
  });

  await prisma.season.upsert({
    where: { id: season.season_id },
    create: {
      id: season.season_id,
      seriesId: season.series_id,
      seasonName: season.season_name,
      year: season.season_year,
      quarter: season.season_quarter,
      active: season.active,
      fixedSetup: season.fixed_setup,
      licenseGroup: season.license_group,
    },
    update: {
      seasonName: season.season_name,
      active: season.active,
      licenseGroup: season.license_group,
    },
  });

  const now = new Date();
  const raceWeekIdByWeekNum = new Map<number, number>();

  for (const schedule of season.schedules) {
    const startDate = new Date(schedule.start_date);
    if (startDate > now) continue; // only ingest weeks that have already run

    await prisma.track.upsert({
      where: { id: schedule.track.track_id },
      create: {
        id: schedule.track.track_id,
        name: schedule.track.track_name,
        config: schedule.track.config_name,
      },
      update: {},
    });

    const raceWeek = await prisma.raceWeek.upsert({
      where: { seasonId_weekNum: { seasonId: season.season_id, weekNum: schedule.race_week_num } },
      create: {
        seasonId: season.season_id,
        weekNum: schedule.race_week_num,
        trackId: schedule.track.track_id,
        simulatedStartTime: startDate,
      },
      update: {
        trackId: schedule.track.track_id,
        simulatedStartTime: startDate,
      },
    });

    raceWeekIdByWeekNum.set(schedule.race_week_num, raceWeek.id);
  }

  return raceWeekIdByWeekNum;
}

async function ingestRaceWeek(season: SeriesSeason, weekNum: number, raceWeekId: number) {
  const client = getIracingClient();

  const search = await client.get<SearchSeriesResponse>("/data/results/search_series", {
    season_year: season.season_year,
    season_quarter: season.season_quarter,
    series_id: season.series_id,
    race_week_num: weekNum,
    official_only: true,
  });

  const subsessionIds = (search.results ?? []).map((r) => r.subsession_id);
  let processed = 0;

  for (const subsessionId of subsessionIds) {
    try {
      const result = await client.get<SubsessionResult>("/data/results/get", {
        subsession_id: subsessionId,
      });

      const qualify = result.session_results.find((s) => s.simsession_name === "QUALIFY");
      const race = result.session_results.find((s) => s.simsession_name === "RACE");

      const rows: {
        subsessionId: number;
        custId: number;
        carId: number;
        lapType: "qualy" | "fastest" | "average";
        irating: number;
        lapTimeMs: number;
      }[] = [];

      for (const driver of qualify?.results ?? []) {
        const ms = iracingTimeToMs(driver.best_lap_time);
        if (ms && driver.oldi_rating) {
          rows.push({
            subsessionId,
            custId: driver.cust_id,
            carId: driver.car_id,
            lapType: "qualy",
            irating: driver.oldi_rating,
            lapTimeMs: ms,
          });
        }
      }

      for (const driver of race?.results ?? []) {
        if (!driver.oldi_rating) continue;
        const fastest = iracingTimeToMs(driver.best_lap_time);
        const average = iracingTimeToMs(driver.average_lap);
        if (fastest) {
          rows.push({
            subsessionId,
            custId: driver.cust_id,
            carId: driver.car_id,
            lapType: "fastest",
            irating: driver.oldi_rating,
            lapTimeMs: fastest,
          });
        }
        if (average) {
          rows.push({
            subsessionId,
            custId: driver.cust_id,
            carId: driver.car_id,
            lapType: "average",
            irating: driver.oldi_rating,
            lapTimeMs: average,
          });
        }
      }

      for (const row of rows) {
        await prisma.car.upsert({
          where: { id: row.carId },
          create: { id: row.carId, name: `Car ${row.carId}` },
          update: {},
        });

        await prisma.lapPoint.upsert({
          where: {
            subsessionId_custId_lapType_carId: {
              subsessionId: row.subsessionId,
              custId: row.custId,
              lapType: row.lapType,
              carId: row.carId,
            },
          },
          create: { ...row, raceWeekId },
          update: { irating: row.irating, lapTimeMs: row.lapTimeMs },
        });
      }

      processed++;
    } catch (err) {
      console.error(`  subsession ${subsessionId} failed:`, (err as Error).message);
    }
  }

  await prisma.ingestRun.create({
    data: {
      raceWeekId,
      subsessionsProcessed: processed,
      status: processed === subsessionIds.length ? "ok" : "partial",
    },
  });

  console.log(`  week ${weekNum}: ${processed}/${subsessionIds.length} subsessions ingested`);
}

async function main() {
  const client = getIracingClient();
  const response = await client.get<SeriesSeasonsResponse>("/data/series/seasons", {
    include_series: true,
  });

  const seasons = response.seasons.filter((s) => (ROAD_ONLY ? s.category === "road" : true));
  console.log(`Found ${seasons.length} road-category seasons`);

  for (const season of seasons) {
    console.log(`\n${season.series_name} — ${season.season_name}`);
    const raceWeekIdByWeekNum = await upsertSeasonAndSchedule(season);

    for (const [weekNum, raceWeekId] of raceWeekIdByWeekNum) {
      await ingestRaceWeek(season, weekNum, raceWeekId);
    }
  }

  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
