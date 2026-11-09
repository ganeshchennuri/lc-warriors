import { asc, eq, sql } from "drizzle-orm";
import type { BoardTask } from "@/lib/board";
import type { ExportRow } from "@/lib/csv-export";
import type { ParsedProblem, Stage } from "@/lib/csv-import";
import type { Status } from "@/lib/status";
import type { UserId } from "@/lib/users";
import type { Db } from "./client";
import { comments, problems, resources, tasks, taskStatus } from "./schema";

export interface Comment {
  id: number;
  userId: UserId;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
}

export interface ResourceItem {
  id: number;
  kind: "video" | "playlist" | "link";
  youtubeId: string | null;
  url: string;
  title: string | null;
  thumbnail: string | null;
  addedBy: UserId;
}

export interface ResourceGroup {
  heading: string;
  items: ResourceItem[];
}

async function loadTasks(db: Db, lc?: number): Promise<BoardTask[]> {
  const rows = await db
    .select({ task: tasks, problem: problems })
    .from(tasks)
    .innerJoin(problems, eq(tasks.lc, problems.lc))
    .where(lc === undefined ? undefined : eq(tasks.lc, lc))
    .orderBy(asc(tasks.date), asc(tasks.id));
  const statuses = await db.select().from(taskStatus);
  const byTask = new Map<number, Record<string, Status>>();
  for (const s of statuses) byTask.set(s.taskId, { ...byTask.get(s.taskId), [s.userId]: s.status as Status });
  return rows.map(({ task, problem }) => ({
    id: task.id,
    lc: task.lc,
    title: problem.title,
    topic: problem.topic,
    url: problem.url,
    stage: task.stage as Stage,
    date: task.date,
    appliesTo: task.appliesTo as UserId[],
    statuses: { raj: "not_started", ganesh: "not_started", arbaaz: "not_started", ...byTask.get(task.id) },
  }));
}

export async function loadAll(db: Db): Promise<{
  tasks: BoardTask[];
  commentCounts: Record<number, number>;
  latestNote: Record<string, string>;
}> {
  const [allTasks, counts, all] = await Promise.all([
    loadTasks(db),
    db.select({ lc: comments.lc, n: sql<number>`count(*)::int` }).from(comments).groupBy(comments.lc),
    db.select().from(comments).orderBy(asc(comments.createdAt), asc(comments.id)),
  ]);
  const latestNote: Record<string, string> = {};
  for (const c of all) latestNote[`${c.lc}:${c.userId}`] = c.body; // later rows overwrite earlier ones
  return {
    tasks: allTasks,
    commentCounts: Object.fromEntries(counts.map((c) => [c.lc, c.n])),
    latestNote,
  };
}

export async function loadProblem(
  db: Db,
  lc: number,
): Promise<{ problem: ParsedProblem; tasks: BoardTask[]; comments: Comment[] } | null> {
  const [problem] = await db.select().from(problems).where(eq(problems.lc, lc));
  if (!problem) return null;
  const [problemTasks, rows] = await Promise.all([
    loadTasks(db, lc),
    db.select().from(comments).where(eq(comments.lc, lc)).orderBy(asc(comments.createdAt), asc(comments.id)),
  ]);
  return {
    problem,
    tasks: problemTasks,
    comments: rows.map((c) => ({
      id: c.id,
      userId: c.userId as UserId,
      body: c.body,
      createdAt: c.createdAt,
      editedAt: c.editedAt,
    })),
  };
}


export async function loadResources(db: Db): Promise<ResourceGroup[]> {
  const rows = await db.select().from(resources).orderBy(asc(resources.createdAt), asc(resources.id));
  const groups = new Map<string, ResourceGroup>();
  for (const r of rows) {
    const group = groups.get(r.heading) ?? { heading: r.heading, items: [] };
    group.items.push({
      id: r.id,
      kind: r.kind as ResourceItem["kind"],
      youtubeId: r.youtubeId,
      // rows added before links were supported only stored the video id
      url: r.url ?? `https://www.youtube.com/watch?v=${r.youtubeId}`,
      title: r.title,
      thumbnail: r.thumbnail,
      addedBy: r.addedBy as UserId,
    });
    groups.set(r.heading, group);
  }
  return [...groups.values()].sort((a, b) => a.heading.localeCompare(b.heading));
}


export async function loadExportRows(db: Db): Promise<ExportRow[]> {
  const rows = await db.select().from(tasks).orderBy(asc(tasks.position), asc(tasks.id));
  const all = await loadTasks(db);
  const statuses = new Map(all.map((t) => [t.id, t.statuses]));
  return rows
    .filter((t) => t.sheet)
    .map((t) => ({ lc: t.lc, date: t.date, sheet: t.sheet!, statuses: statuses.get(t.id)! }));
}
