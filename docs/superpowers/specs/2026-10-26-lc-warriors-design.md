# LC Warriors — Design

Date: 2026-10-26
Status: Draft, awaiting approval (builder check done)

## Intent

Raj, Ganesh and Arbaaz are working through LeetCode 75 together on a planned schedule. The schedule has new problems plus spaced revisions at D+3, D+7 and D+14, along with periodic "Earlier Review" days. Today the plan lives in a Google Sheet (`LeetCode_75_Raj_Ganesh_Arbaaz_Aligned.xlsm - LeetCode Tracker.csv` in this folder). The sheet works, but it's awkward to see what's due tonight, and there's nowhere to leave notes for the next attempt.

The goal is a small, good-looking website on Vercel that:
- shows each person what to solve today and what they've fallen behind on,
- lets them update their status in one click,
- keeps a shared comment thread per problem, so notes from the first attempt are there at every revision,
- grows over time with a Resources page (YouTube tutorials) and later topic pages.

They mostly solve **at night**, so a "day" runs from 6:00 AM to 6:00 AM, not midnight to midnight.

## Goals

- A Netflix-style profile picker ("`$ whoami`") with three people. The choice is remembered in the browser, and a switch is always reachable from the header.
- A home page showing Today, Backlog and Upcoming for the selected person, plus a crew strip with all three people's progress.
- Status updates on the site: Not started, In progress, Completed, Revisit.
- One page per unique problem, with a shared comment thread. Each comment shows its author (the selected profile) and a timestamp.
- A Resources page of YouTube videos grouped under headings (Graphs, Trees, DP, …). Videos can be watched on the page and added from the site with no redeploy.
- Hosted on Vercel.

## Non-goals (for now)

- Logins and passwords. Anyone with the URL can pick any profile, which is acceptable for three friends.
- Syncing back to Google Sheets. After a one-time import, **the site is the source of truth**.
- Editing the schedule (dates, adding problems) from the UI.
- Topic pages and per-problem resources. These are planned for later, and the data model should not block them.
- Notifications, real-time push and streak gamification beyond simple counts.

## Anti-goals (would make it a failure even if it "works")

- Losing or overwriting someone's status or comments. All three people must see the same shared data.
- A cluttered, spreadsheet-like UI. It should look polished and feel good to open every night.
- Adding a resource requires a code change or redeploy.

## The data (from the CSV)

The CSV has 270 rows with the columns `Date, Day, Task, LC #, Problem, Topic, Review Stage, Raj — Status, Ganesh — Status, Arbaaz — Status, Original Date, Eligibility, LeetCode Link`.

- **Task:** `Previously Practiced` (8 rows, no date, Baseline), `New`, or `Revision`.
- **Review Stage:** `Baseline`, `Original`, `D+3`, `D+7`, `D+14`, or `Earlier Review`.
- **Topic:** filled on New/Baseline rows. It's blank on D+N revision rows and reads `Revision — <Topic>` on Earlier Review rows.
- **LeetCode Link:** on D+N revisions this is a search URL (`/problemset/?search=643`) rather than the problem URL.
- **Status values:** `Completed`, `In Progress`, `Not Started`, `Revisit`.

The import must therefore:
1. **Build one unique problem per `LC #`**, using the canonical title, topic and the real `/problems/<slug>/` link from the New or Baseline row. Revision rows link to that problem and inherit its topic and URL.
2. **Create one scheduled task per dated row** (date, stage, problem). Baseline rows are not scheduled tasks; they only record that Raj and Ganesh had already practised those problems.
3. **Seed each person's status per task** from the three status columns.

## How each person's lists are computed

"Today" means the current 6 AM–6 AM window in Asia/Kolkata (IST).

- **Today:** tasks scheduled for today's date. Completed tasks stay visible, faded and struck through, so the "x / y done" count is honest.
- **Backlog:** tasks scheduled before today that this person hasn't completed, oldest first, each showing how many days late it is. Every scheduled task, revisions included, stays in the backlog until completed. Nothing silently expires.
- **Upcoming:** tasks after today, grouped by date.
- **Original not done yet:** if a revision is due but this person hasn't completed the original (New) task for that problem, the revision card shows a clear "Finish the original first" flag linking to it.
- **Empty Today:** if Today has no incomplete tasks, the home page opens on the Backlog tab.
- **Revisit status:** counts as *not* completed, so the task stays in the backlog.

## Screens (agreed via mockups; see `.superpowers/brainstorm/` for the HTML)

