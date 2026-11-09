import { readFileSync } from "node:fs";
import { getDb } from "../src/db/client";
import { seed } from "../src/db/seed";

seed(getDb(), readFileSync("data/tracker.csv", "utf8"))
  .then((counts) => {
    console.log(`${counts.problems} problems, ${counts.tasks} tasks`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
