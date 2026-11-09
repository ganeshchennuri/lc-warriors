import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { setStatus } from "@/db/mutations";
import { loadAll, loadExportRows } from "@/db/queries";
import { seed } from "@/db/seed";
import { applySync, lastImport, planSync, planUpload } from "@/db/sync";
import { toTrackerCsv } from "@/lib/csv-export";
import { testDb } from "./helpers/db";

const OLD = readFileSync("tests/fixtures/tracker-v1.csv", "utf8");
const NEW = readFileSync("tests/fixtures/tracker-v2.csv", "utf8");

test("sync adds new rows, applies sheet edits, keeps site edits", async () => {
  const db = await testDb();
  await seed(db, OLD);
  const before = await loadAll(db);
  const t547 = before.tasks.find((t) => t.lc === 547 && t.stage === "original")!;
  await setStatus(db, t547.id, "ganesh", "completed"); // edited on the site

  const plan = await planSync(db, OLD, NEW);
  expect(plan.newProblems.map((p) => p.lc)).toEqual([1456, 739, 901, 1372, 236, 1926]);
  expect(plan.newTasks).toHaveLength(24);
  expect(plan.statusChanges).toEqual([
    { key: "104:original:2026-10-24", user: "arbaaz", from: "in_progress", to: "completed" },
    { key: "198:original:2026-10-24", user: "arbaaz", from: "not_started", to: "in_progress" },
  ]);
  expect(plan.removed).toEqual([]);
  expect(plan.updatedProblems).toEqual([]);

  await applySync(db, plan);
  const after = await loadAll(db);
  expect(after.tasks).toHaveLength(294);
  expect(after.tasks.find((t) => t.id === t547.id)!.statuses.ganesh).toBe("completed");

  // exported sheet == new sheet, except the site-only edit
  const expected = NEW.replace(
    "Number of Provinces,Graph,Original,Revisit,In Progress,",
    "Number of Provinces,Graph,Original,Revisit,Completed,",
  );
  expect(toTrackerCsv(await loadExportRows(db))).toBe(expected);

  // the applied sheet becomes the base: re-uploading it is a no-op
  expect(await lastImport(db)).toBe(NEW);
  const again = await planUpload(db, NEW, () => Promise.reject(new Error("unused")));
  expect([again.newProblems.length, again.newTasks.length, again.statusChanges.length, again.removed.length]).toEqual([0, 0, 0, 0]);
});

test("uploaded sheet reschedules tasks and renames problems", async () => {
  const db = await testDb();
  await seed(db, OLD);
  // move every #547 task one day later and rename #1 in the sheet
  const edited = OLD.replace(/^(\d{4}-\d{2}-\d{2})(,.*,547,)/gm, (_, d: string, rest: string) => {
    const next = new Date(`${d}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString().slice(0, 10) + rest;
  }).replace("Number of Provinces,Graph,Original", "Number of Provinces (DSU),Graph,Original");
  expect(edited).not.toBe(OLD);

  const plan = await planUpload(db, edited, () => Promise.reject(new Error("seed records the base")));
  expect(plan.removed.length).toBeGreaterThan(0);
  expect(plan.removed.every((k) => k.startsWith("547:"))).toBe(true);
  expect(plan.newTasks.map((t) => t.lc)).toEqual(plan.removed.map(() => 547));
  expect(plan.updatedProblems.map((p) => p.title)).toEqual(["Number of Provinces (DSU)"]);

  await applySync(db, plan);
  const tasks547 = (await loadAll(db)).tasks.filter((t) => t.lc === 547);
  expect(tasks547.map((t) => `${t.lc}:${t.stage}:${t.date ?? "none"}`).sort()).toEqual(plan.newTasks.map((t) => t.key).sort());
  expect(toTrackerCsv(await loadExportRows(db))).toBe(edited);
});

test("rejects a sheet that is empty or not the tracker", async () => {
  const db = await testDb();
  await seed(db, OLD);
  const header = OLD.split("\r\n")[0];
  await expect(planSync(db, OLD, `${header}\r\n`)).rejects.toThrow("no rows");
  await expect(planSync(db, OLD, "name,age\r\nbob,3\r\n")).rejects.toThrow("Line 2");
});
