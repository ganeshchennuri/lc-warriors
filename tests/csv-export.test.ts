import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { toTrackerCsv } from "@/lib/csv-export";
import { parseTrackerCsv } from "@/lib/csv-import";

test("export round-trips the sheet byte-for-byte", () => {
  for (const file of ["tests/fixtures/tracker-v1.csv", "tests/fixtures/tracker-v2.csv"]) {
    const csv = readFileSync(file, "utf8");
    expect(toTrackerCsv(parseTrackerCsv(csv).tasks)).toBe(csv);
  }
});

test("export reflects changed statuses and escapes commas", () => {
  const [first] = parseTrackerCsv(readFileSync("tests/fixtures/tracker-v1.csv", "utf8")).tasks;
  const out = toTrackerCsv([
    { ...first, statuses: { ...first.statuses, arbaaz: "revisit" }, sheet: { ...first.sheet, problem: 'A, "B"' } },
  ]);
  expect(out.split("\r\n")[1]).toBe(
    ',,Previously Practiced,11,"A, ""B""",Two Pointers,Baseline,Completed,Completed,Revisit,,,',
  );
});
