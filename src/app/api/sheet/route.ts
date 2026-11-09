import { connection } from "next/server";
import { getDb } from "@/db/client";
import { loadExportRows } from "@/db/queries";
import { toTrackerCsv } from "@/lib/csv-export";
import { currentDay } from "@/lib/day";

/** The tracker sheet with everyone's current statuses, in the original Google Sheet layout. */
export async function GET() {
  await connection();
  const csv = toTrackerCsv(await loadExportRows(getDb()));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="LeetCode_75_Tracker_${currentDay(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
