import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { buildBoard, crewTotals, type BoardTask } from "@/lib/board";
import { parseTrackerCsv } from "@/lib/csv-import";

const { problems, tasks: parsed } = parseTrackerCsv(readFileSync("tests/fixtures/tracker-v1.csv", "utf8"));
const tasks: BoardTask[] = parsed.map((t, i) => {
  const p = problems.find((p) => p.lc === t.lc)!;
  return { id: i + 1, lc: t.lc, title: p.title, topic: p.topic, url: p.url, stage: t.stage, date: t.date, appliesTo: t.appliesTo, statuses: t.statuses };
});
const TODAY = "2026-10-26";
const find = (lc: number, stage: string) => tasks.find((t) => t.lc === lc && t.stage === stage)!;

test("ganesh's today on Oct 26", () => {
  const board = buildBoard(tasks, "ganesh", TODAY);
  expect(board.today.map((t) => t.lc).sort((a, b) => a - b)).toEqual([11, 206, 334, 1732]);
  expect(board.today.every((t) => t.originalPending === null)).toBe(true); // baseline/original completed
});

test("backlog: incomplete past tasks with days late, completed ones excluded", () => {
  const board = buildBoard(tasks, "ganesh", TODAY);
  const d3 = board.backlog.find((t) => t.lc === 643 && t.stage === "d3")!;
  expect(d3.daysLate).toBe(3);
  expect(board.backlog.some((t) => t.lc === 547 && t.stage === "original")).toBe(true); // in progress
  expect(board.backlog.some((t) => t.lc === 841 && t.stage === "original")).toBe(false); // completed
});

test("earlier review never shows for arbaaz", () => {
  const board = buildBoard(tasks, "arbaaz", TODAY);
  const all = [...board.today, ...board.backlog, ...board.upcoming];
  expect(all.some((t) => t.stage === "earlier_review")).toBe(false);
  expect(board.today.map((t) => t.lc)).toEqual([206]);
});

test("originalPending flags due revisions whose original is not completed", () => {
  const board = buildBoard(tasks, "arbaaz", TODAY);
  const rev = board.backlog.find((t) => t.lc === 643 && t.stage === "d3")!;
  expect(rev.originalPending).toEqual({ taskId: find(643, "original").id });
});

test("upcoming revisions are never flagged", () => {
  const board = buildBoard(tasks, "ganesh", TODAY);
  expect(board.upcoming.find((t) => t.lc === 72 && t.stage === "d3")!.originalPending).toBeNull();
  expect(board.upcoming.every((t) => t.originalPending === null)).toBe(true);
});

test("defaultTab switches to backlog when today is clear", () => {
  const done = tasks.map((t) => (t.date === TODAY ? { ...t, statuses: { ...t.statuses, ganesh: "completed" as const } } : t));
  expect(buildBoard(done, "ganesh", TODAY).defaultTab).toBe("backlog");
  expect(buildBoard(tasks, "ganesh", TODAY).defaultTab).toBe("today");
});

test("crew totals", () => {
  const crew = crewTotals(tasks, TODAY);
  expect(crew.raj.total).toBe(69);
  expect(crew.arbaaz.total).toBe(61); // the 8 baseline problems were only practised by raj+ganesh
  expect(crew.ganesh.todayTotal).toBe(4);
  expect(crew.arbaaz.todayTotal).toBe(1);
  expect(crew.raj.solved).toBeGreaterThan(crew.arbaaz.solved);
});

test("solved lists completed tasks newest first", () => {
  const board = buildBoard(tasks, "ganesh", TODAY);
  expect(board.solved.every((t) => t.statuses.ganesh === "completed")).toBe(true);
  expect(board.solved[0].lc).toBe(841); // latest completed (Oct 25)
  const dated = board.solved.filter((t) => t.date).map((t) => t.date);
  expect(dated).toEqual([...dated].sort().reverse());
});

test("solved includes previously practiced (baseline) problems last", () => {
  const board = buildBoard(tasks, "ganesh", TODAY);
  const baseline = board.solved.filter((t) => t.stage === "baseline");
  expect(baseline).toHaveLength(8);
  expect(board.solved.slice(-8).every((t) => t.stage === "baseline")).toBe(true);
  // matches the crew tile: every solved problem appears in the tab
  const solvedProblems = new Set(board.solved.filter((t) => t.stage === "original" || t.stage === "baseline").map((t) => t.lc));
  expect(solvedProblems.size).toBe(crewTotals(tasks, TODAY).ganesh.solved);
  expect(buildBoard(tasks, "arbaaz", TODAY).solved.some((t) => t.stage === "baseline")).toBe(false);
});

test("revisit: marked tasks get their own list and leave the backlog", () => {
  const board = buildBoard(tasks, "raj", TODAY);
  const t547 = tasks.find((t) => t.lc === 547 && t.stage === "original")!;
  expect(t547.statuses.raj).toBe("revisit");
  expect(board.revisit.map((t) => t.id)).toContain(t547.id);
  expect(board.backlog.some((t) => t.id === t547.id)).toBe(false);
  expect(board.revisit.every((t) => t.statuses.raj === "revisit")).toBe(true);
});

test("repeated Original rows: a problem counts as solved once any of them is completed", () => {
  // the topic-wise sheet re-schedules a solved problem as a later Original (a re-attempt)
  const t643 = find(643, "original");
  expect(t643.statuses.ganesh).toBe("completed");
  const retake: BoardTask = { ...t643, id: 9999, date: "2026-12-01", statuses: { raj: "not_started", ganesh: "not_started", arbaaz: "not_started" } };
  const withRetake = [...tasks, retake];

  expect(crewTotals(withRetake, TODAY).ganesh).toEqual(crewTotals(tasks, TODAY).ganesh);
  const board = buildBoard(withRetake, "ganesh", TODAY);
  const rev643 = [...board.today, ...board.backlog].filter((t) => t.lc === 643 && t.stage !== "original");
  expect(rev643.length).toBeGreaterThan(0);
  expect(rev643.every((t) => t.originalPending === null)).toBe(true);
});

test("a completed Baseline still counts when the sheet adds an Original for that problem", () => {
  const base = find(11, "baseline");
  expect(base.statuses.raj).toBe("completed");
  const added: BoardTask = { ...base, id: 9998, stage: "original", date: "2026-12-02", appliesTo: ["raj", "ganesh", "arbaaz"], statuses: { raj: "not_started", ganesh: "not_started", arbaaz: "not_started" } };
  const before = crewTotals(tasks, TODAY);
  const after = crewTotals([...tasks, added], TODAY);
  expect(after.raj).toEqual(before.raj);
  expect(after.arbaaz.total).toBe(before.arbaaz.total + 1); // arbaaz now has this problem too, unsolved
  expect(after.arbaaz.solved).toBe(before.arbaaz.solved);
});

test("revisit shows each problem once even if several of its rows are marked Revisit", () => {
  const t547 = find(547, "original");
  const copy: BoardTask = { ...t547, id: 9997, date: "2026-11-18" }; // same statuses, later date
  const board = buildBoard([...tasks, copy], "raj", TODAY);
  const rows547 = board.revisit.filter((t) => t.lc === 547 && t.stage === "original");
  expect(rows547.map((t) => t.id)).toEqual([t547.id]); // the earliest one
});
