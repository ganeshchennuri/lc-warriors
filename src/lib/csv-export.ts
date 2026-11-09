import { SHEET_COLUMNS, STATUS_COLUMNS, type SheetMeta } from "./csv-import";
import type { Status } from "./status";
import { ALL_USER_IDS, type UserId } from "./users";

const CSV_LABELS: Record<Status, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  revisit: "Revisit",
};

export interface ExportRow {
  lc: number;
  date: string | null;
  sheet: SheetMeta;
  statuses: Record<UserId, Status>;
}

function cell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Rebuilds the tracker sheet (same columns and row order as the import) with the site's current statuses. */
export function toTrackerCsv(rows: ExportRow[]): string {
  const lines = rows.map((r) => {
    const values: Record<string, string> = {
      Date: r.date ?? "",
      Day: r.sheet.day,
      Task: r.sheet.task,
      "LC #": String(r.lc),
      Problem: r.sheet.problem,
      Topic: r.sheet.topic,
      "Review Stage": r.sheet.reviewStage,
      "Original Date": r.sheet.originalDate,
      "Eligibility (Raj / Ganesh)": r.sheet.eligibility,
      "LeetCode Link": r.sheet.link,
    };
    for (const u of ALL_USER_IDS) values[STATUS_COLUMNS[u]] = CSV_LABELS[r.statuses[u]];
    return SHEET_COLUMNS.map((c) => cell(values[c])).join(",");
  });
  // CRLF, like a Google Sheets CSV download
  return [SHEET_COLUMNS.join(","), ...lines].join("\r\n");
}
