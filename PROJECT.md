# LC Warriors — project handbook

Everything needed to run this repo somewhere else: what it does, how it's built, how to set it up from scratch, and the decisions behind it. Keep the **Changelog** at the bottom up to date when something changes.

Live: https://lc-warriors.vercel.app (Vercel project `three-e0b9/lc-warriors`, Neon Postgres in `us-east-1`).

## What it does

A LeetCode 75 tracker for three friends (Raj, Ganesh, Arbaaz), driven by a schedule kept in a Google Sheet.

- **`$ whoami` picker.** Choose your profile; it's remembered per browser (`localStorage` key `lcw.user`) and switched from the header chip. There are no accounts or passwords: anyone with the URL can act as anyone.
- **Home** has the crew strip (each person's solved/total and today's progress) and five tabs:
  - **Today**: tasks dated today. A day runs 06:00–06:00 IST.
  - **Backlog**: past tasks not completed (and not marked Revisit), showing days late.
  - **Revisit**: everything you marked Revisit, from any day. Each problem and stage is shown once, even if the sheet repeats the row.
  - **Upcoming**: future tasks grouped by date.
  - **Solved**: everything you completed, so a wrong status can be fixed.
- **Task cards** have a LeetCode link, a status dropdown (Not started, In progress, Completed, Revisit) and your latest note on the problem. A revision whose original isn't finished is flagged with a jump to the original.
- **Problems** lists all problems with per-person progress dots, topic filter and search. Each problem page has its schedule and a **shared comment thread**, shown to all three and across revisions. You can edit or delete only your own comments.
- **Download sheet / Upload sheet** (Problems page): download the current state in the Google Sheet layout, or upload an edited CSV. Upload shows a preview and writes only on **Apply** (see *Sheet sync*).
- **Resources**:
  - Paste any link: a YouTube video, a YouTube playlist, or an article (articles open in a new tab).
  - Links are grouped under free-text headings, with filter chips by type and jump links per heading.
  - YouTube titles and playlist covers are filled in automatically through YouTube's public oEmbed (no API key).
  - Clicking a video or playlist opens a **theater player** above that heading. You can resize it by dragging its corner (the width is remembered as `lcw.playerWidth`), and playlists list every video beside the player so you can click through.

## Stack

| Part | Choice |
|---|---|
| Framework | Next.js **16.4** App Router, React 19.3, `cacheComponents` + `partialPrefetching` on. Read `node_modules/next/dist/docs/` before changing Next code, since APIs differ from older versions (see `AGENTS.md`). |
| Styling | Tailwind v4 (`@theme inline` tokens in `src/app/globals.css`), lucide-react icons, IBM Plex Sans + JetBrains Mono |
| Database | Postgres via Drizzle ORM. Production uses Neon over HTTP (`@neondatabase/serverless`); any URL containing `localhost` uses `node-postgres` |
| Tests | Vitest with in-memory PGlite, so no database is needed (`npm test`) |
| Hosting | Vercel (Node runtime, region iad1, next to Neon us-east-1) |

## Code map

```
src/app/            pages: / (home), /problems, /problems/[lc], /resources, /api/sheet (CSV download)
src/app/actions.ts  all server actions (status, comments, resources, sheet preview/apply)
src/components/     client UI (HomeView, TaskCard, CommentThread, ProblemsView, SheetUpload, ResourcesView, Theater, …)
src/db/schema.ts    tables: problems, tasks, task_status, comments, resources, sheet_imports
src/db/queries.ts   reads        src/db/mutations.ts  validated writes
src/db/sync.ts      three-way sheet sync (plan → preview → apply)
src/db/seed.ts      first import into an empty database
src/lib/            pure logic: board.ts (tabs), day.ts (06:00 IST), csv-import/export, users, status, youtube
drizzle/            SQL migrations (generated, committed)
scripts/            seed.ts, sync.ts (CLI versions of seed and upload)
data/tracker.csv    seed sheet: a snapshot of the live schedule + statuses (refreshed 2026-11-09); also the CLI sync base before any upload is recorded
tests/              Vitest; fixtures/tracker-v1.csv and -v2.csv are frozen sheet copies, so tests never depend on data/
docs/superpowers/   original design spec and implementation plan
```

