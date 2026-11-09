"use client";

import type { CrewStats } from "@/lib/board";
import { USERS, type UserId } from "@/lib/users";
import { useUser } from "./UserProvider";

export function CrewStrip({ crew }: { crew: Record<UserId, CrewStats> }) {
  const { user } = useUser();
  return (
    <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
      {USERS.map((u) => {
        const s = crew[u.id];
        const you = u.id === user;
        return (
          <div
            key={u.id}
            className={`flex min-w-36 flex-1 items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 ${
              you ? "border-acc/50" : "border-line"
            }`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-card2 font-mono text-sm font-bold ${you ? "text-acc" : ""}`}
            >
              {u.monogram}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2 text-[13px]">
                <span className="truncate">
                  {u.id}
                  {you && <span className="text-mut"> · you</span>}
                </span>
                <span className="font-mono text-xs text-mut">
                  {s.solved}/{s.total}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-acc" style={{ width: `${(s.solved / s.total) * 100}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-dim">
                today {s.todayDone}/{s.todayTotal}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
