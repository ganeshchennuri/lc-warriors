import type { ReactNode } from "react";
import type { Stage } from "@/lib/csv-import";
import type { Status } from "@/lib/status";

export const STATUS_DOT: Record<Status, string> = {
  not_started: "bg-dim",
  in_progress: "bg-warn",
  completed: "bg-acc",
  revisit: "bg-red",
};

export const STAGE_LABEL: Record<Stage, string> = {
  baseline: "Baseline",
  original: "New",
  d3: "Revision · D+3",
  d7: "Revision · D+7",
  d14: "Revision · D+14",
  earlier_review: "Revision · earlier",
};

const PILL_TONE = {
  plain: "bg-muted text-mut",
  rev: "bg-rev/12 text-rev",
  late: "bg-red/12 text-red",
  new: "bg-acc/12 text-acc",
};

export function Pill({ tone = "plain", children }: { tone?: keyof typeof PILL_TONE; children: ReactNode }) {
  return <span className={`rounded-full px-2 py-px text-[11px] whitespace-nowrap ${PILL_TONE[tone]}`}>{children}</span>;
}

export function StagePill({ stage }: { stage: Stage }) {
  return <Pill tone={stage === "original" || stage === "baseline" ? "new" : "rev"}>{STAGE_LABEL[stage]}</Pill>;
}
