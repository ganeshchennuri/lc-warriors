"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { addCommentAction, deleteCommentAction, editCommentAction } from "@/app/actions";
import type { Comment } from "@/db/queries";
import { USERS, userName, type UserId } from "@/lib/users";
import { useUserState } from "./UserProvider";

const MAX = 2000;
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relative(date: Date) {
  const secs = (new Date(date).getTime() - Date.now()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) if (Math.abs(secs) >= size) return rtf.format(Math.round(secs / size), unit);
  return "just now";
}

export function CommentThread({ lc, comments }: { lc: number; comments: Comment[] }) {
  const { user } = useUserState();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!user) return;
    setError(null);
    startTransition(async () => {
      const result = await addCommentAction(lc, user, body);
      if (result.ok) setBody("");
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-mut">
          No notes yet. Leave a hint for your next revision.
        </p>
      )}
      {comments.map((c) => (
        <CommentItem key={c.id} comment={c} mine={c.userId === user} user={user} />
      ))}

      {user && (
        <form
          className="mt-2 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="comment" className="text-xs text-mut">
            Comment as {userName(user)}
          </label>
          <textarea
            id="comment"
            rows={3}
            maxLength={MAX}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="Key insight, edge case, complexity…"
            className="resize-y rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none transition-colors duration-150 placeholder:text-dim focus:border-acc"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-dim">
              {body.length}/{MAX} · ⌘/Ctrl+Enter to post
            </span>
            <button
              type="submit"
              disabled={pending || !body.trim()}
              className="cursor-pointer rounded-lg bg-acc px-4 py-2 text-sm font-semibold text-bg transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Posting…" : "Post"}
            </button>
          </div>
          {error && <p className="text-xs text-red">{error}</p>}
        </form>
      )}
    </div>
  );
}

function CommentItem({ comment: c, mine, user }: { comment: Comment; mine: boolean; user: UserId | null }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!user) return;
    setError(null);
    startTransition(async () => {
      const result = await editCommentAction(c.id, user, draft);
      if (result.ok) setEditing(false);
      else setError(result.error);
    });
  }

  function remove() {
    if (!user || !confirm("Delete this comment?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCommentAction(c.id, user);
      if (!result.ok) setError(result.error);
    });
  }

  const iconButton =
    "grid h-8 w-8 cursor-pointer place-items-center rounded-md text-dim transition-colors duration-150 hover:bg-card2 disabled:opacity-40";

  return (
    <div className={`flex gap-3 rounded-xl border border-line bg-card px-4 py-3 ${pending ? "opacity-60" : ""}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-card2 font-mono text-sm font-bold">
        {USERS.find((u) => u.id === c.userId)?.monogram ?? "?"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">{userName(c.userId)}</span>
          <time className="text-xs text-dim" dateTime={new Date(c.createdAt).toISOString()}>
            {relative(c.createdAt)}
          </time>
          {c.editedAt && <span className="text-xs text-dim">(edited)</span>}
          {mine && !editing && (
            <span className="ml-auto flex gap-0.5">
              <button
                type="button"
                aria-label="Edit comment"
                disabled={pending}
                onClick={() => {
                  setDraft(c.body);
                  setEditing(true);
                }}
                className={`${iconButton} hover:text-fg`}
              >
                <Pencil aria-hidden className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Delete comment"
                disabled={pending}
                onClick={remove}
                className={`${iconButton} hover:text-red`}
              >
                <Trash2 aria-hidden className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </div>
        {editing ? (
          <div className="mt-2 flex flex-col gap-2">
            <label htmlFor={`edit-${c.id}`} className="sr-only">
              Edit comment
            </label>
            <textarea
              id={`edit-${c.id}`}
              rows={3}
              maxLength={MAX}
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
                if (e.key === "Escape") setEditing(false);
              }}
              className="resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-acc"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="cursor-pointer rounded-lg px-3 py-1.5 text-sm text-mut transition-colors duration-150 hover:text-fg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending || !draft.trim()}
                className="cursor-pointer rounded-lg bg-acc px-3 py-1.5 text-sm font-semibold text-bg transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm break-words whitespace-pre-wrap text-[#cbd5e1]">{c.body}</p>
        )}
        {error && <p className="mt-1 text-xs text-red">{error}</p>}
      </div>
    </div>
  );
}
