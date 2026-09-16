import Link from "next/link";
import { notFound } from "next/navigation";
import { getWeeksForSeason } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ seriesId: string; seasonId: string }>;
}) {
  const { seriesId, seasonId } = await params;
  const weeks = await getWeeksForSeason(Number(seasonId));

  if (weeks.length === 0) notFound();

  const season = weeks[0].season;

  return (
    <div>
      <Link href={`/series/${seriesId}`} className="text-sm text-emerald-600 hover:underline">
        &larr; Back to {season.series.name}
      </Link>
      <h1 className="text-xl font-semibold mt-2 mb-4">
        {season.series.name} — {season.seasonName}
      </h1>

      <div className="rounded border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5">
        {weeks.map((week) => (
          <Link
            key={week.id}
            href={`/series/${seriesId}/${seasonId}/${week.weekNum}`}
            className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            <span>Week {week.weekNum + 1}</span>
            <span className="text-gray-500">
              {week.track.name}
              {week.track.config ? ` (${week.track.config})` : ""}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
