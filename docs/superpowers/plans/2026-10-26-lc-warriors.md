# LC Warriors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vercel-hosted Next.js site where Raj, Ganesh and Arbaaz track their LeetCode 75 schedule, update statuses, comment per problem, and share YouTube resources.

**Architecture:** A Next.js App Router app backed by Postgres through Drizzle ORM: Neon in production, PGlite in tests. All schedule logic (6 AM IST day boundary, Today/Backlog/Upcoming, "finish original first" flags, crew totals) is in pure, unit-tested functions under `src/lib/`. Server components load the whole dataset (about 270 tasks), and a client component picks the current user from `localStorage`. Mutations are server actions that wrap testable functions taking a `db` argument, followed by `revalidatePath`.

**Tech Stack:** Next.js (latest, App Router, TypeScript), Tailwind CSS, Drizzle ORM and drizzle-kit, `@neondatabase/serverless`, `@electric-sql/pglite` (tests), `csv-parse`, Vitest, `lucide-react`, `next/font/google` (JetBrains Mono, IBM Plex Sans).

**Spec:** `docs/superpowers/specs/2026-10-26-lc-warriors-design.md`

## Global Constraints

- **No git commits.** The user will commit everything with their own credentials when the work is done. Skip every commit step; leave changes in the working tree.
- **Users:** a fixed list, with ids `raj`, `ganesh`, `arbaaz`, display names `Raj`, `Ganesh`, `Arbaaz` and monograms `R`, `G`, `A`. There is no authentication; the selected user is stored in `localStorage` under the key `lcw.user`.
- **Statuses:** `not_started | in_progress | completed | revisit`. These map from the CSV values `Not Started | In Progress | Completed | Revisit`. Only `completed` counts as done.
- **Day boundary:** the "day" is 06:00–06:00 in `Asia/Kolkata`. Vercel servers run in UTC, so never use the server's local time.
- **Earlier Review:** these tasks apply to `raj` and `ganesh` only. Every other task applies to all three.
- **Theme:** dark only. Tokens: bg `#0B1120`, card `#131B2E`, card2 `#1B2336`, muted `#272F42`, line `#243047`, fg `#F1F5F9`, mut `#94A3B8`, dim `#64748B`, acc `#22C55E`, warn `#F59E0B`, red `#F87171`, rev `#A78BFA`.
- **Fonts:** JetBrains Mono for numbers, the brand and monograms; IBM Plex Sans for body text.
- **Icons:** Lucide SVG icons only, no emoji as icons. Every clickable element has a visible focus state, and transitions are 150–300 ms and disabled under `prefers-reduced-motion`.
- **Layout:** must work at 375 px wide, with no horizontal page scroll. The crew strip may scroll horizontally on its own.
- **Mockups:** the HTML mockups in `.superpowers/brainstorm/*/content/home-v3.html` and `home-layout-v2.html` (picker option 2, "terminal monogram") are the visual reference.

## Review Focus

- **Early-morning hours:** at 01:00 IST, "today" is still the previous date, including on a UTC server. Tested in Task 2.
- **Concurrent updates:** Raj updating a status must never change Ganesh's status on the same task, and updating the same row twice overwrites it rather than duplicating it. Tested in Task 6.
- **Stale or invalid user:** a `localStorage` value like `"bob"`, or an empty value, shows the picker instead of crashing. A server action called with an unknown user id is rejected. Tested in Tasks 6 and 7.
- **Messy comment and resource input:** empty or whitespace-only comments are rejected, comments over 2000 characters are rejected, and YouTube URLs in `youtu.be`, `shorts/`, `&t=` and `embed/` forms all parse while non-YouTube URLs are rejected. Tested in Task 6.
- **Baseline problems have no link in the CSV:** the canonical URL comes from another row for the same problem, or is slugified from the title. Tested in Task 3.

---

## File Structure

