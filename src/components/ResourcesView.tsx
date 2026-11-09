"use client";

import { ExternalLink, ListVideo, Play, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { addResourceAction, deleteResourceAction } from "@/app/actions";
import type { ResourceGroup, ResourceItem } from "@/db/queries";
import { userName } from "@/lib/users";
import { parseResourceLink } from "@/lib/youtube";
import { Theater } from "./Theater";
import { useUserState } from "./UserProvider";

type Filter = "all" | ResourceItem["kind"];

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "video", label: "Videos" },
  { id: "playlist", label: "Playlists" },
  { id: "link", label: "Articles" },
];

const DETECTED: Record<ResourceItem["kind"], string> = {
  video: "YouTube video",
  playlist: "YouTube playlist",
  link: "Article / link (opens in a new tab)",
};

const field =
  "rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none transition-colors duration-150 placeholder:text-dim focus:border-acc";

function slug(heading: string) {
  return `topic-${heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function hostname(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

export function ResourcesView({ groups }: { groups: ResourceGroup[] }) {
  const { user } = useUserState();
  const [heading, setHeading] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [playing, setPlaying] = useState<ResourceItem | null>(null);
  const [pending, startTransition] = useTransition();
  const detected = url.trim() ? parseResourceLink(url) : null;

  function add() {
    if (!user) return;
    setError(null);
    startTransition(async () => {
      const result = await addResourceAction(heading, url, title || null, user);
      if (result.ok) {
        setUrl("");
        setTitle("");
      } else setError(result.error);
    });
  }

  const all = groups.flatMap((g) => g.items);
  const count = (f: Filter) =>
    f === "all" ? all.length : all.filter((i) => i.kind === f).length;
  const visible = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => filter === "all" || i.kind === filter),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Resources</h1>
      <p className="mt-0.5 text-sm text-mut">
        Videos, playlists and articles, grouped by topic.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="mt-5 grid gap-3 rounded-xl border border-line bg-card p-4 sm:grid-cols-2 sm:items-start"
      >
        <label className="flex flex-col gap-1 text-xs text-mut sm:col-span-2">
          Link
          <input
            required
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube video or playlist, or any article URL"
            className={field}
          />
          <span
            className={`min-h-4 ${detected ? "text-acc" : "text-red"}`}
            aria-live="polite"
          >
            {url.trim() &&
              (detected
                ? `Detected: ${DETECTED[detected.kind]}`
                : "Not a link we can use")}
          </span>
        </label>
        <label className="flex flex-col gap-1 text-xs text-mut">
          Heading
          <input
            list="headings"
            required
            maxLength={60}
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            placeholder="Graphs"
            className={field}
          />
          <datalist id="headings">
            {groups.map((g) => (
              <option key={g.heading} value={g.heading} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs text-mut">
          Title (optional
          {detected && detected.kind !== "link" ? ", filled from YouTube" : ""})
          <input
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="BFS in 10 minutes"
            className={field}
          />
        </label>
        <button
          type="submit"
          disabled={pending || !user || !detected}
          className="flex h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-acc px-4 text-sm font-semibold text-bg transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2 sm:justify-self-end"
        >
          <Plus aria-hidden className="h-4 w-4" />{" "}
          {pending ? "Adding…" : "Add resource"}
        </button>
        {error && <p className="text-xs text-red sm:col-span-2">{error}</p>}
      </form>

      {all.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-mut">
          No resources yet. Add the first one above.
        </p>
      ) : (
        <div className="sticky top-[57px] z-10 -mx-4 mt-6 flex flex-col gap-2 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filter by type"
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors duration-150 ${
                  filter === f.id
                    ? "border-acc bg-acc/12 text-acc"
                    : "border-line text-mut hover:text-fg"
                }`}
              >
                {f.label}{" "}
                <span className="font-mono opacity-70">{count(f.id)}</span>
              </button>
            ))}
          </div>
          {visible.length > 1 && (
            <nav
              aria-label="Jump to topic"
              className="flex gap-3 overflow-x-auto text-xs whitespace-nowrap text-mut"
            >
              {visible.map((g) => (
                <a
                  key={g.heading}
                  href={`#${slug(g.heading)}`}
                  className="transition-colors duration-150 hover:text-fg"
                >
                  {g.heading}
                </a>
              ))}
            </nav>
          )}
        </div>
      )}

      {all.length > 0 && visible.length === 0 && (
        <p className="mt-8 text-center text-sm text-mut">
          Nothing of this type yet.
        </p>
      )}

      {visible.map((g) => {
        const media = g.items.filter((i) => i.kind !== "link");
        const links = g.items.filter((i) => i.kind === "link");
        return (
          <section
            key={g.heading}
            id={slug(g.heading)}
            className="mt-8 scroll-mt-32"
          >
            <h2 className="mb-3 flex items-baseline gap-2 text-lg font-semibold">
              {g.heading}
              <span className="rounded bg-muted px-1.5 font-mono text-[11px] font-normal text-mut">
                {g.items.length}
              </span>
            </h2>
            {playing && g.items.some((i) => i.id === playing.id) && (
              <Theater
                key={playing.id}
                item={playing}
                onClose={() => setPlaying(null)}
              />
            )}
            {media.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {media.map((item) => (
                  <MediaTile
                    key={item.id}
                    item={item}
                    active={playing?.id === item.id}
                    onPlay={() => setPlaying(item)}
                  />
                ))}
              </div>
            )}
            {links.length > 0 && (
              <ul
                className={`flex flex-col divide-y divide-line rounded-xl border border-line bg-card ${media.length ? "mt-4" : ""}`}
              >
                {links.map((item) => (
                  <LinkRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </main>
  );
}

function DeleteButton({
  id,
  label,
  onPending,
}: {
  id: number;
  label: string;
  onPending: (run: () => Promise<unknown>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Delete ${label}`}
      onClick={() => {
        if (confirm(`Delete "${label}"?`))
          onPending(() => deleteResourceAction(id));
      }}
      className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md text-dim transition-colors duration-150 hover:bg-card2 hover:text-red"
    >
      <Trash2 aria-hidden className="h-4 w-4" />
    </button>
  );
}

function MediaTile({
  item,
  active,
  onPlay,
}: {
  item: ResourceItem;
  active: boolean;
  onPlay: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const playlist = item.kind === "playlist";
  const label =
    item.title ?? (playlist ? "Untitled playlist" : "Untitled video");
  const cover =
    item.thumbnail ??
    (playlist
      ? null
      : `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`);

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-card ${active ? "border-acc/60" : "border-line"} ${pending ? "opacity-50" : ""}`}
    >
      <div className="relative aspect-video bg-bg">
        <button
          type="button"
          onClick={onPlay}
          aria-label={`${playlist ? "Open playlist" : "Play"} ${label}`}
          className="group absolute inset-0 cursor-pointer"
        >
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover opacity-80 transition-opacity duration-200 group-hover:opacity-100"
            />
          )}
          {playlist && (
            <span className="absolute inset-y-0 right-0 flex w-1/3 flex-col items-center justify-center gap-1 bg-bg/85 text-xs font-medium text-fg">
              <ListVideo aria-hidden className="h-5 w-5" />
              Playlist
              <span className="font-normal text-mut">view all videos</span>
            </span>
          )}
          <span
            className={`absolute inset-0 grid place-items-center ${playlist ? "right-1/3" : ""}`}
          >
            {active ? (
              <span className="rounded-full bg-bg/85 px-3 py-1 text-xs font-medium text-acc">
                Now playing
              </span>
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-full bg-bg/80 text-fg transition-transform duration-200 group-hover:scale-110">
                <Play aria-hidden className="ml-0.5 h-5 w-5 fill-current" />
              </span>
            )}
          </span>
        </button>
      </div>
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open on YouTube"
            className="block truncate text-sm font-medium transition-colors duration-150 hover:text-acc"
          >
            {label}
          </a>
          <p className="text-xs text-dim">added by {userName(item.addedBy)}</p>
        </div>
        <DeleteButton
          id={item.id}
          label={label}
          onPending={(fn) => startTransition(async () => void (await fn()))}
        />
      </div>
    </article>
  );
}

function LinkRow({ item }: { item: ResourceItem }) {
  const [pending, startTransition] = useTransition();
  const host = hostname(item.url);
  const label = item.title ?? host;

  return (
    <li
      className={`flex items-center gap-3 px-3 py-2.5 ${pending ? "opacity-50" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
        alt=""
        loading="lazy"
        className="h-5 w-5 shrink-0 rounded"
      />
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group min-w-0 flex-1"
      >
        <span className="flex items-center gap-1.5 text-sm font-medium transition-colors duration-150 group-hover:text-acc">
          <span className="truncate">{label}</span>
          <ExternalLink aria-hidden className="h-3.5 w-3.5 shrink-0 text-dim" />
        </span>
        <span className="block truncate text-xs text-dim">
          {host} · added by {userName(item.addedBy)}
        </span>
      </a>
      <DeleteButton
        id={item.id}
        label={label}
        onPending={(fn) => startTransition(async () => void (await fn()))}
      />
    </li>
  );
}
