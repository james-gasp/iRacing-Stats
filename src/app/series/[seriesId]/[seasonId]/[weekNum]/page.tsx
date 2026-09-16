import Link from "next/link";
import { notFound } from "next/navigation";
import { getRaceWeek, getLapPoints, getCarsForRaceWeek, type LapType } from "@/lib/queries";
import { LapTimeChart } from "@/components/LapTimeChart";

export const dynamic = "force-dynamic";

const LAP_TYPES: LapType[] = ["qualy", "fastest", "average"];

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ seriesId: string; seasonId: string; weekNum: string }>;
  searchParams: Promise<{ car?: string }>;
}) {
  const { seriesId, seasonId, weekNum } = await params;
  const { car } = await searchParams;

  const raceWeek = await getRaceWeek(Number(seasonId), Number(weekNum));
  if (!raceWeek) notFound();

  const cars = await getCarsForRaceWeek(raceWeek.id);
  const carId = car ? Number(car) : undefined;

  const dataByMetric = Object.fromEntries(
    await Promise.all(
      LAP_TYPES.map(async (type) => {
        const laps = await getLapPoints(raceWeek.id, type, carId);
        return [type, laps.map((l) => ({ x: l.irating, y: l.lapTimeMs }))];
      }),
    ),
  ) as Record<LapType, { x: number; y: number }[]>;

  const carName = carId ? cars.find((c) => c.id === carId)?.name : undefined;

  return (
    <div>
      <Link
        href={`/series/${seriesId}/${seasonId}`}
        className="text-sm text-emerald-600 hover:underline"
      >
        &larr; Back to {raceWeek.season.seasonName}
      </Link>
      <h1 className="text-xl font-semibold mt-2">{raceWeek.season.series.name}</h1>
      <p className="text-gray-500 mb-1">
        {raceWeek.season.seasonName} — Week {raceWeek.weekNum + 1}
      </p>
      <p className="text-lg font-medium mb-4">
        {raceWeek.track.name}
        {raceWeek.track.config ? ` (${raceWeek.track.config})` : ""}
      </p>

      {cars.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Link
            href={`/series/${seriesId}/${seasonId}/${weekNum}`}
            className={`text-xs px-2.5 py-1 rounded border ${
              !carId
                ? "bg-emerald-600 text-white border-emerald-600"
                : "border-black/10 dark:border-white/10"
            }`}
          >
            All cars
          </Link>
          {cars.map((c) => (
            <Link
              key={c.id}
              href={`/series/${seriesId}/${seasonId}/${weekNum}?car=${c.id}`}
              className={`text-xs px-2.5 py-1 rounded border ${
                carId === c.id
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-black/10 dark:border-white/10"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <div className="rounded border border-black/10 dark:border-white/10 p-4">
        <LapTimeChart dataByMetric={dataByMetric} carName={carName} />
      </div>
    </div>
  );
}
