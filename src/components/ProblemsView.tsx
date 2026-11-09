"use client";

import { Download, MessageSquare, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { BoardTask } from "@/lib/board";
import { STATUS_LABELS } from "@/lib/status";
import { USERS } from "@/lib/users";
import { SheetUpload } from "./SheetUpload";
import { STATUS_DOT, STAGE_LABEL } from "./ui";

const DOT_STAGES = ["baseline", "original", "d3", "d7", "d14"] as const;

export function ProblemsView({ tasks, commentCounts }: { tasks: BoardTask[]; commentCounts: Record<number, number> }) {
  const [topic, setTopic] = useState("All");
  const [query, setQuery] = useState("");

  const problems = useMemo(() => {
    const byLc = Map.groupBy(tasks, (t) => t.lc);
    return [...byLc.values()]
      .map((ts) => ({ ...ts[0], tasks: ts }))
      .sort((a, b) => (a.tasks[0].date ?? "").localeCompare(b.tasks[0].date ?? "") || a.lc - b.lc);
  }, [tasks]);
  const topics = useMemo(() => ["All", ...new Set(problems.map((p) => p.topic))].sort(), [problems]);

  const q = query.trim().toLowerCase();
  const visible = problems.filter(
    (p) => (topic === "All" || p.topic === topic) && (!q || p.title.toLowerCase().includes(q) || String(p.lc).includes(q)),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Problems</h1>
          <p className="mt-0.5 text-sm text-mut">{problems.length} problems in the plan</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <a
            href="/api/sheet"
            download
            className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-mut transition-colors duration-150 hover:border-acc hover:text-fg"
          >
            <Download aria-hidden className="h-4 w-4" /> Download sheet (CSV)
          </a>
          <SheetUpload />
        </div>
      </div>

      <label className="mt-5 flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 focus-within:border-acc">
        <Search aria-hidden className="h-4 w-4 text-dim" />
        <span className="sr-only">Search problems</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or number"
          className="w-full bg-transparent text-sm outline-none placeholder:text-dim"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {topics.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTopic(t)}
            aria-pressed={topic === t}
            className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors duration-150 ${
              topic === t ? "border-acc bg-acc/12 text-acc" : "border-line text-mut hover:text-fg"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <ul className="mt-5 flex flex-col gap-2">
        {visible.map((p) => (
          <li key={p.lc}>
            <Link
              href={`/problems/${p.lc}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-card px-4 py-3 transition-colors duration-150 hover:border-[#3a4660]"
            >
              <span className="w-11 font-mono text-xs text-dim">#{p.lc}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{p.title}</span>
                <span className="text-xs text-dim">{p.topic}</span>
              </span>
              <span className="flex items-center gap-4">
                {USERS.map((u) => (
                  <span key={u.id} className="flex items-center gap-1" aria-label={`${u.name} progress`}>
                    <span className="font-mono text-[10px] text-dim">{u.monogram}</span>
                    {DOT_STAGES.map((stage) => {
                      const t = p.tasks.find((x) => x.stage === stage && x.appliesTo.includes(u.id));
                      if (!t) return null;
                      return (
                        <span
                          key={stage}
                          title={`${u.name} · ${STAGE_LABEL[stage]}: ${STATUS_LABELS[t.statuses[u.id]]}`}
                          className={`h-2 w-2 rounded-full ${STATUS_DOT[t.statuses[u.id]]}`}
                        />
                      );
                    })}
                  </span>
                ))}
                {commentCounts[p.lc] ? (
                  <span className="flex items-center gap-1 text-xs text-mut">
                    <MessageSquare aria-hidden className="h-3.5 w-3.5" />
                    {commentCounts[p.lc]}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
        {visible.length === 0 && <li className="py-10 text-center text-sm text-mut">No problems match.</li>}
      </ul>
    </main>
  );
}
