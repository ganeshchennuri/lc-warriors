"use client";

import { Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { applySheetAction, previewSheetAction } from "@/app/actions";
import type { SyncSummary } from "@/db/sync";
import { STATUS_LABELS } from "@/lib/status";
import { userName } from "@/lib/users";

const BUTTON =
  "flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-mut transition-colors duration-150 hover:border-acc hover:text-fg disabled:cursor-not-allowed disabled:opacity-40";

/** Upload a CSV of the tracker sheet: shows what would change, then applies it on confirm. */
export function SheetUpload() {
  const input = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [message, setMessage] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    startTransition(async () => {
      const text = await file.text();
      const result = await previewSheetAction(text);
      if (result.ok) {
        setCsv(text);
        setSummary(result.summary);
      } else setMessage({ error: true, text: result.error });
    });
  }

  function close() {
    setCsv(null);
    setSummary(null);
    if (input.current) input.current.value = "";
  }

  function apply() {
    if (!csv) return;
    startTransition(async () => {
      const result = await applySheetAction(csv);
      if (result.ok) {
        close();
        setMessage({ error: false, text: "Sheet applied." });
      } else setMessage({ error: true, text: result.error });
    });
  }

  const empty =
    summary &&
    !summary.newProblems.length &&
    !summary.updatedProblems.length &&
    !summary.newTasks &&
    !summary.removed.length &&
    !summary.statusChanges.length;

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-label="Upload sheet CSV"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => input.current?.click()}
        className={BUTTON}
      >
        <Upload aria-hidden className="h-4 w-4" />{" "}
        {pending && !summary ? "Reading…" : "Upload sheet"}
      </button>
      {message && (
        <p
          role="status"
          className={`w-full text-right text-xs ${message.error ? "text-red" : "text-acc"}`}
        >
          {message.text}
        </p>
      )}

      {summary && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Sheet changes"
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-card p-4 text-left text-sm"
          >
            <h2 className="font-semibold">
              {empty ? "Nothing to change" : "Review changes before applying"}
            </h2>
            {!empty && (
              <ul className="mt-2 flex flex-col gap-1.5 text-mut">
                {summary.newProblems.length > 0 && (
                  <li>New problems: {summary.newProblems.join(", ")}</li>
                )}
                {summary.updatedProblems.length > 0 && (
                  <li>
                    Renamed / re-linked: {summary.updatedProblems.join(", ")}
                  </li>
                )}
                {summary.newTasks > 0 && (
                  <li>{summary.newTasks} new scheduled tasks</li>
                )}
                {summary.removed.length > 0 && (
                  <li className="text-red">
                    {summary.removed.length} tasks no longer in the sheet will
                    be removed (with their statuses):{" "}
                    <span className="font-mono text-xs">
                      {summary.removed.join(", ")}
                    </span>
                  </li>
                )}
                {summary.statusChanges.length > 0 && (
                  <li>
                    {summary.statusChanges.length} status changes:
                    <ul className="mt-1 ml-4 flex max-h-48 flex-col gap-0.5 overflow-y-auto font-mono text-xs">
                      {summary.statusChanges.map((c) => (
                        <li key={`${c.key}:${c.user}`}>
                          {c.key} · {userName(c.user)}: {STATUS_LABELS[c.from]}{" "}
                          → {STATUS_LABELS[c.to]}
                        </li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
            )}
            <p className="mt-3 text-xs text-dim">
              Statuses you changed on the site are kept unless the sheet changed
              that same cell since the last upload.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="cursor-pointer rounded-lg px-3 py-1.5 text-sm text-mut transition-colors duration-150 hover:text-fg"
              >
                {empty ? "Close" : "Cancel"}
              </button>
              {!empty && (
                <button
                  type="button"
                  onClick={apply}
                  disabled={pending}
                  className="cursor-pointer rounded-lg bg-acc px-3 py-1.5 text-sm font-semibold text-bg transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pending ? "Applying…" : "Apply"}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