## Setting it up somewhere new

### 1. Run it locally

```bash
npm install
npx pglite-server -d ./.pgdata -p 54329 -m 10        # throwaway Postgres, no Docker; or use any Postgres
echo 'DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres?sslmode=disable' > .env.local
set -a && source .env.local && set +a
npm run db:migrate && npm run db:seed                 # seeds from data/tracker.csv
npm run dev
```

### 2. New Vercel + Neon deployment

1. `npx vercel login`, then `npx vercel link` (create a new project).
2. In the Vercel dashboard, open the project's **Storage** tab and add **Neon** from the Marketplace. Pick the region that matches the function region (default iad1 ↔ Neon us-east-1). This sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
3. `npx vercel env pull .env.production.local`
4. Create the tables and load data:
   ```bash
   set -a && source .env.production.local && set +a
   npm run db:migrate
   npm run db:seed          # fresh start from data/tracker.csv, OR copy the old database (below)
   ```
5. `npx vercel --prod --yes`

The only environment variable the app reads is **`DATABASE_URL`**.

### 3. Moving the existing data

The sheet download carries the schedule and statuses only. **Comments and resources live only in the database**, so copy the whole database:

```bash
pg_dump  "$OLD_DATABASE_URL_UNPOOLED" --no-owner --no-acl -Fc -f lcw.dump
pg_restore -d "$NEW_DATABASE_URL_UNPOOLED" --no-owner --no-acl lcw.dump
```

Use the *unpooled* URLs for dump/restore. Afterwards run `npm run db:migrate` against the new database (it's a no-op if it's already current).

### 4. Reusing it for a different group or sheet

