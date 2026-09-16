import Link from "next/link";
import { getSeriesList } from "@/lib/queries";
import { licenseLetter, LICENSE_COLORS } from "@/lib/license";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { value: "road", label: "Road" },
  { value: "oval", label: "Oval" },
  { value: "dirt_road", label: "Dirt Road" },
  { value: "dirt_oval", label: "Dirt Oval" },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const category = params.category ?? "road";
  const q = (params.q ?? "").toLowerCase();

  const rows = await getSeriesList(category);
  const filtered = q
    ? rows.filter(
        (r) =>
          r.series.name.toLowerCase().includes(q) ||
          r.week?.track.name.toLowerCase().includes(q),
      )
    : rows;

  return (
    <div>
      <nav className="flex gap-2 mb-4">
        {CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={`/?category=${c.value}`}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              category === c.value
                ? "bg-emerald-600 text-white border-emerald-600"
                : "border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      <form className="mb-4">
        <input type="hidden" name="category" value={category} />
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search series or track..."
          className="w-full max-w-sm rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-1.5 text-sm"
        />
      </form>

      <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-black/5 dark:bg-white/5 text-left">
            <tr>
              <th className="px-3 py-2 w-8">L</th>
              <th className="px-3 py-2">Season</th>
              <th className="px-3 py-2">Track</th>
              <th className="px-3 py-2 text-right">Drivers</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ series, season, week, driverCount }) => {
              const letter = licenseLetter(season?.licenseGroup);
              return (
                <tr key={series.id} className="border-t border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5">
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded text-white text-xs font-semibold ${LICENSE_COLORS[letter] ?? "bg-gray-400"}`}
                    >
                      {letter}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/series/${series.id}`} className="hover:underline font-medium">
                      {series.name}
                    </Link>
                    <span className="text-gray-500"> — {season?.seasonName}</span>
                  </td>
                  <td className="px-3 py-2">
                    {week ? (
                      <Link
                        href={`/series/${series.id}/${season!.id}/${week.weekNum}`}
                        className="hover:underline"
                      >
                        {week.track.name}
                        {week.track.config ? ` (${week.track.config})` : ""}
                      </Link>
                    ) : (
                      <span className="text-gray-400">no data yet</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{driverCount || "-"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                  No series ingested yet for this category. Run <code>npm run ingest</code> after adding your
                  iRacing credentials to <code>.env</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
