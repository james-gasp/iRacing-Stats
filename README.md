# FOR NOW DOES NOT WORK DUE TO IRACING DATA NOT PUBLICLY AVAILABLE 

See how your iRating stacks up against the field's actual lap times, per series, season, and track.

PaceCheck pulls results from the official iRacing Data API and plots each driver's qualifying, fastest-race-lap, and average-race-lap times against their iRating, with a fitted pace curve so you can see roughly what lap time you "should" be running at a given iRating — and enter your own iRating to see where you fall.

Currently scoped to road series only, other categories are ingested and browsable but not a focus yet.

## Getting started

```bash
npm install
cp .env.example .env   # fill in IRACING_EMAIL / IRACING_PASSWORD
npm run db:migrate     # creates the local SQLite database
npm run ingest         # pulls road-series season/schedule/result data
npm run dev
```
```

## Ideas for later

- **Incidents charts** (you mentioned this already) — same scatter-vs-iRating treatment but for incident count instead of lap time.
- **Per-car breakdown** for multi-class series is already wired up (car filter on the track page) — just needs real ingested data to show up.
- **"All Seasons" / historical trend** — a per-track view of how the pace curve has shifted season over season.
- **Safety rating vs incidents**, or **strength-of-field over a season** (average iRating per week).
- **Optional accounts** — right now iRating lookup is anonymous/stateless by design; if you ever want "track my pace over time" you'd need light auth + storing a cust_id.
- **Caching the Data API's own S3-backed payloads** more aggressively, since re-ingesting a whole season re-fetches every subsession.
- **Postgres + a real host** once you're ready to make this public — Neon/Supabase free tier + Vercel is the lowest-friction combo for this stack.
