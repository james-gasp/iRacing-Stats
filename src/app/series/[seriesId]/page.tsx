import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeasonsForSeries } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}) {
  const { seriesId } = await params;
  const seasons = await getSeasonsForSeries(Number(seriesId));

  if (seasons.length === 0) notFound();

  return (
    <div>
      <Link href="/" className="text-sm text-emerald-600 hover:underline">
        &larr; Back to series
      </Link>
      <h1 className="text-xl font-semibold mt-2 mb-4">{seasons[0].series.name}</h1>

      <div className="rounded border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5">
        {seasons.map((season) => (
          <Link
            key={season.id}
            href={`/series/${season.seriesId}/${season.id}`}
            className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            <span>{season.seasonName}</span>
            {season.active && (
              <span className="text-xs rounded bg-emerald-600 text-white px-2 py-0.5">active</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
