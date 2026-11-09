"use server";

import { refresh, revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { loadExportRows } from "@/db/queries";
import { applySync, planUpload, summarize, type SyncSummary } from "@/db/sync";
import { toTrackerCsv } from "@/lib/csv-export";
import { parseResourceLink } from "@/lib/youtube";
import { addComment, addResource, deleteComment, deleteResource, editComment, setStatus } from "@/db/mutations";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
  revalidatePath("/", "layout");
  refresh();
  return { ok: true };
}

export async function setStatusAction(taskId: number, user: string, status: string) {
  return run(() => setStatus(getDb(), taskId, user, status));
}

export async function addCommentAction(lc: number, user: string, body: string) {
  return run(() => addComment(getDb(), lc, user, body));
}

/** YouTube's public oEmbed endpoint gives the title and cover of a video or playlist without an API key. */
async function youtubeInfo(url: string): Promise<{ title?: string; thumbnail_url?: string }> {
  const link = parseResourceLink(url);
  if (!link || link.kind === "link") return {};
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link.url)}`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? await res.json() : {};
  } catch {
    return {};
  }
}

export async function addResourceAction(heading: string, url: string, title: string | null, user: string) {
  return run(async () => {
    const info = await youtubeInfo(url);
    const thumbnail = info.thumbnail_url?.startsWith("https://i.ytimg.com/") ? info.thumbnail_url : null;
    await addResource(getDb(), heading, url, title?.trim() || info.title || null, user, thumbnail);
  });
}

export async function deleteResourceAction(id: number) {
  return run(() => deleteResource(getDb(), id));
}

export async function editCommentAction(id: number, user: string, body: string) {
  return run(() => editComment(getDb(), id, user, body));
}

export async function deleteCommentAction(id: number, user: string) {
  return run(() => deleteComment(getDb(), id, user));
}

const MAX_SHEET = 512 * 1024;

function planSheet(csv: string) {
  if (csv.length > MAX_SHEET) throw new Error("That file is too large to be the tracker sheet");
  const db = getDb();
  return planUpload(db, csv, async () => toTrackerCsv(await loadExportRows(db)));
}

/** Dry run of an uploaded sheet: what would change, without writing anything. */
export async function previewSheetAction(csv: string): Promise<{ ok: true; summary: SyncSummary } | { ok: false; error: string }> {
  try {
    return { ok: true, summary: summarize(await planSheet(csv)) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not read that sheet" };
  }
}

export async function applySheetAction(csv: string) {
  return run(async () => applySync(getDb(), await planSheet(csv)));
}
