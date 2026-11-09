import { parse } from "csv-parse/sync";
import { fromCsvStatus, type Status } from "./status";
import { ALL_USER_IDS, type UserId } from "./users";

export type Stage = "baseline" | "original" | "d3" | "d7" | "d14" | "earlier_review";

export const STAGE_ORDER: Stage[] = ["baseline", "original", "d3", "d7", "d14", "earlier_review"];

export interface ParsedProblem {
  lc: number;
  title: string;
  topic: string;
  url: string;
}

/** The sheet's own columns for a row, kept so the sheet can be re-exported as-is. */
export interface SheetMeta {
  day: string;
  task: string;
  problem: string;
  topic: string;
  reviewStage: string;
  originalDate: string;
  eligibility: string;
  link: string;
}

export const SHEET_COLUMNS = [
  "Date",
  "Day",
  "Task",
  "LC #",
  "Problem",
  "Topic",
  "Review Stage",
  "Raj — Status",
  "Ganesh — Status",
  "Arbaaz — Status",
  "Original Date",
  "Eligibility (Raj / Ganesh)",
  "LeetCode Link",
] as const;

export interface ParsedTask {
  key: string;
  lc: number;
  stage: Stage;
  date: string | null;
  appliesTo: UserId[];
  statuses: Record<UserId, Status>;
  sheet: SheetMeta;
}

const STAGES: Record<string, Stage> = {
  Baseline: "baseline",
  Original: "original",
  "D+3": "d3",
  "D+7": "d7",
  "D+14": "d14",
  "Earlier Review": "earlier_review",
};

export const STATUS_COLUMNS: Record<UserId, string> = {
  raj: "Raj — Status",
  ganesh: "Ganesh — Status",
  arbaaz: "Arbaaz — Status",
};

type Row = Record<string, string>;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normaliseUrl(link: string): string {
  return `${link.replace(/\/+$/, "")}/`;
}

export function parseTrackerCsv(text: string): { problems: ParsedProblem[]; tasks: ParsedTask[] } {
  const rows: Row[] = parse(text, { columns: true, skip_empty_lines: true, trim: true });

  const tasks: ParsedTask[] = rows.map((row, i) => {
    const lc = Number(row["LC #"]);
    const stage = STAGES[row["Review Stage"]];
    // +2: the header is line 1
    if (!Number.isInteger(lc) || !stage) throw new Error(`Line ${i + 2}: missing LC # or unknown Review Stage "${row["Review Stage"] ?? ""}"`);
    const date = row["Date"] || null;
    const statuses = Object.fromEntries(
      ALL_USER_IDS.map((u) => [u, fromCsvStatus(row[STATUS_COLUMNS[u]])]),
    ) as Record<UserId, Status>;
    return {
      key: `${lc}:${stage}:${date ?? "none"}`,
      lc,
      stage,
      date,
      // Baseline problems (and their Earlier Reviews) were only practised by Raj and Ganesh.
      appliesTo: stage === "earlier_review" || stage === "baseline" ? ["raj", "ganesh"] : [...ALL_USER_IDS],
      statuses,
      sheet: {
        day: row["Day"],
        task: row["Task"],
        problem: row["Problem"],
        topic: row["Topic"],
        reviewStage: row["Review Stage"],
        originalDate: row["Original Date"],
        eligibility: row["Eligibility (Raj / Ganesh)"],
        link: row["LeetCode Link"],
      },
    };
  });

  const byLc = new Map<number, Row[]>();
  for (const row of rows) {
    const lc = Number(row["LC #"]);
    byLc.set(lc, [...(byLc.get(lc) ?? []), row]);
  }

  const problems: ParsedProblem[] = [...byLc].map(([lc, lcRows]) => {
    const canonical = lcRows.find((r) => r["Review Stage"] === "Original" || r["Review Stage"] === "Baseline");
    if (!canonical) throw new Error(`No Original/Baseline row for LC ${lc}`);
    const title = canonical["Problem"];
    const link = lcRows.map((r) => r["LeetCode Link"]).find((l) => l.includes("/problems/"));
    return {
      lc,
      title,
      topic: canonical["Topic"],
      url: link ? normaliseUrl(link) : `https://leetcode.com/problems/${slugify(title)}/`,
    };
  });

  return { problems, tasks };
}
