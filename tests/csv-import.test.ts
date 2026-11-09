import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { parseTrackerCsv } from "@/lib/csv-import";

const { problems, tasks } = parseTrackerCsv(readFileSync("tests/fixtures/tracker-v1.csv", "utf8"));

test("counts", () => {
  expect(problems).toHaveLength(69);
  expect(tasks).toHaveLength(270);
  expect(tasks.filter((t) => t.stage === "baseline")).toHaveLength(8);
  expect(tasks.filter((t) => t.stage === "earlier_review")).toHaveLength(18);
  expect(new Set(tasks.map((t) => t.key)).size).toBe(270);
});

test("revision inherits title/topic/url from original", () => {
  expect(problems.find((p) => p.lc === 643)).toEqual({
    lc: 643,
    title: "Maximum Average Subarray I",
    topic: "Sliding Window",
    url: "https://leetcode.com/problems/maximum-average-subarray-i/",
  });
});

test("baseline problem gets url from earlier-review row", () => {
  const p = problems.find((p) => p.lc === 11)!;
  expect(p.url).toBe("https://leetcode.com/problems/container-with-most-water/");
  expect(p.topic).toBe("Two Pointers");
});

test("url without trailing slash is normalised", () => {
  expect(problems.find((p) => p.lc === 2215)!.url).toBe(
    "https://leetcode.com/problems/find-the-difference-of-two-arrays/",
  );
});

test("parenthesised slug kept as-is", () => {
  expect(problems.find((p) => p.lc === 208)!.url).toBe("https://leetcode.com/problems/implement-trie-(prefix-tree)/");
});

test("earlier review applies to raj+ganesh only", () => {
  const er = tasks.find((t) => t.stage === "earlier_review")!;
  expect(er.appliesTo).toEqual(["raj", "ganesh"]);
  expect(tasks.find((t) => t.stage === "d3")!.appliesTo).toEqual(["raj", "ganesh", "arbaaz"]);
});

test("statuses seeded", () => {
  const t = tasks.find((t) => t.lc === 547 && t.stage === "original")!;
  expect(t.date).toBe("2026-10-25");
  expect(t.statuses).toEqual({ raj: "revisit", ganesh: "in_progress", arbaaz: "not_started" });
});

test("baseline has null date and arbaaz not_started", () => {
  const b = tasks.find((t) => t.lc === 374 && t.stage === "baseline")!;
  expect(b.date).toBeNull();
  expect(b.statuses).toEqual({ raj: "completed", ganesh: "completed", arbaaz: "not_started" });
  expect(b.appliesTo).toEqual(["raj", "ganesh"]);
});

test("slug fallback when no /problems/ link exists", () => {
  const csv = [
    "Date,Day,Task,LC #,Problem,Topic,Review Stage,Raj — Status,Ganesh — Status,Arbaaz — Status,Original Date,Eligibility (Raj / Ganesh),LeetCode Link",
    ",,Previously Practiced,1,Two Sum: Easy!,Array,Baseline,Completed,Completed,Not Started,,,",
  ].join("\n");
  expect(parseTrackerCsv(csv).problems[0].url).toBe("https://leetcode.com/problems/two-sum-easy/");
});
