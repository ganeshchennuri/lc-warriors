import { expect, test } from "vitest";
import { readStoredUser } from "@/components/UserProvider";

const store = (v: string | null) => ({ getItem: () => v });

test("readStoredUser accepts only known users", () => {
  expect(readStoredUser(store("ganesh"))).toBe("ganesh");
  expect(readStoredUser(store("bob"))).toBeNull();
  expect(readStoredUser(store(null))).toBeNull();
  expect(readStoredUser({ getItem: () => { throw new Error("blocked"); } })).toBeNull();
});
