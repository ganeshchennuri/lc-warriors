import { expect, test } from "vitest";
import { isUserId } from "@/lib/users";
import { fromCsvStatus } from "@/lib/status";

test("isUserId rejects stale values", () => {
  expect(isUserId("raj")).toBe(true);
  expect(isUserId("bob")).toBe(false);
  expect(isUserId(null)).toBe(false);
});

test("fromCsvStatus maps sheet values", () => {
  expect(fromCsvStatus("Not Started")).toBe("not_started");
  expect(fromCsvStatus("In Progress")).toBe("in_progress");
  expect(fromCsvStatus("Completed")).toBe("completed");
  expect(fromCsvStatus("Revisit")).toBe("revisit");
  expect(() => fromCsvStatus("Done?")).toThrow();
});
