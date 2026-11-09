@AGENTS.md

# Working on LC Warriors

A LeetCode 75 tracker for three friends, built with Next.js 16, Postgres (Neon) and Vercel. Live at https://lc-warriors.vercel.app.

- **This file:** how to make changes safely.
- **[PROJECT.md](PROJECT.md):** the full handbook. It covers features, the code map, setup from scratch, operations, sheet-sync rules, decisions and the changelog. Read it before your first change.

## Get running

```bash
npm install
npx pglite-server -d ./.pgdata -p 54329 -m 10   # local Postgres, no Docker (leave it running)
echo 'DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres?sslmode=disable' > .env.local
set -a && source .env.local && set +a && npm run db:migrate && npm run db:seed
npm run dev
```

Before calling any change done, run all four checks: `npm test` (Vitest with in-memory PGlite, no database needed) · `npx tsc --noEmit` · `npm run lint` · `npm run build`.

## How the code is put together

- **Pure logic lives in `src/lib/`:**
  - `board.ts` builds the Home tabs and the crew tiles.
  - `day.ts` holds the day boundary (06:00 IST).
  - `csv-import.ts` / `csv-export.ts` read and write the Google Sheet layout.
  - `youtube.ts` classifies resource links.

  Put new rules here and unit-test them in `tests/`.
- **The database lives in `src/db/`:**
  - `schema.ts` defines the tables.
  - `queries.ts` has the reads.
  - `mutations.ts` has the validated writes; it throws an `Error` with a user-facing message.
  - `sync.ts` is the sheet upload: plan → preview → apply.
- **Server actions are all in `src/app/actions.ts`.** Wrap writes in `run()`. It returns `{ ok, error }` and revalidates and refreshes the pages. Client components call actions inside `useTransition` and show `result.error` inline.
- **Pages** load data inside `<Suspense>` with `await connection()` (Cache Components is on). Don't add `export const dynamic` / `force-dynamic`. The interactive UI lives in client components in `src/components/`.
- **The current user** comes from `useUserState()` (nullable) or `useUser()` (throws if none) in `UserProvider.tsx`. Users are fixed in `src/lib/users.ts`, and there is no auth.

## Conventions

- **Next.js 16** differs from older versions. Check `node_modules/next/dist/docs/` before using an API you're unsure of. For example, `params` is a Promise, and the page prop types are `PageProps<"/route">` / `LayoutProps`.
- **Styling** uses Tailwind v4 with the color tokens in `src/app/globals.css` (`bg-card`, `text-mut`, `text-dim`, `border-line`, `text-acc`, `text-red`, …). Use those rather than raw colors.
- **Icons** come from `lucide-react`, with `aria-hidden` when they're decorative. Icon-only buttons need an `aria-label`.
- **Match the surrounding code:** small focused components, few comments (only where the *why* isn't obvious), and the same naming.
- **Tests:** add one for any logic change, and watch it fail first. Use the frozen fixtures `tests/fixtures/tracker-v1.csv` / `-v2.csv`, never `data/tracker.csv`, which changes as the schedule changes. Keep the suite light, since this is a small project.
- **Effects:** never return a value from a `useEffect` arrow. Wrap the body in braces, because `scrollIntoView` returns a Promise in newer Chrome.

## Changing the database schema

1. Edit `src/db/schema.ts`.
2. `npm run db:generate`, and commit the new `drizzle/*.sql` and `drizzle/meta`.
3. **Migrate production before pushing to `main`** (pushing deploys) code that reads the new columns: `set -a && source .env.production.local && set +a && npm run db:migrate`. If you deploy first, pages that read those columns fail until the migration runs.

## Deploying

The Vercel project is connected to GitHub (`ganeshchennuri/lc-warriors`). **A push to `main` deploys production automatically.** Other branches and pull requests are skipped: the project's Ignored Build Step is `[ "$VERCEL_GIT_COMMIT_REF" != "main" ]`. That matters because Preview would share the production database and has no protection. Don't turn previews on without giving them their own database.

We keep exactly one deployment. After a push, remove the superseded one:

```bash
npx vercel ls lc-warriors                  # prefix NODE_OPTIONS=--use-system-ca on networks that intercept TLS
npx vercel rm <previous-deployment-url> --yes
```

To deploy by hand (rarely needed): `npx vercel --prod --yes`. `.env.production.local` comes from `npx vercel env pull .env.production.local` and is git-ignored; the app reads only `DATABASE_URL`. Migrations are not run by the build. **Migrate production before pushing** a schema change to `main`.

## Production data: be careful

Production holds three people's real progress and comments. To change the schedule or fix data (links, dates, statuses):

1. Download from the site: **Problems → Download sheet** (`/api/sheet`).
2. Edit only what you need.
3. **Problems → Upload sheet** and read the preview. Press **Apply** only if it lists exactly the changes you meant.

When you're unsure, check before you write:
- **Removed rows** delete those tasks and their statuses, so never remove a row that has a status unless that's the intent.
- **Keep a copy of the download** taken before the upload; it's the undo.
- **Verify afterwards:** download again and compare with what you uploaded. The tiles shouldn't drop, and nobody's Solved count should change unless you intended it.

There is no other undo, so don't run ad-hoc SQL against production.

## Git

- Never commit `.env*` (except `.env.example`), `.pgdata/`, or the root-level sheet files (`/*.csv`, `/*.xlsx` are git-ignored, since they hold personal progress). `data/tracker.csv` is the committed seed.
- `AGENTS.md` is rewritten by `next dev`; commit it as-is.
- Commit or push only when the repo owner asks.

## Keep PROJECT.md current

Whenever a change lands, update the relevant section of `PROJECT.md` and add a dated line to its **Changelog** as part of the same work. That covers a feature, a schema or migration change, an env var, a deploy or ops step, a data fix on production, or a new gotcha. Fix `README.md` too if its quick-start becomes wrong.