- **People:** edit `src/lib/users.ts` (id, name, monogram), then `STATUS_COLUMNS` in `src/lib/csv-import.ts` (the sheet's "<Name> — Status" headers) and `SHEET_COLUMNS` (the export header order).
- **Who gets Baseline and Earlier Review tasks:** they're hard-coded to Raj and Ganesh in `parseTrackerCsv` (`appliesTo`).
- **Day boundary:** `src/lib/day.ts` (currently UTC−30 min = 06:00 IST).
- **Sheet layout:** expected columns are `Date, Day, Task, LC #, Problem, Topic, Review Stage, <3 status columns>, Original Date, Eligibility (Raj / Ganesh), LeetCode Link`. Review Stage is one of `Baseline | Original | D+3 | D+7 | D+14 | Earlier Review`.

## Day-to-day operations

| Task | How |
|---|---|
| Deploy | `npx vercel --prod --yes`, then remove the previous deployment: `npx vercel ls lc-warriors` → `npx vercel rm <old-url> --yes` (we keep exactly one) |
| Schema change | edit `src/db/schema.ts` → `npm run db:generate` → commit `drizzle/*` → **migrate production before deploying** code that uses the new columns (`set -a && source .env.production.local && set +a && npm run db:migrate`) |
| Change the schedule | **Download sheet** from the site → edit → **Upload sheet** → check the preview → Apply |
| One-off data fix (e.g. a wrong link) | same as above: download, fix the cell, upload. The preview should list only that change |
| Checks | `npm test` · `npx tsc --noEmit` · `npm run lint` · `npm run build` |

## Sheet sync rules

Implemented in `src/db/sync.ts`; used by both **Upload sheet** and `npm run db:sync`.

- **The sheet owns the schedule.** Each task's identity is `lc:stage:date`. New rows are added. Rows no longer in the sheet are **deleted with their statuses**, so moving a date shows up as one removed task plus one added task.
- **Statuses use a three-way merge.** A sheet cell is applied only if it differs from the **last uploaded sheet** (stored in `sheet_imports`). Otherwise the site's value wins, so statuses changed on the site survive an old sheet.
- **Problem title, topic and link** are updated from the sheet's Original/Baseline row.
- **Comments are never touched.**
- **Repeated rows are allowed:** a problem may have several Original or D+n rows on different dates (e.g. a topic-wise re-plan). Each row is its own task.
- **Safe workflow:** always start from the site's own download. A stale local copy shows up in the preview as unexpected removals or reset statuses. If you see those, press Cancel.
- **Google Sheet:** if you also keep the Google Sheet, make the same edits there, or the next upload from it will undo them.
- **Export:** CRLF line endings and the raw sheet columns (stored in `tasks.sheet`), so a download followed by an upload is byte-identical.

## Decisions and gotchas

- **Server state:** data loads inside `<Suspense>` with `await connection()` (Cache Components), not `force-dynamic`. Server actions call `revalidatePath("/", "layout")` + `refresh()`.
- **User picker:** the provider always renders the page and shows the picker as an overlay. Returning `null` on the server broke instant navigation.
- **YouTube:** the player uses the IFrame API on `youtube-nocookie.com`. The element handed to `YT.Player` is created imperatively, because YouTube replaces it and React must not own it.
- **Effects:** never return the value of `scrollIntoView` from an effect. Newer Chrome returns a Promise there, and React treats a returned non-function as a broken cleanup.
- **Counts:** the crew tile counts each problem once. A problem is solved when **any** of that person's Original or Baseline rows for it is Completed, because a sheet may repeat Original rows as re-attempts. "Finish the original first" points at the earliest Original. The Solved tab counts every completed task, revisions included, so it can be higher.
- **TLS behind a proxy:** if Node tools fail with `fetch failed` / `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, the network is intercepting TLS. For the Vercel CLI, prefix the command with `NODE_OPTIONS=--use-system-ca` (e.g. `NODE_OPTIONS=--use-system-ca npx vercel --prod --yes`). Reaching Neon from local scripts still failed even with that, so use the site's upload/download for data instead.
- **Not yet done:** topic pages; syncing the user switch across open tabs; showing a raw DB error politely; Safari < 17.4 lacks `Map.groupBy`.

## Changelog

- **2026-10-26:** First version: picker, Today/Backlog/Upcoming, task cards, shared comments, Problems, Resources (YouTube videos), Neon + Vercel deploy.
- **2026-10-27:**
  - Solved tab.
  - Edit and delete your own comments.
  - Sheet download.
  - CLI sync with three-way merge.
  - Solved count now includes baseline problems.
- **2026-10-28:**
  - Upload sheet on the site, with a preview. Removed rows are now deleted, and each upload is recorded in `sheet_imports`.
  - Resources: playlists and article links, filters, oEmbed titles.
  - Theater player, resizable, with a playlist video list.
  - Revisit tab.
- **2026-11-01:** Fixed the #1466 LeetCode link (`…lead-to-the-city-zero/`) through the upload flow. `data/tracker.csv` was refreshed from the live site.
- **2026-11-09:**
  - A topic-wise re-plan was uploaded, bringing the site to 839 tasks with repeated Original rows for 52 problems.
  - The crew tiles dropped to about 6/75 because the site used the *last* Original per problem.
  - Fix: a problem now counts as solved if any of its Original or Baseline rows is Completed. Tiles are back to 32/31/7, and no statuses were lost. Deployed with `NODE_OPTIONS=--use-system-ca` because of TLS interception on this network.
  - Data cleanup by upload, built from the live download. 11 statuses that the re-plan had copied onto future re-attempt rows were reset to Not Started, and 47 overdue rows that were Not Started for everyone and had a later rescheduled copy were removed. All progress from the 11-09 download was kept.
  - Result: Revisit is back to 2/3/3 (Raj/Ganesh/Arbaaz) and Backlog went from 57/55/70 to 10/8/29.
  - The pre-cleanup snapshot is the 839-row export taken before the cleanup upload.
  - Code: the Revisit tab now shows each problem and stage once.
  - Repo housekeeping: the root-level sheet files are git-ignored (`/*.csv`, `/*.xlsx`) and the extra CSVs were removed. `data/tracker.csv` was refreshed to the live state. `CLAUDE.md` was expanded into a contributor guide.
