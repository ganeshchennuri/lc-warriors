import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CommentThread } from "@/components/CommentThread";
import { PageSkeleton } from "@/components/PageSkeleton";
import { STATUS_DOT, StagePill, Pill } from "@/components/ui";
import { getDb } from "@/db/client";
import { loadProblem } from "@/db/queries";
import { STATUS_LABELS } from "@/lib/status";
import { USERS } from "@/lib/users";

async function ProblemData({ params }: { params: Promise<{ lc: string }> }) {
  await connection();
  const lc = Number((await params).lc);
  const data = Number.isInteger(lc) ? await loadProblem(getDb(), lc) : null;
  if (!data) notFound();
  const { problem, tasks, comments } = data;
  const scheduled = tasks.filter((t) => t.date !== null || t.stage === "baseline");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/problems" className="mb-4 inline-flex items-center gap-1.5 text-sm text-mut hover:text-fg">
        <ArrowLeft aria-hidden className="h-4 w-4" /> All problems
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm text-dim">#{problem.lc}</span>
        <h1 className="text-2xl font-semibold">{problem.title}</h1>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Pill>{problem.topic}</Pill>
        <a
          href={problem.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-acc hover:underline"
        >
          Open on LeetCode <ExternalLink aria-hidden className="h-3.5 w-3.5" />
        </a>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold text-mut">Schedule</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-dim">
              <th className="px-4 py-2.5 font-medium">Stage</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
              {USERS.map((u) => (
                <th key={u.id} className="px-3 py-2.5 text-center font-mono font-medium">
                  {u.monogram}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scheduled.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5">
                  <StagePill stage={t.stage} />
                </td>
                <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap text-mut">{t.date ?? "before plan"}</td>
                {USERS.map((u) => (
                  <td key={u.id} className="px-3 py-2.5 text-center">
                    {t.appliesTo.includes(u.id) ? (
                      <span
                        title={`${u.name}: ${STATUS_LABELS[t.statuses[u.id]]}`}
                        className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT[t.statuses[u.id]]}`}
                      />
                    ) : (
                      <span className="text-dim">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold text-mut">Notes &amp; discussion</h2>
      <CommentThread lc={problem.lc} comments={comments} />
    </main>
  );
}

export default function ProblemPage(props: PageProps<"/problems/[lc]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProblemData params={props.params} />
    </Suspense>
  );
}
