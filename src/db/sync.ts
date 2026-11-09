import { desc, eq, inArray, sql } from "drizzle-orm";
import { parseTrackerCsv, type ParsedProblem, type ParsedTask } from "@/lib/csv-import";
import type { Status } from "@/lib/status";
import { ALL_USER_IDS, type UserId } from "@/lib/users";
import type { Db } from "./client";
import { problems, sheetImports, tasks, taskStatus } from "./schema";

export interface StatusChange {
  key: string;
  user: UserId;
  from: Status;
  to: Status;
}

export interface SyncPlan {
  newProblems: ParsedProblem[];
  newTasks: ParsedTask[];
  statusChanges: StatusChange[];
  /** Tasks on the site that are no longer in the sheet (e.g. rescheduled). Deleted on apply. */
  removed: string[];
  /** Existing problems whose title, topic or link changed in the sheet. */
  updatedProblems: ParsedProblem[];
  sheet: ParsedTask[];
  csv: string;
}

/** The last imported sheet, or null if nothing has been imported through the site yet. */
export async function lastImport(db: Db): Promise<string | null> {
  const [row] = await db.select({ csv: sheetImports.csv }).from(sheetImports).orderBy(desc(sheetImports.id)).limit(1);
  return row?.csv ?? null;
}

/**
 * Three-way merge of the sheet into the site: new problems/tasks are added, and a status
 * cell is applied only when the sheet changed it since the last import (oldCsv).
 * Everything else keeps the site's value. The sheet owns the schedule: tasks no longer in it are removed.
 */
export async function planSync(db: Db, oldCsv: string, newCsv: string): Promise<SyncPlan> {
  const before = new Map(parseTrackerCsv(oldCsv).tasks.map((t) => [t.key, t]));
  const parsed = parseTrackerCsv(newCsv);
  if (parsed.tasks.length === 0) throw new Error("The sheet has no rows");

  const existing = new Map((await db.select().from(problems)).map((p) => [p.lc, p]));
  const rows = await db
    .select({ key: tasks.key, userId: taskStatus.userId, status: taskStatus.status })
    .from(tasks)
    .leftJoin(taskStatus, eq(taskStatus.taskId, tasks.id));
  const current = new Map<string, Partial<Record<UserId, Status>>>();
  for (const r of rows) {
    const statuses = current.get(r.key) ?? {};
    if (r.userId) statuses[r.userId as UserId] = r.status as Status;
    current.set(r.key, statuses);
  }

  const statusChanges: StatusChange[] = [];
  for (const t of parsed.tasks) {
    const site = current.get(t.key);
    if (!site) continue;
    const old = before.get(t.key);
    for (const user of ALL_USER_IDS) {
      const sheetChanged = !old || old.statuses[user] !== t.statuses[user];
      const from = site[user] ?? "not_started";
      if (sheetChanged && from !== t.statuses[user]) statusChanges.push({ key: t.key, user, from, to: t.statuses[user] });
    }
  }

  const sheetKeys = new Set(parsed.tasks.map((t) => t.key));
  return {
    newProblems: parsed.problems.filter((p) => !existing.has(p.lc)),
    newTasks: parsed.tasks.filter((t) => !current.has(t.key)),
    statusChanges,
    removed: [...current.keys()].filter((k) => !sheetKeys.has(k)),
    updatedProblems: parsed.problems.filter((p) => {
      const old = existing.get(p.lc);
      return old && (old.title !== p.title || old.topic !== p.topic || old.url !== p.url);
    }),
    sheet: parsed.tasks,
    csv: newCsv,
  };
}

export async function applySync(db: Db, plan: SyncPlan): Promise<void> {
  if (plan.newProblems.length) await db.insert(problems).values(plan.newProblems);
  for (const { lc, title, topic, url } of plan.updatedProblems) {
    await db.update(problems).set({ title, topic, url }).where(eq(problems.lc, lc));
  }

  if (plan.removed.length) {
    const ids = (await db.select({ id: tasks.id }).from(tasks).where(inArray(tasks.key, plan.removed))).map((t) => t.id);
    await db.delete(taskStatus).where(inArray(taskStatus.taskId, ids));
    await db.delete(tasks).where(inArray(tasks.id, ids));
  }

  const position = new Map(plan.sheet.map((t, i) => [t.key, i]));
  if (plan.newTasks.length) {
    const inserted = await db
      .insert(tasks)
      .values(
        plan.newTasks.map(({ key, lc, stage, date, appliesTo, sheet }) => ({
          key,
          lc,
          stage,
          date,
          appliesTo,
          sheet,
          position: position.get(key)!,
        })),
      )
      .returning({ id: tasks.id, key: tasks.key });
    const byKey = new Map(plan.newTasks.map((t) => [t.key, t]));
    await db
      .insert(taskStatus)
      .values(inserted.flatMap((t) => ALL_USER_IDS.map((userId) => ({ taskId: t.id, userId, status: byKey.get(t.key)!.statuses[userId] }))));
  }

  for (const c of plan.statusChanges) {
    const [task] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.key, c.key));
    await db
      .insert(taskStatus)
      .values({ taskId: task.id, userId: c.user, status: c.to })
      .onConflictDoUpdate({ target: [taskStatus.taskId, taskStatus.userId], set: { status: c.to, updatedAt: new Date() } });
  }

  // refresh row order + raw sheet columns for every task in the sheet (one statement)
  const values = sql.join(
    plan.sheet.map((t, i) => sql`(${t.key}, ${i}::int, ${JSON.stringify(t.sheet)}::jsonb)`),
    sql`, `,
  );
  await db.execute(
    sql`update ${tasks} set position = v.position, sheet = v.sheet from (values ${values}) as v(key, position, sheet) where ${tasks.key} = v.key`,
  );
  await db.insert(sheetImports).values({ csv: plan.csv });
}

export interface SyncSummary {
  newProblems: string[];
  updatedProblems: string[];
  newTasks: number;
  removed: string[];
  statusChanges: StatusChange[];
}

export function summarize(plan: SyncPlan): SyncSummary {
  return {
    newProblems: plan.newProblems.map((p) => `#${p.lc} ${p.title}`),
    updatedProblems: plan.updatedProblems.map((p) => `#${p.lc} ${p.title}`),
    newTasks: plan.newTasks.length,
    removed: plan.removed,
    statusChanges: plan.statusChanges,
  };
}

/** Plans a sync of an uploaded sheet against the last import (or, before any import, the site's own export). */
export async function planUpload(db: Db, newCsv: string, fallbackBase: () => Promise<string>): Promise<SyncPlan> {
  return planSync(db, (await lastImport(db)) ?? (await fallbackBase()), newCsv);
}