```
src/
  lib/
    users.ts          USERS, UserId, isUserId
    status.ts         Status, STATUS_LABELS, fromCsvStatus
    day.ts            currentDay, daysBetween
    csv-import.ts     parseTrackerCsv
    youtube.ts        parseYouTubeId
    board.ts          buildBoard, crewTotals (pure list logic)
  db/
    schema.ts         Drizzle tables
    client.ts         getDb() (Neon), Db type
    queries.ts        loadAll(db), loadProblem(db, lc), loadResources(db)
    mutations.ts      setStatus, addComment, addResource, deleteResource
    seed.ts           seed(db, csvText)
  app/
    layout.tsx        fonts, theme, <UserProvider>, <Nav>
    globals.css       tokens
    actions.ts        server actions (thin wrappers + revalidatePath)
    page.tsx          Home (server) → <HomeView> (client)
    problems/page.tsx
    problems/[lc]/page.tsx
    resources/page.tsx
  components/
    UserProvider.tsx  context + localStorage, renders <WhoAmI> when no user
    WhoAmI.tsx        picker
    Nav.tsx
    HomeView.tsx      header, CrewStrip, tabs, TaskCard list
    CrewStrip.tsx
    TaskCard.tsx
    StatusSelect.tsx
    StageDots.tsx
    CommentThread.tsx
    ResourcesView.tsx
scripts/seed.ts       CLI: reads CSV, runs seed against DATABASE_URL
drizzle/              generated migrations
tests/                *.test.ts (Vitest)
tests/helpers/db.ts   testDb(): PGlite + migrations
data/tracker.csv      copy of the user's CSV
```

---

### Task 1: Scaffold the app, theme and test runner

**Files:**
- Create: the Next.js project in the repo root (`src/` layout), `vitest.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `data/tracker.csv`, `.env.example`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` (Vitest, node environment, `@/` alias to `src/`), `npm run build`, Tailwind tokens usable as `bg-bg`, `bg-card`, `bg-card2`, `bg-muted`, `border-line`, `text-fg`, `text-mut`, `text-dim`, `text-acc`, `text-warn`, `text-red`, `text-rev`, and the font utilities `font-mono` (JetBrains Mono) and `font-sans` (IBM Plex Sans).

- [ ] **Step 1:** Run `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes` in the repo root. Keep the existing `.gitignore` entries, merging if the generator overwrites the file.
- [ ] **Step 2:** Install the dependencies: `npm i drizzle-orm @neondatabase/serverless csv-parse lucide-react` and `npm i -D drizzle-kit vitest @electric-sql/pglite tsx`. Add `"test": "vitest run"`, `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"` and `"db:seed": "tsx scripts/seed.ts"` to `package.json`.
- [ ] **Step 3:** Copy the CSV into place: `cp "LeetCode_75_Raj_Ganesh_Arbaaz_Aligned.xlsm - LeetCode Tracker.csv" data/tracker.csv`. Create `.env.example` containing `DATABASE_URL=postgres://...`.
- [ ] **Step 4:** Put the theme tokens from Global Constraints into `globals.css` as CSS variables, and expose them through Tailwind's `@theme`. In `layout.tsx`, load `JetBrains_Mono` and `IBM_Plex_Sans` with `next/font/google`, set `<html lang="en" className="dark">`, give `body` the bg and fg colours, and set the title to `LC Warriors`.
- [ ] **Step 5:** Write `tests/smoke.test.ts` asserting `expect(1 + 1).toBe(2)`, and `vitest.config.ts` with `resolve.alias['@'] = src` and `environment: 'node'`.
- [ ] **Step 6:** Run `npm test && npm run build`. Expected: 1 test passes and the build succeeds.

---

### Task 2: Users, statuses and the 6 AM IST day boundary

**Files:**
- Create: `src/lib/users.ts`, `src/lib/status.ts`, `src/lib/day.ts`
- Test: `tests/day.test.ts`, `tests/users-status.test.ts`

**Interfaces:**
- Produces:
  - `type UserId = 'raj' | 'ganesh' | 'arbaaz'`
  - `USERS: readonly { id: UserId; name: string; monogram: string }[]` (in the order Raj, Ganesh, Arbaaz)
  - `isUserId(x: unknown): x is UserId`
  - `type Status = 'not_started' | 'in_progress' | 'completed' | 'revisit'`
  - `STATUSES: readonly Status[]`
  - `STATUS_LABELS: Record<Status, string>` (`Not started`, `In progress`, `Completed`, `Revisit`)
  - `fromCsvStatus(s: string): Status` (throws on unknown values)
  - `currentDay(now: Date): string`, returning `YYYY-MM-DD` for the 06:00–06:00 Asia/Kolkata window
  - `daysBetween(from: string, to: string): number`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/day.test.ts
