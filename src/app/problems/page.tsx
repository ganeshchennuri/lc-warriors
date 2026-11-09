import { connection } from "next/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/PageSkeleton";
import { ProblemsView } from "@/components/ProblemsView";
import { getDb } from "@/db/client";
import { loadAll } from "@/db/queries";

async function ProblemsData() {
  await connection();
  const { tasks, commentCounts } = await loadAll(getDb());
  return <ProblemsView tasks={tasks} commentCounts={commentCounts} />;
}

export default function ProblemsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProblemsData />
    </Suspense>
  );
}
