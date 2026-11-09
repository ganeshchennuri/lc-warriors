"use client";

import { ChevronDown } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { setStatusAction } from "@/app/actions";
import { STATUS_LABELS, STATUSES, type Status } from "@/lib/status";
import { STATUS_DOT } from "./ui";
import { useUser } from "./UserProvider";

export function StatusSelect({ taskId, status }: { taskId: number; status: Status }) {
  const { user } = useUser();
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: Status) {
    setError(null);
    startTransition(async () => {
      setOptimistic(next);
      const result = await setStatusAction(taskId, user, next);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="relative flex min-w-36 cursor-pointer items-center rounded-lg border border-line bg-bg text-xs transition-colors duration-150 hover:border-dim">
        <span className="sr-only">Status</span>
        <span aria-hidden className={`pointer-events-none absolute left-2.5 h-2 w-2 rounded-full ${STATUS_DOT[optimistic]}`} />
        <select
          value={optimistic}
          disabled={pending}
          onChange={(e) => change(e.target.value as Status)}
          className="w-full cursor-pointer appearance-none bg-transparent py-2 pr-7 pl-6 outline-none disabled:opacity-70"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} className="bg-card2">
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-dim" />
      </label>
      {error && <span className="text-[11px] text-red">{error}</span>}
    </div>
  );
}