test('before 6 AM IST belongs to previous day', () => {
  expect(currentDay(new Date('2026-10-26T19:30:00Z'))).toBe('2026-10-26'); // 01:00 IST on Oct 27
});
test('6 AM IST starts the new day', () => {
  expect(currentDay(new Date('2026-10-27T00:30:00Z'))).toBe('2026-10-27'); // 06:00 IST
  expect(currentDay(new Date('2026-10-27T00:29:59Z'))).toBe('2026-10-26');
});
test('month boundary', () => {
  expect(currentDay(new Date('2026-11-01T00:00:00Z'))).toBe('2026-10-31'); // 05:30 IST Nov 1
});
test('daysBetween', () => {
  expect(daysBetween('2026-10-23', '2026-10-26')).toBe(3);
  expect(daysBetween('2026-10-31', '2026-11-01')).toBe(1);
});
// tests/users-status.test.ts
test('isUserId rejects stale values', () => {
  expect(isUserId('raj')).toBe(true);
  expect(isUserId('bob')).toBe(false);
  expect(isUserId(null)).toBe(false);
});
test('fromCsvStatus maps sheet values', () => {
  expect(fromCsvStatus('Not Started')).toBe('not_started');
  expect(fromCsvStatus('In Progress')).toBe('in_progress');
  expect(fromCsvStatus('Completed')).toBe('completed');
  expect(fromCsvStatus('Revisit')).toBe('revisit');
  expect(() => fromCsvStatus('Done?')).toThrow();
});
```

- [ ] **Step 2:** Run `npm test`. Expected: FAIL, modules not found.
- [ ] **Step 3:** Implement the functions. `currentDay` shifts the instant by +5:30 and then −6:00, so −0:30 net, and takes the UTC date. IST has no DST, so the fixed offset is correct. `daysBetween` parses both dates as UTC midnight and divides by 86 400 000.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.

---

### Task 3: CSV import parser

**Files:**
- Create: `src/lib/csv-import.ts`
- Test: `tests/csv-import.test.ts` (reads `data/tracker.csv`)

**Interfaces:**
- Consumes: `fromCsvStatus`, `UserId` (Task 2)
- Produces:

```ts
type Stage = 'baseline' | 'original' | 'd3' | 'd7' | 'd14' | 'earlier_review';
interface ParsedProblem { lc: number; title: string; topic: string; url: string }
interface ParsedTask {
  key: string;            // `${lc}:${stage}:${date ?? 'none'}`, unique
  lc: number; stage: Stage;
  date: string | null;    // null only for baseline
  appliesTo: UserId[];
  statuses: Record<UserId, Status>;
}
parseTrackerCsv(text: string): { problems: ParsedProblem[]; tasks: ParsedTask[] }
```

**Mapping rules (from the spec):**
- **Stage:** `Review Stage`, where `Baseline`→`baseline`, `Original`→`original`, `D+3`→`d3`, `D+7`→`d7`, `D+14`→`d14` and `Earlier Review`→`earlier_review`.
- **Title and topic:** taken from the `Original` or `Baseline` row for that `LC #`, never from revision rows (they have a blank topic or `Revision — X`).
- **URL:** the first row for that LC # whose link contains `/problems/`. Strip any trailing slash, then add exactly one. If there's no such row, use `https://leetcode.com/problems/<slug>/`, where the slug is the lowercased title with non-alphanumeric runs replaced by `-` and leading/trailing dashes trimmed.
- **Applies to:** `appliesTo` is `['raj','ganesh']` for `earlier_review` and all three users otherwise.

- [ ] **Step 1: Write the failing tests**

```ts
const { problems, tasks } = parseTrackerCsv(readFileSync('data/tracker.csv', 'utf8'));
test('counts', () => {
  expect(problems).toHaveLength(69);
  expect(tasks).toHaveLength(270);
  expect(tasks.filter(t => t.stage === 'baseline')).toHaveLength(8);
  expect(tasks.filter(t => t.stage === 'earlier_review')).toHaveLength(18);
  expect(new Set(tasks.map(t => t.key)).size).toBe(270);
});
test('revision inherits title/topic/url from original', () => {
  const p = problems.find(p => p.lc === 643)!;
  expect(p).toEqual({ lc: 643, title: 'Maximum Average Subarray I', topic: 'Sliding Window',
    url: 'https://leetcode.com/problems/maximum-average-subarray-i/' });
});
test('baseline problem gets url from earlier-review row', () => {
  expect(problems.find(p => p.lc === 11)!.url).toBe('https://leetcode.com/problems/container-with-most-water/');
  expect(problems.find(p => p.lc === 11)!.topic).toBe('Two Pointers');
});
test('url without trailing slash is normalised', () => {
  expect(problems.find(p => p.lc === 2215)!.url).toBe('https://leetcode.com/problems/find-the-difference-of-two-arrays/');
});
test('earlier review applies to raj+ganesh only', () => {
  const er = tasks.find(t => t.stage === 'earlier_review')!;
  expect(er.appliesTo).toEqual(['raj', 'ganesh']);
});
test('statuses seeded', () => {
  const t = tasks.find(t => t.lc === 547 && t.stage === 'original')!;
  expect(t.date).toBe('2026-10-25');
  expect(t.statuses).toEqual({ raj: 'revisit', ganesh: 'in_progress', arbaaz: 'not_started' });
});
test('baseline has null date and arbaaz not_started', () => {
  const b = tasks.find(t => t.lc === 374 && t.stage === 'baseline')!;
  expect(b.date).toBeNull();
  expect(b.statuses).toEqual({ raj: 'completed', ganesh: 'completed', arbaaz: 'not_started' });
});
```

- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `parseTrackerCsv` using `csv-parse/sync` with `{ columns: true, skip_empty_lines: true, trim: true }`. Read the column headers exactly as written, including the em-dash (`Raj — Status`).
- [ ] **Step 4:** Run `npm test`. Expected: PASS. If the count of 69 problems is off, print the unique LC #s and fix the parser. Do not change the test, because the builder check verified 69 against the CSV.

---

### Task 4: Database schema, test DB and seed

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `src/db/seed.ts`, `scripts/seed.ts`, `drizzle.config.ts`, `tests/helpers/db.ts`, `drizzle/` (generated)
- Test: `tests/seed.test.ts`

**Interfaces:**
- Consumes: `parseTrackerCsv` (Task 3)
- Produces the tables:
  - `problems(lc int pk, title text, topic text, url text)`
  - `tasks(id serial pk, key text unique, lc int → problems, stage text, date date (string mode) null, applies_to text[])`
  - `task_status(task_id int → tasks, user_id text, status text, updated_at timestamptz default now(), pk(task_id, user_id))`
  - `comments(id serial pk, lc int → problems, user_id text, body text, created_at timestamptz default now())`
  - `resources(id serial pk, heading text, youtube_id text, title text null, added_by text, created_at timestamptz default now())`
- Also produces:
  - `type Db` (a Drizzle Postgres database type that both the Neon and PGlite drivers satisfy; use `PgDatabase<any, typeof schema>`)
  - `getDb(): Db` (Neon HTTP driver, using `process.env.DATABASE_URL`, cached per process)
  - `seed(db: Db, csvText: string): Promise<{ problems: number; tasks: number }>` (throws `Error('Database already seeded')` if `problems` has any rows)
  - `testDb(): Promise<Db>` (a fresh in-memory PGlite with `drizzle/` migrations applied)

- [ ] **Step 1: Write the failing tests**

```ts
test('seed loads everything once', async () => {
  const db = await testDb();
  const csv = readFileSync('data/tracker.csv', 'utf8');
  expect(await seed(db, csv)).toEqual({ problems: 69, tasks: 270 });
  const rows = await db.select().from(taskStatus);
  expect(rows).toHaveLength(270 * 3); // a status row for each user on every task, even ones that don't apply to them
  await expect(seed(db, csv)).rejects.toThrow('Database already seeded');
});
```

- [ ] **Step 2:** Write `schema.ts` and `drizzle.config.ts` (dialect `postgresql`, schema `src/db/schema.ts`, out `drizzle`), then run `npm run db:generate`. Expected: a SQL migration appears in `drizzle/`.
- [ ] **Step 3:** Run `npm test`. Expected: FAIL, because `seed` and `testDb` are not defined yet.
- [ ] **Step 4:** Implement `testDb` (with `drizzle-orm/pglite` and `migrate` from `drizzle-orm/pglite/migrator`), `seed` (in a transaction), `getDb` and `scripts/seed.ts`. The script reads `data/tracker.csv`, calls `seed(getDb(), text)` and prints the counts.
- [ ] **Step 5:** Run `npm test`. Expected: PASS.

---

### Task 5: Board logic (Today, Backlog, Upcoming, flags, crew totals)

**Files:**
- Create: `src/lib/board.ts`
- Test: `tests/board.test.ts`

**Interfaces:**
- Consumes: `UserId`, `Status`, `Stage`, `daysBetween`
- Produces:

