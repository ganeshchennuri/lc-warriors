import { expect, test } from "vitest";
import { currentDay, daysBetween } from "@/lib/day";

test("before 6 AM IST belongs to previous day", () => {
  expect(currentDay(new Date("2026-10-26T19:30:00Z"))).toBe("2026-10-26"); // 01:00 IST on Oct 27
});

test("6 AM IST starts the new day", () => {
  expect(currentDay(new Date("2026-10-27T00:30:00Z"))).toBe("2026-10-27"); // 06:00 IST
  expect(currentDay(new Date("2026-10-27T00:29:59Z"))).toBe("2026-10-26");
});

test("month boundary", () => {
  expect(currentDay(new Date("2026-11-01T00:00:00Z"))).toBe("2026-10-31"); // 05:30 IST Nov 1
});

test("daysBetween", () => {
  expect(daysBetween("2026-10-23", "2026-10-26")).toBe(3);
  expect(daysBetween("2026-10-31", "2026-11-01")).toBe(1);
});