**1. Profile picker.** A terminal look: `$ whoami` with a blinking cursor, three large monogram tiles (R, G, A) and lowercase names underneath. It appears on first visit and whenever the user switches.

**2. Home.**
- **Top nav:** `$ lc-warriors`, then Home · Problems · Resources, and the current user chip (monogram + name) on the right, which reopens the picker.
- **Header:** the day's date, a summary line ("4 revisions today · 7 waiting in backlog") and "day ends 6:00 AM".
- **Crew strip:** three compact tiles, one per person, showing their monogram, total completed against total, a progress bar and today's x/y. The current user's tile is highlighted.
- **Tabs:** Today (count), Backlog (count in red), Upcoming, with "x / y done" on the right.
- **Cards:** **one problem per full-width row.** Each card has:
  - the problem number (in monospace) and title, linking to LeetCode,
  - tags for stage (purple for revision) and topic,
  - R/G/A badges showing each person's status on this task (green = completed, amber = in progress, grey = otherwise),
  - the user's most recent comment on this problem, as a highlighted note,
  - on the right, the status dropdown and a comment-count link to the problem page.

**3. Problem page** (one per unique LC #):
- **Header:** title, LeetCode link and topic.
- **Schedule:** the timeline of this problem's tasks (Original, D+3, D+7, D+14, Earlier Review) with each person's status.
- **Comments:** a shared thread, oldest to newest. Each comment shows the author's monogram and name and the time. A box at the bottom posts a comment as the selected user. Comments are plain text; rendering code blocks is a nice-to-have.

**4. Problems list.** All unique problems, filterable by topic, each showing the three people's overall state for it.

**5. Resources.** Sections by heading, each holding YouTube videos as embedded players or thumbnails that expand to a player. An "Add video" form takes a heading (pick an existing one or create a new one), a YouTube URL and an optional title. It's added instantly, with the selected user recorded as the person who added it. Deleting a resource is allowed.

## Visual design (agreed)

- **Theme:** dark only. Background `#0B1120`, cards `#131B2E` / `#1B2336`, borders `#243047`, text `#F1F5F9`, muted text `#94A3B8`.
- **Accents:** green `#22C55E` for done and the brand, amber `#F59E0B` for in progress and notes, red `#F87171` for late and Revisit, purple `#A78BFA` for revision tags.
- **Fonts:** JetBrains Mono for numbers, the brand and monograms; IBM Plex Sans for everything else.
- **Icons:** SVG line icons (Lucide style), no emoji as icons.
- **Responsive:** must work on a phone. Cards wrap, and the crew strip scrolls horizontally.
- **Basics:** visible focus states, 150–300 ms hover transitions, and `prefers-reduced-motion` respected.

## Technology (Claude's call, accepted by the user)

- **App:** Next.js (App Router, TypeScript) and Tailwind, deployed on Vercel.
- **Database:** Postgres via Neon, from the Vercel Marketplace. It holds problems, tasks, per-person statuses, comments and resources.
- **Users:** a fixed list of three (Raj, Ganesh, Arbaaz), with the selected user stored in `localStorage`. Writes send the user id, and there's no authentication.
- **Freshness:** after a mutation, refresh or revalidate. No websockets are needed, but loading a page or switching tabs must show the latest data from everyone.
- **Import:** a one-time seed script that reads the CSV and populates the database. It must be safe to re-run on an empty database.

## Left to the builder

- The exact schema, ORM or query layer, and API shape (server actions or route handlers).
- Optimistic UI for status changes, recommended.
- How "days late" is shown, the empty states, and loading skeletons.
- Whether the YouTube player loads lazily, recommended.
- Small layout details within the agreed look.

## Claude's calls (flagged for review)

- **Revisit:** treated as "not completed", so the task stays in the backlog.
- **Problem pages:** cover all unique LC #s (69 in the CSV), including the 8 baseline problems.
- **Crew strip total:** problems whose Original (or Baseline) is completed, out of 69 unique problems.
- **Problems list overall state:** one dot per stage (Original, D+3, D+7, D+14) for each person.

## Decided by the user after review

- **Timezone:** the 6 AM day boundary is in Asia/Kolkata (IST).
- **Earlier Review tasks:** the 18 tasks (all revisions of the 8 Baseline problems) apply **to Raj and Ganesh only**. Arbaaz never sees them, they don't count in his totals, and the "finish the original first" flag never fires for them. Tasks therefore need a per-person "applies to" rule. Everything else applies to all three. Baseline counts as completed for Raj and Ganesh when evaluating the "finish the original" flag.
