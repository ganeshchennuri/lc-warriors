import { parseTrackerCsv } from "@/lib/csv-import";
import { ALL_USER_IDS } from "@/lib/users";
import type { Db } from "./client";
import { problems, sheetImports, tasks, taskStatus } from "./schema";

/** One-time import of the tracker CSV into an empty database. */
export async function seed(db: Db, csvText: string): Promise<{ problems: number; tasks: number }> {
  const existing = await db.select({ lc: problems.lc }).from(problems).limit(1);
  if (existing.length > 0) throw new Error("Database already seeded");

  const parsed = parseTrackerCsv(csvText);
  await db.insert(problems).values(parsed.problems);
  const inserted = await db
    .insert(tasks)
    .values(parsed.tasks.map(({ key, lc, stage, date, appliesTo, sheet }, position) => ({ key, lc, stage, date, appliesTo, sheet, position })))
    .returning({ id: tasks.id, key: tasks.key });

  const idByKey = new Map(inserted.map((t) => [t.key, t.id]));
  await db.insert(taskStatus).values(
    parsed.tasks.flatMap((t) =>
      ALL_USER_IDS.map((userId) => ({ taskId: idByKey.get(t.key)!, userId, status: t.statuses[userId] })),
    ),
  );
  await db.insert(sheetImports).values({ csv: csvText });
  return { problems: parsed.problems.length, tasks: parsed.tasks.length };
}
