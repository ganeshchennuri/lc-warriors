# LC Warriors

LeetCode 75 tracker for Raj, Ganesh and Arbaaz: today's problems, backlog, revisits, per-problem shared notes, and a resources page of videos, playlists and articles. Next.js 16 + Postgres (Neon) on Vercel.

**Full handbook (setup elsewhere, operations, decisions, changelog): [PROJECT.md](PROJECT.md).**

- Pick yourself on the `$ whoami` screen (remembered in this browser; switch from the header chip).
- A "day" runs 06:00–06:00 IST.
- The Google Sheet owns the schedule (synced via Problems → Upload sheet); statuses and comments are edited on the site.

## Local development

```bash
npm install
# any Postgres works; for a throwaway local one without Docker:
npx pglite-server -d ./.pgdata -p 54329 -m 10
echo 'DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres?sslmode=disable' > .env.local
set -a && source .env.local && set +a && npm run db:migrate && npm run db:seed   # seeds from data/tracker.csv
npm run dev
```

`npm test` runs the Vitest suite (uses in-memory PGlite, no database needed).

## Deploy (Vercel + Neon)

1. `npx vercel login` and `npx vercel link`
2. Vercel dashboard → project → Storage → add **Neon** (Marketplace) and connect it. This sets `DATABASE_URL`.
3. `npx vercel env pull .env.local`
4. `set -a && source .env.local && set +a && npm run db:migrate && npm run db:seed`
5. `npx vercel --prod`

The seed refuses to run on a non-empty database, so re-running it is safe.

## Updating from the Google Sheet

Download the sheet as CSV, then on the site go to **Problems → Upload sheet**. It shows what will change (new problems and tasks, rescheduled or removed tasks, status changes) and writes only after you press **Apply**.

The same from the terminal:

```bash
npm run db:sync -- "<downloaded>.csv"            # dry run
npm run db:sync -- "<downloaded>.csv" --apply    # write
```

The sheet owns the schedule: new problems and tasks are added, and tasks no longer in the sheet are removed along with their statuses. Comments belong to problems and are never touched. A status from the sheet is applied only if that cell changed since the last upload (kept in the `sheet_imports` table); otherwise the site's value is kept.

The site's current state can be downloaded in the same sheet layout from **Problems → Download sheet (CSV)** (`/api/sheet`).

## Schema changes

Edit `src/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`, then `npm run db:migrate` against production.