```ts
interface BoardTask {
  id: number; lc: number; title: string; topic: string; url: string;
  stage: Stage; date: string | null; appliesTo: UserId[];
  statuses: Record<UserId, Status>;
}
interface BoardItem extends BoardTask {
  daysLate: number;                  // 0 unless in backlog
  originalPending: { taskId: number } | null;  // set when a revision's original isn't completed by this user
}
interface Board { today: BoardItem[]; backlog: BoardItem[]; upcoming: BoardItem[]; todayDone: number; defaultTab: 'today' | 'backlog' }
buildBoard(tasks: BoardTask[], user: UserId, today: string): Board
crewTotals(tasks: BoardTask[], today: string): Record<UserId, { solved: number; total: number; todayDone: number; todayTotal: number }>
```

**Rules:**
- **Which tasks count:** only tasks whose `appliesTo` includes the user and whose `date` is not null.
- **`today`:** `date === today`, every status, sorted with original first, then by stage order (`original, d3, d7, d14, earlier_review`), then by lc.
- **`backlog`:** `date < today` with status `!== 'completed'`, sorted by date ascending, then the same order. `daysLate = daysBetween(date, today)`.
- **`upcoming`:** `date > today`, sorted by date ascending.
- **`originalPending`:** applies when the stage is not `original` or `baseline` and the user's status on this lc's `original` task (or `baseline` if there's no original) is not `completed`. It points at that task's id. If no such task exists, it is null.
- **`defaultTab`:** `'backlog'` when every `today` item is completed (or `today` is empty) and `backlog` is non-empty; otherwise `'today'`.
- **`crewTotals.solved`:** the number of distinct lc whose original or baseline status for that user is `completed`. `total` is the number of distinct problems (69). `todayDone` and `todayTotal` follow the user's `today` list.

- [ ] **Step 1: Write the failing tests** with a small hand-built fixture (helper `mk(id, lc, stage, date, statuses, appliesTo?)`):
  - `today` includes completed items, and `todayDone` counts them.
  - A revision dated before today with `revisit` status is in the backlog with `daysLate` 3 (Oct 23 → Oct 26).
  - A completed past task is not in the backlog.
  - An `earlier_review` task never appears for `arbaaz` but does appear for `raj`.
  - A `d3` task whose original is `not_started` for ganesh has `originalPending.taskId` equal to the original's id; when the original is `completed`, it is `null`.
  - An `earlier_review` task for raj with a completed baseline has `originalPending === null`.
  - `defaultTab` is `'backlog'` when today is all completed and the backlog is non-empty, and `'today'` otherwise.
  - Integration test: parse `data/tracker.csv`, map it to `BoardTask` with ids from the index, and run `buildBoard(tasks, 'ganesh', '2026-10-26')`. Then `today.map(t => t.lc)` equals `[11, 334, 1732, 206]` in any order, and `crewTotals(...).arbaaz.total === 69`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `buildBoard` and `crewTotals`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.

---

### Task 6: Queries, mutations, YouTube parsing and server actions

**Files:**
- Create: `src/lib/youtube.ts`, `src/db/queries.ts`, `src/db/mutations.ts`, `src/app/actions.ts`
- Test: `tests/youtube.test.ts`, `tests/mutations.test.ts`

**Interfaces:**
- Consumes: `Db`, `testDb`, `seed`, `BoardTask`, `isUserId`, `STATUSES`
- Produces:

```ts
parseYouTubeId(url: string): string | null
loadAll(db: Db): Promise<{ tasks: BoardTask[]; commentCounts: Record<number, number>; latestNote: Record<string, string> /* `${lc}:${userId}` → body of that user's newest comment */ }>
loadProblem(db: Db, lc: number): Promise<{ problem: ParsedProblem; tasks: BoardTask[]; comments: { id: number; userId: UserId; body: string; createdAt: Date }[] } | null>
loadResources(db: Db): Promise<{ heading: string; items: { id: number; youtubeId: string; title: string | null; addedBy: UserId }[] }[]>  // headings A→Z, items oldest first
setStatus(db: Db, taskId: number, user: string, status: string): Promise<void>
addComment(db: Db, lc: number, user: string, body: string): Promise<void>
addResource(db: Db, heading: string, url: string, title: string | null, user: string): Promise<void>
deleteResource(db: Db, id: number): Promise<void>
// actions.ts: setStatusAction, addCommentAction, addResourceAction, deleteResourceAction
//   — 'use server', call the mutation with getDb(), then revalidatePath('/', 'layout'); return { ok: true } | { ok: false; error: string }
```

**Validation** (each throws `Error` with the message shown; actions catch the error and return it):
- **User:** an unknown user gives `Unknown user`.
- **Status:** an unknown status gives `Unknown status`.
- **Comment body:** trimmed; empty gives `Comment is empty`, and more than 2000 characters gives `Comment is too long`.
- **Heading:** trimmed; empty gives `Heading is required`, and more than 60 characters gives `Heading is too long`.
- **URL:** if `parseYouTubeId` returns null, the error is `Not a YouTube link`.

- [ ] **Step 1: Write the failing tests**

```ts
// youtube
test.each([
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ['https://youtu.be/dQw4w9WgXcQ?t=42', 'dQw4w9WgXcQ'],
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s&list=x', 'dQw4w9WgXcQ'],
  ['https://youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ['https://vimeo.com/123', null], ['not a url', null], ['https://www.youtube.com/watch?v=short', null],
])('%s', (u, id) => expect(parseYouTubeId(u)).toBe(id));
// mutations (each test: db = await testDb(); await seed(db, csv))
test('setStatus only touches that user', ...)        // set raj on task X to completed → ganesh's row on X unchanged; calling twice leaves one row
test('setStatus rejects unknown user/status', ...)   // 'bob' → 'Unknown user'; 'done' → 'Unknown status'
test('addComment validates and shows in loadProblem', ...) // '   ' → 'Comment is empty'; 2001 chars → 'Comment is too long'; valid → appears with userId
test('latestNote is newest comment per user per problem', ...)
test('addResource groups by heading', ...)           // two under 'Graphs', one under 'Trees' → loadResources headings ['Graphs','Trees']
test('loadProblem returns null for unknown lc', ...)
```

- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement the functions. `setStatus` uses `insert … onConflictDoUpdate` on `(task_id, user_id)` and sets `updated_at = now()`. `parseYouTubeId` uses `new URL` inside a try block, accepts the hosts `youtube.com`, `www.youtube.com`, `m.youtube.com` and `youtu.be`, and requires the id to match `/^[A-Za-z0-9_-]{11}$/`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.

---

### Task 7: User selection: the `$ whoami` picker and nav

**Files:**
- Create: `src/components/UserProvider.tsx`, `src/components/WhoAmI.tsx`, `src/components/Nav.tsx`
- Modify: `src/app/layout.tsx`
- Test: `tests/user-storage.test.ts`

**Interfaces:**
- Consumes: `USERS`, `isUserId`
- Produces:
  - `useUser(): { user: UserId; switchUser: () => void }`, valid only under the provider and once a user is chosen
  - `readStoredUser(storage: Pick<Storage,'getItem'>): UserId | null`, exported from `UserProvider.tsx` for testing. It returns null on invalid values or when storage throws.

**Behaviour:**
- **Provider:** a client component. Until it has mounted it renders nothing, to avoid a hydration mismatch. With no valid stored user it renders `<WhoAmI>` full-screen in place of the children. Picking a user writes `lcw.user`.
- **`switchUser`:** clears the stored value and shows the picker.
- **`WhoAmI`:** matches mockup option 2. A centred monospace `$ whoami` heading with the `$` in acc green and a blinking acc cursor (no animation under reduced motion), the subtitle `lc-warriors · leetcode 75`, and three 130×110 rounded tiles with a gradient from card2 to bg, a large monospace monogram and the lowercase name below. On hover or focus the border turns acc with a soft acc ring. The tiles are `<button>`s, at least 44 px, and keyboard-reachable.
- **`Nav`:** the brand `$ lc-warriors` (with `$` in acc) on the left, links to Home, Problems and Resources with the active one highlighted (using `usePathname`), and a user chip on the right (monogram square with an acc border and the lowercase name, plus a `ChevronsUpDown` icon) that calls `switchUser`. It has an `aria-label` of "Switch user".

- [ ] **Step 1:** Write tests for `readStoredUser`. `'ganesh'` returns `'ganesh'`; `'bob'`, `null` and a `getItem` that throws all return null.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement the provider, picker and nav, and wrap the `layout.tsx` body in `<UserProvider><Nav/>{children}</UserProvider>`.
- [ ] **Step 4:** Run `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5:** Manual check with `npm run dev` (no database needed for this page; the home page may error until Task 8). Visit `/` in a fresh profile and confirm the picker appears. Pick Ganesh and reload; the picker should not appear again. Click the chip and the picker should return. Set `localStorage['lcw.user']='bob'` and reload; the picker should appear.

---

### Task 8: Home page (crew strip, tabs and task cards)

**Files:**
- Create: `src/app/page.tsx`, `src/components/HomeView.tsx`, `src/components/CrewStrip.tsx`, `src/components/TaskCard.tsx`, `src/components/StatusSelect.tsx`

**Interfaces:**
- Consumes: `getDb`, `loadAll`, `buildBoard`, `crewTotals`, `currentDay`, `setStatusAction`, `useUser`, `USERS`, `STATUS_LABELS`

**Behaviour** (visual reference: `home-v3.html`):
- **`page.tsx`:** a server component with `export const dynamic = 'force-dynamic'`. It calls `loadAll(getDb())` and `currentDay(new Date())`, then passes the tasks, comment counts, latest notes and today into `<HomeView>`.
- **`HomeView`:** a client component that builds the board and crew totals for the current user with `useMemo`. It contains:
  - **Header:** the date formatted as `Monday, Oct 26`, the summary line `{n} due today · {m} waiting in backlog`, and on the right a clock icon with `day ends 6:00 AM`.
  - **`CrewStrip`:** three tiles. Each has a monogram, the name (`· you` on the current user's tile, which also gets a highlighted border), `solved/total` in mono, a 4 px acc progress bar and `today {done}/{total}`. The strip scrolls horizontally on narrow screens.
  - **Tabs:** `Today {count}`, `Backlog {count}` (with a red count pill) and `Upcoming`, plus `{done} / {total} done` on the right. The initial tab is `board.defaultTab`. Upcoming groups cards under date subheadings.
  - **Empty states:** Today shows "Nothing due today", and Backlog shows "All caught up".
- **`TaskCard`:** one full-width card per task, with:
  - the mono `#lc` on the left,
  - the title as an external link (`target=_blank`, `rel=noreferrer`) with an `ExternalLink` icon,
  - pills for the stage (`Revision · D+3`, `Revision · earlier` or `New`, purple for revisions) and the topic,
  - a red `{n}d late` pill when `daysLate > 0`,
  - R/G/A badges for the users in `appliesTo`, green when completed and amber when in progress or revisit,
  - when `latestNote[`${lc}:${user}`]` exists, an amber left-bordered note with a `Lightbulb` icon and the text clamped to 2 lines,
  - when `originalPending` is set, a red-tinted line reading `Finish the original first →` that switches to the Backlog tab and scrolls to that card (`id="task-{taskId}"`),
  - on the right, a `StatusSelect` and a link to `/problems/{lc}` reading `{n} comments` (or `Add note` when there are none), with a `MessageSquare` icon.
  - Completed cards fade to 60% opacity and strike through the title.
- **`StatusSelect`:** a native `<select>` styled like the mockup with a coloured dot (dim, warn, acc or red). It updates optimistically with `useOptimistic`/`useTransition`, calls `setStatusAction(taskId, user, value)` and, on `{ ok: false }`, reverts and shows the error inline.

- [ ] **Step 1:** Create a Neon database (or a local Postgres through `docker run -e POSTGRES_PASSWORD=pw -p 5432:5432 postgres:16`) and put `DATABASE_URL` in `.env.local`. Then run `npm run db:migrate && npm run db:seed`. Expected: `69 problems, 270 tasks`. Neon's HTTP driver can't reach local Postgres, so if you use docker, make `getDb` choose `drizzle-orm/node-postgres` (add `pg`) when `DATABASE_URL` contains `localhost`.
- [ ] **Step 2:** Implement the page and components.
- [ ] **Step 3:** Run `npm test && npm run build`. Expected: PASS.
- [ ] **Step 4:** Manual check with `npm run dev`, as Ganesh:
  - Today lists #11, #334, #1732 and #206.
  - Backlog includes #547 (in progress), and #643 D+3 is 3 days late with the "Finish the original first" flag absent, because Ganesh completed 643.
  - As Arbaaz, no Earlier Review cards appear, and #104 D+3 shows "Finish the original first", because Arbaaz has 104 in progress.
  - Changing a status persists after a reload, and a second browser profile as Raj sees Ganesh's G badge change.
  - At 375 px wide there is no horizontal scroll.

---

### Task 9: Problem page and problems list

**Files:**
- Create: `src/app/problems/[lc]/page.tsx`, `src/app/problems/page.tsx`, `src/components/CommentThread.tsx`, `src/components/StageDots.tsx`

**Interfaces:**
- Consumes: `loadProblem`, `loadAll`, `addCommentAction`, `useUser`, `USERS`

**Behaviour:**
- **`/problems/[lc]`:** returns `notFound()` when `loadProblem` returns null.
  - **Header:** `#lc` in mono, the title linking to LeetCode, and a topic pill.
  - **Schedule:** a table of the problem's tasks in date order. Columns are stage, date, and one per user with a status dot, or `—` when the task doesn't apply to that user.
  - **`CommentThread`:** comments oldest first. Each shows a monogram square, the name and a relative time (`Intl.RelativeTimeFormat`), with the body using `whitespace-pre-wrap`. Below that is a textarea (with a visible label of `Comment as {Name}`, 2000-character limit and a live counter) and a Post button. Cmd/Ctrl+Enter submits, the box clears on success, and errors appear under the field. Comments only ever render as text, never HTML.
- **`/problems`:** all 69 problems with a topic filter of chips (`All` plus each distinct topic, sorted alphabetically) and a client-side search by title or number. Each row has `#lc`, the title linking to `/problems/{lc}`, a topic pill and, per user, a `StageDots` component with one dot for each stage that applies to them (Original, D+3, D+7, D+14) coloured by status. Baseline problems show a single dot labelled `Baseline` in place of the Original dot.

- [ ] **Step 1:** Implement both pages.
- [ ] **Step 2:** Run `npm test && npm run build`. Expected: PASS.
- [ ] **Step 3:** Manual check:
  - Post a comment on `/problems/643` as Ganesh, switch to Raj, and confirm the comment shows "Ganesh".
  - On the home page, a 643 revision card shows Ganesh's note when viewing as Ganesh and the comment count for everyone.
  - Posting `<script>alert(1)</script>` renders as literal text.
  - `/problems/99999` gives a 404.

---

### Task 10: Resources page

**Files:**
- Create: `src/app/resources/page.tsx`, `src/components/ResourcesView.tsx`

**Interfaces:**
- Consumes: `loadResources`, `addResourceAction`, `deleteResourceAction`, `useUser`

**Behaviour:**
- **Sections:** one section per heading (h2 plus a count). Each section has a responsive grid of video tiles: one column on mobile, two at 768 px and up, three at 1024 px and up.
- **Tiles:** a 16:9 tile shows the thumbnail `https://i.ytimg.com/vi/{id}/hqdefault.jpg` with a Play icon. Clicking it swaps in `<iframe src="https://www.youtube-nocookie.com/embed/{id}?autoplay=1" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen>`, so videos load lazily. Below each tile are the title (or "Untitled video") and `added by {name}`, plus a delete icon button (`aria-label="Delete video"`) that asks `confirm()` first.
- **"Add video" form** at the top: a heading input with a `<datalist>` of existing headings (so the user can pick one or type a new one), the YouTube URL, an optional title and a submit button. On success the form clears and the new video appears without a redeploy. Errors from the action show inline.
- **Empty state:** "No videos yet. Add the first one above."

- [ ] **Step 1:** Implement the page.
- [ ] **Step 2:** Run `npm test && npm run build`. Expected: PASS.
- [ ] **Step 3:** Manual check:
  - Add `https://youtu.be/<id>` under the new heading "Graphs", then a second video under "Graphs" picked from the datalist; both group together.
  - A Vimeo URL shows "Not a YouTube link".
  - Delete works.
  - The added video still appears after a reload.

---

### Task 11: Deploy to Vercel

**Files:**
- Create: `README.md` (setup, the env var, the seed command and deploy steps)

These steps need the user's own Vercel account; run them with the user.

- [ ] **Step 1:** The user runs `! npx vercel login` and then `! npx vercel link` in the repo.
- [ ] **Step 2:** In the Vercel dashboard, the user adds Neon through Storage → Marketplace and connects it to the project. This sets `DATABASE_URL`. Then they run `npx vercel env pull .env.local`.
- [ ] **Step 3:** Run `npm run db:migrate && npm run db:seed` against the production database. Expected: `69 problems, 270 tasks`.
- [ ] **Step 4:** Run `npx vercel --prod`. Expected: a production URL.
- [ ] **Step 5:** Verify on the production URL: the picker appears, Ganesh's Today shows four cards, a status change persists across devices, and a comment and a resource can be added.
- [ ] **Step 6:** Remind the user that nothing has been committed and list the files to commit (everything except the ignored `.superpowers/`, `.env*` and `node_modules/`).
