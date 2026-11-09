import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { taskStatus } from "@/db/schema";
import { seed } from "@/db/seed";
import { testDb } from "./helpers/db";

test("seed loads everything once", async () => {
  const db = await testDb();
  const csv = readFileSync("tests/fixtures/tracker-v1.csv", "utf8");
  expect(await seed(db, csv)).toEqual({ problems: 69, tasks: 270 });
  const rows = await db.select().from(taskStatus);
  expect(rows).toHaveLength(270 * 3);
  await expect(seed(db, csv)).rejects.toThrow("Database already seeded");
});
