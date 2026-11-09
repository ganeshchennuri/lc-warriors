import { connection } from "next/server";
import { Suspense } from "react";
import { HomeView } from "@/components/HomeView";
import { PageSkeleton } from "@/components/PageSkeleton";
import { getDb } from "@/db/client";
import { loadAll } from "@/db/queries";
import { currentDay } from "@/lib/day";

async function HomeData() {
  await connection();
  const data = await loadAll(getDb());
  return <HomeView {...data} today={currentDay(new Date())} />;
}

export default function Home() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HomeData />
    </Suspense>
  );
}
