import { readFileSync } from "node:fs";
import { beforeEach, expect, test } from "vitest";
import type { Db } from "@/db/client";
import { addComment, addResource, deleteComment, editComment, setStatus } from "@/db/mutations";
import { loadAll, loadProblem, loadResources } from "@/db/queries";
import { seed } from "@/db/seed";
import { parseResourceLink, parseYouTubeId } from "@/lib/youtube";
import { testDb } from "./helpers/db";

let db: Db;
beforeEach(async () => {
  db = await testDb();
  await seed(db, readFileSync("tests/fixtures/tracker-v1.csv", "utf8"));
});

test.each([
  ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ["https://youtu.be/dQw4w9WgXcQ?t=42", "dQw4w9WgXcQ"],
  ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s&list=x", "dQw4w9WgXcQ"],
  ["https://youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ["https://vimeo.com/123", null],
  ["not a url", null],
])("parseYouTubeId %s", (u, id) => expect(parseYouTubeId(u)).toBe(id));

test.each([
  ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabcdefghij", "video", "dQw4w9WgXcQ"],
  ["https://www.youtube.com/playlist?list=PLot-Xpze53ldVwtstag2TL4HQhAnC8ATf", "playlist", "PLot-Xpze53ldVwtstag2TL4HQhAnC8ATf"],
  ["https://neetcode.io/courses/dsa-for-beginners/0", "link", null],
  ["https://www.youtube.com/@NeetCode", null, null],
  ["javascript:alert(1)", null, null],
])("parseResourceLink %s", (u, kind, id) => {
  const link = parseResourceLink(u);
  expect(link?.kind ?? null).toBe(kind);
  if (link) expect(link.youtubeId).toBe(id);
});

test("setStatus only touches that user and upserts", async () => {
  const { tasks } = await loadAll(db);
  const t = tasks.find((t) => t.lc === 72 && t.stage === "original")!;
  await setStatus(db, t.id, "raj", "completed");
  await setStatus(db, t.id, "raj", "in_progress");
  const after = (await loadAll(db)).tasks.find((x) => x.id === t.id)!;
  expect(after.statuses).toEqual({ raj: "in_progress", ganesh: "not_started", arbaaz: "not_started" });
  await expect(setStatus(db, t.id, "bob", "completed")).rejects.toThrow("Unknown user");
  await expect(setStatus(db, t.id, "raj", "done")).rejects.toThrow("Unknown status");
});

test("comments validate, are shared, and feed latestNote", async () => {
  await expect(addComment(db, 643, "ganesh", "   ")).rejects.toThrow("Comment is empty");
  await expect(addComment(db, 643, "ganesh", "x".repeat(2001))).rejects.toThrow("Comment is too long");
  await addComment(db, 643, "ganesh", "first");
  await addComment(db, 643, "raj", "raj note");
  await addComment(db, 643, "ganesh", "second");
  const p = await loadProblem(db, 643);
  expect(p!.comments.map((c) => c.userId)).toEqual(["ganesh", "raj", "ganesh"]);
  const all = await loadAll(db);
  expect(all.latestNote["643:ganesh"]).toBe("second");
  expect(all.commentCounts[643]).toBe(3);
  expect(await loadProblem(db, 99999)).toBeNull();
});

test("resources group by heading", async () => {
  await addResource(db, "Trees", "https://youtu.be/dQw4w9WgXcQ", null, "raj");
  await addResource(db, " Graphs ", "https://youtu.be/aaaaaaaaaaa", "BFS", "ganesh");
  await addResource(db, "Graphs", "https://youtu.be/bbbbbbbbbbb", "", "arbaaz");
  await addResource(db, "Graphs", "https://cp-algorithms.com/graph/breadth-first-search.html", "BFS notes", "raj");
  await expect(addResource(db, "Graphs", "ftp://x.com/a", null, "raj")).rejects.toThrow("Not a valid link");
  await expect(addResource(db, "  ", "https://youtu.be/aaaaaaaaaaa", null, "raj")).rejects.toThrow("Heading is required");
  const groups = await loadResources(db);
  expect(groups.map((g) => g.heading)).toEqual(["Graphs", "Trees"]);
  expect(groups[0].items.map((i) => [i.kind, i.title])).toEqual([
    ["video", "BFS"],
    ["video", null],
    ["link", "BFS notes"],
  ]);
  expect(groups[0].items[2].url).toBe("https://cp-algorithms.com/graph/breadth-first-search.html");
});

test("only the author can edit or delete a comment", async () => {
  await addComment(db, 643, "ganesh", "orig");
  const [c] = (await loadProblem(db, 643))!.comments;
  await expect(editComment(db, c.id, "raj", "hijack")).rejects.toThrow("You can only change your own comments");
  await expect(deleteComment(db, c.id, "raj")).rejects.toThrow("You can only change your own comments");
  await expect(editComment(db, c.id, "ganesh", "  ")).rejects.toThrow("Comment is empty");
  await editComment(db, c.id, "ganesh", "fixed");
  const edited = (await loadProblem(db, 643))!.comments[0];
  expect(edited.body).toBe("fixed");
  expect(edited.editedAt).not.toBeNull();
  await deleteComment(db, c.id, "ganesh");
  expect((await loadProblem(db, 643))!.comments).toEqual([]);
  await expect(deleteComment(db, c.id, "ganesh")).rejects.toThrow("Comment not found");
});
