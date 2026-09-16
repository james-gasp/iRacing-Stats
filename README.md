# PaceCheck

See how your iRating stacks up against the field's actual lap times, per series, season, and track.

PaceCheck pulls results from the official iRacing Data API and plots each driver's qualifying, fastest-race-lap, and average-race-lap times against their iRating, with a fitted pace curve so you can see roughly what lap time you "should" be running at a given iRating — and enter your own iRating to see where you fall.

Currently scoped to road series only; other categories (oval, dirt road, dirt oval) are ingested and browsable but not a focus yet.

## Stack

- Next.js 16 (App Router) + TypeScript, Tailwind for styling
- SQLite via Prisma for local dev (swap the datasource to Postgres for production — see `prisma/schema.prisma`)
- A small custom SVG chart (`src/components/LapTimeChart.tsx`) instead of a charting library, so the hover-crosshair / "predicted vs real" readout and the iRating self-lookup behave exactly like the old iRacingStats.net UI
- A standalone ingest script (`scripts/ingest.ts`) that talks to `members-ng.iracing.com`'s Data API using your own iRacing login

## Getting started

```bash
npm install
cp .env.example .env   # fill in IRACING_EMAIL / IRACING_PASSWORD
npm run db:migrate     # creates the local SQLite database
npm run ingest         # pulls road-series season/schedule/result data
npm run dev
```

Then open http://localhost:3000.

To poke at the UI without real credentials, `npx tsx scripts/seed-sample.ts` seeds one fake series/track with synthetic lap data.

## How ingestion works

`scripts/ingest.ts`:

1. Fetches all road-category series/seasons via `/data/series/seasons` and upserts `Series` / `Season` / `Track` / `RaceWeek` rows for every week that has already started.
2. For each race week, calls `/data/results/search_series` to list that week's subsessions, then `/data/results/get` for each subsession to pull per-driver iRating + qualify/fastest/average lap times, and upserts them as `LapPoint` rows (deduped on subsession+driver+lap type+car).
3. Records an `IngestRun` per race week so partial failures are visible.

**Worth knowing:** the Data API's exact endpoint/field names are documented at `https://members-ng.iracing.com/data/doc` (requires a logged-in iRacing session) and iRacing does occasionally tweak them. The client and ingest script were written against the documented shape but haven't been run against a live account yet — if a call 404s or a field comes back `undefined`, that page is the first place to check. `src/lib/iracing-client.ts` centralizes auth + the two-step "follow the `link`" fetch pattern the API uses, and rate-limits requests, so fixes should mostly be scoped to `scripts/ingest.ts` and `src/lib/iracing-types.ts`.

Re-running `npm run ingest` is safe — everything is upserted, so it just fills in new weeks/subsessions.

For staying current week-to-week, run it on a schedule (cron, a GitHub Action, Vercel Cron, etc.) once you've picked a host.

## Project structure

```
prisma/schema.prisma        # Series -> Season -> RaceWeek -> LapPoint
src/lib/iracing-client.ts   # Data API auth + fetch wrapper
src/lib/iracing-types.ts    # Data API response shapes we rely on
src/lib/regression.ts       # power-curve fit (y = a * iRating^b) + lap time formatting
src/lib/queries.ts          # Prisma queries used by the pages
src/components/LapTimeChart.tsx  # scatter + fitted curve + hover/lookup
src/app/                    # series list -> season -> week -> track chart
scripts/ingest.ts           # data pull, run manually or on a schedule
scripts/seed-sample.ts      # fake data for local UI testing
```

## Ideas for later

- **Incidents charts** (you mentioned this already) — same scatter-vs-iRating treatment but for incident count instead of lap time.
- **Per-car breakdown** for multi-class series is already wired up (car filter on the track page) — just needs real ingested data to show up.
- **"All Seasons" / historical trend** — a per-track view of how the pace curve has shifted season over season.
- **Safety rating vs incidents**, or **strength-of-field over a season** (average iRating per week).
- **Optional accounts** — right now iRating lookup is anonymous/stateless by design; if you ever want "track my pace over time" you'd need light auth + storing a cust_id.
- **Caching the Data API's own S3-backed payloads** more aggressively, since re-ingesting a whole season re-fetches every subsession.
- **Postgres + a real host** once you're ready to make this public — Neon/Supabase free tier + Vercel is the lowest-friction combo for this stack.
