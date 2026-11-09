import type { Stage } from "./csv-import";
import { STAGE_ORDER } from "./csv-import";
import { daysBetween } from "./day";
import type { Status } from "./status";
import { ALL_USER_IDS, type UserId } from "./users";

export interface BoardTask {
  id: number;
  lc: number;
  title: string;
  topic: string;
  url: string;
  stage: Stage;
  date: string | null;
  appliesTo: UserId[];
  statuses: Record<UserId, Status>;
}

export interface BoardItem extends BoardTask {
  daysLate: number;
  originalPending: { taskId: number } | null;
}

export interface Board {
  today: BoardItem[];
  backlog: BoardItem[];
  upcoming: BoardItem[];
  /** Tasks this user marked Revisit, from any day, kept out of the backlog. */
  revisit: BoardItem[];
  /** Everything this user has completed, most recent first, so mistakes can be undone. */
  solved: BoardItem[];
  todayDone: number;
  defaultTab: "today" | "backlog";
}

const byStageThenLc = (a: BoardTask, b: BoardTask) =>
  STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || a.lc - b.lc;

const byDateThenStage = (a: BoardTask, b: BoardTask) => a.date!.localeCompare(b.date!) || byStageThenLc(a, b);

/**
 * The user's first-solve tasks per problem: its Original rows (a sheet may repeat them as re-attempts)
 * and its Baseline row. Dated rows first, earliest first.
 */
function originalsFor(tasks: BoardTask[], user: UserId): Map<number, BoardTask[]> {
  const originals = new Map<number, BoardTask[]>();
  for (const t of tasks) {
    if (!t.appliesTo.includes(user) || (t.stage !== "original" && t.stage !== "baseline")) continue;
    originals.set(t.lc, [...(originals.get(t.lc) ?? []), t]);
  }
  for (const list of originals.values()) list.sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
  return originals;
}

/** Solved = any of the problem's Original/Baseline rows is completed. */
const isSolved = (list: BoardTask[], user: UserId) => list.some((t) => t.statuses[user] === "completed");

export function buildBoard(tasks: BoardTask[], user: UserId, today: string): Board {
  const originals = originalsFor(tasks, user);
  const mine = tasks.filter((t) => t.date !== null && t.appliesTo.includes(user));

  // Only due revisions (today/backlog) are flagged; upcoming originals are naturally not done yet.
  const toItem = (t: BoardTask, daysLate = 0, due = true): BoardItem => {
    const list = !due || t.stage === "original" || t.stage === "baseline" ? undefined : originals.get(t.lc);
    return {
      ...t,
      daysLate,
      // jump to the earliest Original, the one the revision schedule follows
      originalPending: list && !isSolved(list, user) ? { taskId: list[0].id } : null,
    };
  };

  const todayItems = mine.filter((t) => t.date === today).sort(byStageThenLc).map((t) => toItem(t));
  const backlog = mine
    .filter((t) => t.date! < today && t.statuses[user] !== "completed" && t.statuses[user] !== "revisit")
    .sort(byDateThenStage)
    .map((t) => toItem(t, daysBetween(t.date!, today)));
  const upcoming = mine
    .filter((t) => t.date! > today)
    .sort(byDateThenStage)
    .map((t) => toItem(t, 0, false));
  // oldest first, then undated baseline problems; one card per problem and stage, since a
  // re-planned sheet can repeat a row (and its Revisit status) on a later date
  const seen = new Set<string>();
  const revisit = tasks
    .filter((t) => t.appliesTo.includes(user) && t.statuses[user] === "revisit")
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || byStageThenLc(a, b))
    .filter((t) => !seen.has(`${t.lc}:${t.stage}`) && seen.add(`${t.lc}:${t.stage}`))
    .map((t) => toItem(t, 0, false));
  // dated tasks newest first, then the undated "previously practiced" baseline problems
  const solved = tasks
    .filter((t) => t.appliesTo.includes(user) && t.statuses[user] === "completed")
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || byStageThenLc(a, b))
    .map((t) => toItem(t, 0, false));
  const todayDone = todayItems.filter((t) => t.statuses[user] === "completed").length;
  const todayClear = todayDone === todayItems.length;

  return {
    today: todayItems,
    backlog,
    upcoming,
    revisit,
    solved,
    todayDone,
    defaultTab: todayClear && backlog.length > 0 ? "backlog" : "today",
  };
}

export interface CrewStats {
  solved: number;
  total: number;
  todayDone: number;
  todayTotal: number;
}

export function crewTotals(tasks: BoardTask[], today: string): Record<UserId, CrewStats> {
  return Object.fromEntries(
    ALL_USER_IDS.map((user) => {
      const originals = [...originalsFor(tasks, user).values()];
      const solved = originals.filter((list) => isSolved(list, user)).length;
      const total = originals.length;
      const todays = tasks.filter((t) => t.date === today && t.appliesTo.includes(user));
      return [
        user,
        {
          solved,
          total,
          todayDone: todays.filter((t) => t.statuses[user] === "completed").length,
          todayTotal: todays.length,
        },
      ];
    }),
  ) as Record<UserId, CrewStats>;
}
