import { eq } from "drizzle-orm";
import { parseResourceLink } from "@/lib/youtube";
import { isStatus } from "@/lib/status";
import { isUserId } from "@/lib/users";
import type { Db } from "./client";
import { comments, resources, taskStatus } from "./schema";

export const MAX_COMMENT = 2000;
export const MAX_HEADING = 60;
export const MAX_TITLE = 200;

function requireUser(user: string) {
  if (!isUserId(user)) throw new Error("Unknown user");
  return user;
}

export async function setStatus(db: Db, taskId: number, user: string, status: string): Promise<void> {
  const userId = requireUser(user);
  if (!isStatus(status)) throw new Error("Unknown status");
  await db
    .insert(taskStatus)
    .values({ taskId, userId, status })
    .onConflictDoUpdate({ target: [taskStatus.taskId, taskStatus.userId], set: { status, updatedAt: new Date() } });
}

export async function addComment(db: Db, lc: number, user: string, body: string): Promise<void> {
  const userId = requireUser(user);
  const text = body.trim();
  if (!text) throw new Error("Comment is empty");
  if (text.length > MAX_COMMENT) throw new Error("Comment is too long");
  await db.insert(comments).values({ lc, userId, body: text });
}

export async function addResource(
  db: Db,
  heading: string,
  url: string,
  title: string | null,
  user: string,
  thumbnail: string | null = null,
): Promise<void> {
  const addedBy = requireUser(user);
  const h = heading.trim();
  if (!h) throw new Error("Heading is required");
  if (h.length > MAX_HEADING) throw new Error("Heading is too long");
  const link = parseResourceLink(url);
  if (!link) throw new Error("Not a valid link");
  const t = title?.trim().slice(0, MAX_TITLE) || null;
  await db.insert(resources).values({ heading: h, kind: link.kind, youtubeId: link.youtubeId, url: link.url, title: t, thumbnail, addedBy });
}

export async function deleteResource(db: Db, id: number): Promise<void> {
  await db.delete(resources).where(eq(resources.id, id));
}

async function requireOwnComment(db: Db, id: number, user: string) {
  const userId = requireUser(user);
  const [comment] = await db.select({ userId: comments.userId }).from(comments).where(eq(comments.id, id));
  if (!comment) throw new Error("Comment not found");
  if (comment.userId !== userId) throw new Error("You can only change your own comments");
}

export async function editComment(db: Db, id: number, user: string, body: string): Promise<void> {
  await requireOwnComment(db, id, user);
  const text = body.trim();
  if (!text) throw new Error("Comment is empty");
  if (text.length > MAX_COMMENT) throw new Error("Comment is too long");
  await db.update(comments).set({ body: text, editedAt: new Date() }).where(eq(comments.id, id));
}

export async function deleteComment(db: Db, id: number, user: string): Promise<void> {
  await requireOwnComment(db, id, user);
  await db.delete(comments).where(eq(comments.id, id));
}
