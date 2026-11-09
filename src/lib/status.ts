export type Status = "not_started" | "in_progress" | "completed" | "revisit";

export const STATUSES: readonly Status[] = ["not_started", "in_progress", "completed", "revisit"];

export const STATUS_LABELS: Record<Status, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  revisit: "Revisit",
};

const CSV_STATUS: Record<string, Status> = {
  "Not Started": "not_started",
  "In Progress": "in_progress",
  Completed: "completed",
  Revisit: "revisit",
};

export function isStatus(x: unknown): x is Status {
  return typeof x === "string" && (STATUSES as readonly string[]).includes(x);
}

export function fromCsvStatus(s: string): Status {
  const status = CSV_STATUS[s.trim()];
  if (!status) throw new Error(`Unknown CSV status: ${s}`);
  return status;
}
