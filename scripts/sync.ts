// Usage: npm run db:sync -- "<new sheet>.csv" [--apply]
import { readFileSync } from "node:fs";
import { getDb } from "../src/db/client";
import { applySync, planUpload } from "../src/db/sync";

// base for the three-way merge when the database has no recorded import yet
const FIRST_IMPORT = "data/tracker.csv";
const file = process.argv[2];
const apply = process.argv.includes("--apply");

async function main() {
  if (!file) throw new Error('Usage: npm run db:sync -- "<sheet>.csv" [--apply]');
  const db = getDb();
  const plan = await planUpload(db, readFileSync(file, "utf8"), async () => readFileSync(FIRST_IMPORT, "utf8"));

  console.log(`New problems: ${plan.newProblems.map((p) => `#${p.lc} ${p.title}`).join(", ") || "none"}`);
  console.log(`New tasks: ${plan.newTasks.length}`);
  console.log(`Status changes from the sheet: ${plan.statusChanges.length}`);
  for (const c of plan.statusChanges) console.log(`  ${c.key} ${c.user}: ${c.from} → ${c.to}`);
  if (plan.updatedProblems.length) console.log(`Updated problems: ${plan.updatedProblems.map((p) => `#${p.lc}`).join(", ")}`);
  if (plan.removed.length) console.log(`Removed (no longer in the sheet): ${plan.removed.join(", ")}`);

  if (!apply) return console.log("\nDry run. Re-run with --apply to write.");
  await applySync(db, plan);
  console.log("\nApplied. This sheet is now the base for the next sync.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
