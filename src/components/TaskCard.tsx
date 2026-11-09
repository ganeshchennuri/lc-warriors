"use client";

import { ExternalLink, Lightbulb, MessageSquare } from "lucide-react";
import Link from "next/link";
import type { BoardItem } from "@/lib/board";
import { USERS } from "@/lib/users";
import { StatusSelect } from "./StatusSelect";
import { Pill, StagePill } from "./ui";
import { useUser } from "./UserProvider";

const BADGE = {
  completed: "bg-acc/12 text-acc",
  in_progress: "bg-warn/12 text-warn",
  revisit: "bg-warn/12 text-warn",
  not_started: "bg-muted text-dim",
};

export function TaskCard({
  item,
  commentCount,
  note,
  onJumpToOriginal,
  dimDone = true,
}: {
  item: BoardItem;
  dimDone?: boolean;
  commentCount: number;
  note?: string;
  onJumpToOriginal?: (taskId: number) => void;
}) {
  const { user } = useUser();
  const status = item.statuses[user];
  const done = dimDone && status === "completed";

  return (
    <article
      id={`task-${item.id}`}
      className={`flex flex-wrap gap-x-4 gap-y-3 rounded-xl border border-line bg-card px-4 py-3.5 transition-[border-color,opacity] duration-150 hover:border-[#3a4660] sm:flex-nowrap ${
        done ? "opacity-60" : ""
      }`}
    >
      <span className="w-11 shrink-0 pt-0.5 font-mono text-xs text-dim">#{item.lc}</span>
      <div className="min-w-0 flex-1 basis-[calc(100%-4rem)] sm:basis-auto">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-2 text-[15px] font-semibold transition-colors duration-150 hover:text-acc ${
            done ? "line-through decoration-dim" : ""
          }`}
        >
          {item.title}
          <ExternalLink aria-hidden className="h-3.5 w-3.5 shrink-0 text-dim" />
        </a>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StagePill stage={item.stage} />
          {item.topic && <Pill>{item.topic}</Pill>}
          {item.daysLate > 0 && <Pill tone="late">{item.daysLate}d late</Pill>}
          <span className="ml-1 inline-flex gap-0.5" aria-label="Crew status">
            {USERS.filter((u) => item.appliesTo.includes(u.id)).map((u) => (
              <span
                key={u.id}
                title={`${u.name}: ${item.statuses[u.id].replace("_", " ")}`}
                className={`grid h-[18px] w-[18px] place-items-center rounded font-mono text-[10px] font-bold ${BADGE[item.statuses[u.id]]}`}
              >
                {u.monogram}
              </span>
            ))}
          </span>
        </div>
        {item.originalPending && (
          <button
            type="button"
            onClick={() => onJumpToOriginal?.(item.originalPending!.taskId)}
            className="mt-2 cursor-pointer text-xs text-red hover:underline"
          >
            Finish the original first →
          </button>
        )}
        {note && (
          <div className="mt-2.5 flex gap-2 rounded-r-lg border-l-2 border-warn bg-warn/6 px-2.5 py-2 text-[13px] text-[#cbd5e1]">
            <Lightbulb aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
            <p className="line-clamp-2 whitespace-pre-wrap">{note}</p>
          </div>
        )}
      </div>
      <div className="ml-15 flex w-full items-center justify-between gap-2 sm:ml-0 sm:w-auto sm:flex-col sm:items-end sm:justify-start">
        <StatusSelect key={status} taskId={item.id} status={status} />
        <Link
          href={`/problems/${item.lc}`}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-mut transition-colors duration-150 hover:bg-card2 hover:text-fg"
        >
          <MessageSquare aria-hidden className="h-3.5 w-3.5" />
          {commentCount ? `${commentCount} comment${commentCount === 1 ? "" : "s"}` : "Add note"}
        </Link>
      </div>
    </article>
  );
}
