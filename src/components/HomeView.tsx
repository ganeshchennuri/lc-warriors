"use client";

import { Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { buildBoard, crewTotals, type BoardItem, type BoardTask } from "@/lib/board";
import { CrewStrip } from "./CrewStrip";
import { TaskCard } from "./TaskCard";
import { PageSkeleton } from "./PageSkeleton";
import { useUser, useUserState } from "./UserProvider";

type Tab = "today" | "backlog" | "revisit" | "upcoming" | "solved";

function formatDay(day: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

interface HomeProps {
  tasks: BoardTask[];
  commentCounts: Record<number, number>;
  latestNote: Record<string, string>;
  today: string;
}

export function HomeView(props: HomeProps) {
  const { user } = useUserState();
  if (!user) return <PageSkeleton />;
  // keyed by user so the opening tab is chosen once per profile, not after every status change
  return <UserBoard key={user} {...props} />;
}

function UserBoard({ tasks, commentCounts, latestNote, today }: HomeProps) {
  const { user } = useUser();
  const board = useMemo(() => buildBoard(tasks, user, today), [tasks, user, today]);
  const crew = useMemo(() => crewTotals(tasks, today), [tasks, today]);
  const [tab, setTab] = useState<Tab>(board.defaultTab);

  function jumpToOriginal(taskId: number) {
    const tabs = ["today", "backlog", "revisit"] as const;
    setTab(tabs.find((t) => board[t].some((x) => x.id === taskId)) ?? "backlog");
    requestAnimationFrame(() => {
      const el = document.getElementById(`task-${taskId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.classList.add("ring-2", "ring-red/60");
      setTimeout(() => el?.classList.remove("ring-2", "ring-red/60"), 1600);
    });
  }

  const card = (item: BoardItem) => (
    <TaskCard
      key={item.id}
      item={item}
      dimDone={tab !== "solved"}
      commentCount={commentCounts[item.lc] ?? 0}
      note={latestNote[`${item.lc}:${user}`]}
      onJumpToOriginal={jumpToOriginal}
    />
  );

  const upcomingByDate = Map.groupBy(board.upcoming, (t) => t.date!);

  const tabs: { id: Tab; label: string; count?: number; alert?: boolean }[] = [
    { id: "today", label: "Today", count: board.today.length },
    { id: "backlog", label: "Backlog", count: board.backlog.length, alert: board.backlog.length > 0 },
    { id: "revisit", label: "Revisit", count: board.revisit.length },
    { id: "upcoming", label: "Upcoming" },
    { id: "solved", label: "Solved", count: board.solved.length },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{formatDay(today, { weekday: "long", month: "short", day: "numeric" })}</h1>
          <p className="mt-0.5 text-sm text-mut">
            {board.today.length} due today · {board.backlog.length} waiting in backlog
            {board.revisit.length > 0 && ` · ${board.revisit.length} to revisit`}
          </p>
        </div>
        <p className="flex items-center gap-1.5 font-mono text-xs text-dim">
          <Clock aria-hidden className="h-3.5 w-3.5" /> day ends 6:00 AM
        </p>
      </div>

      <CrewStrip crew={crew} />

      <div role="tablist" className="mb-4 flex items-center overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px mr-4 flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-1 py-2 text-sm sm:mr-5 transition-colors duration-150 ${
              tab === t.id ? "border-acc text-fg" : "border-transparent text-mut hover:text-fg"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`rounded px-1.5 font-mono text-[11px] ${t.alert ? "bg-red/12 text-red" : "bg-muted text-mut"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
        {tab === "today" && board.today.length > 0 && (
          <span className="ml-auto hidden shrink-0 font-mono text-xs text-mut sm:inline">
            {board.todayDone} / {board.today.length} done
          </span>
        )}
      </div>

      <section className="flex flex-col gap-2.5">
        {tab === "today" && (board.today.length ? board.today.map(card) : <Empty text="Nothing due today." />)}
        {tab === "backlog" && (board.backlog.length ? board.backlog.map(card) : <Empty text="All caught up." />)}
        {tab === "revisit" &&
          (board.revisit.length ? (
            <>
              <p className="text-xs text-mut">Problems you flagged to come back to. Set a new status once you&apos;ve redone one.</p>
              {board.revisit.map(card)}
            </>
          ) : (
            <Empty text="Nothing flagged for revisit." />
          ))}
        {tab === "upcoming" &&
          (board.upcoming.length ? (
            [...upcomingByDate].map(([date, items]) => (
              <div key={date} className="flex flex-col gap-2.5">
                <h2 className="mt-3 font-mono text-xs text-mut first:mt-0">
                  {formatDay(date, { weekday: "short", month: "short", day: "numeric" })}
                </h2>
                {items.map(card)}
              </div>
            ))
          ) : (
            <Empty text="Nothing scheduled ahead." />
          ))}
        {tab === "solved" &&
          (board.solved.length ? (
            <>
              <p className="text-xs text-mut">Marked something done by mistake? Change its status here.</p>
              {board.solved.filter((t) => t.date).map(card)}
              {board.solved.some((t) => !t.date) && (
                <h2 className="mt-3 font-mono text-xs text-mut">Previously practiced</h2>
              )}
              {board.solved.filter((t) => !t.date).map(card)}
            </>
          ) : (
            <Empty text="Nothing solved yet." />
          ))}
      </section>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-mut">{text}</p>;
}
