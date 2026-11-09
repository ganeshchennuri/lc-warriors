import { connection } from "next/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/PageSkeleton";
import { ResourcesView } from "@/components/ResourcesView";
import { getDb } from "@/db/client";
import { loadResources } from "@/db/queries";

async function ResourcesData() {
  await connection();
  return <ResourcesView groups={await loadResources(getDb())} />;
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ResourcesData />
    </Suspense>
  );
}
