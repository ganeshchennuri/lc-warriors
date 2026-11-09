"use client";

import { GripVertical, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ResourceItem } from "@/db/queries";
import {
  loadYouTubeApi,
  videoTitle,
  type YTPlayer,
} from "@/lib/youtube-player";

const WIDTH_KEY = "lcw.playerWidth";
const MIN_WIDTH = 320;
const GUTTER = 32;

function readWidth(): number | null {
  try {
    const w = Number(localStorage.getItem(WIDTH_KEY));
    return w >= MIN_WIDTH ? w : null;
  } catch {
    return null;
  }
}

function saveWidth(w: number | null) {
  try {
    if (w === null) localStorage.removeItem(WIDTH_KEY);
    else localStorage.setItem(WIDTH_KEY, String(Math.round(w)));
  } catch {}
}

/** Player for a video or a whole playlist, resizable by dragging its corner beyond the page column. */
export function Theater({
  item,
  onClose,
}: {
  item: ResourceItem;
  onClose: () => void;
}) {
  const box = useRef<HTMLElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  // null = fit the page column; a number = the width the viewer dragged to (remembered)
  const [width, setWidth] = useState<number | null>(readWidth);
  const [dragging, setDragging] = useState(false);
  const [videos, setVideos] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const playlist = item.kind === "playlist";

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      const p = player.current;
      if (!p) return;
      const ids = p.getPlaylist?.();
      if (ids?.length) setVideos(ids);
      setCurrent(Math.max(0, p.getPlaylistIndex?.() ?? 0));
    };
    const host = mount.current!;
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      // the API swaps this element for its iframe, so it must be one React doesn't own
      const el = document.createElement("div");
      host.append(el);
      player.current = new YT.Player(el, {
        host: "https://www.youtube-nocookie.com",
        width: "100%",
        height: "100%",
        ...(playlist ? {} : { videoId: item.youtubeId! }),
        playerVars: {
          autoplay: 1,
          rel: 0,
          ...(playlist ? { listType: "playlist", list: item.youtubeId! } : {}),
        },
        events: { onReady: sync, onStateChange: sync },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
      host.replaceChildren();
    };
  }, [item.youtubeId, playlist]);

  useEffect(() => {
    box.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function resizeTo(next: number) {
    const max = window.innerWidth - GUTTER;
    const w = Math.min(Math.max(next, MIN_WIDTH), max);
    setWidth(w);
    saveWidth(w);
  }

  function startDrag(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = box.current!.getBoundingClientRect().width;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const move = (ev: PointerEvent) =>
      resizeTo(startW + 2 * (ev.clientX - startX)); // centred, so it grows both ways
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <section
      ref={box}
      aria-label={`Now playing: ${item.title ?? "video"}`}
      style={width ? { width } : undefined}
      className="relative left-1/2 mb-4 w-full max-w-[calc(100vw-2rem)] -translate-x-1/2 scroll-mt-32 overflow-hidden rounded-xl border border-acc/40 bg-card"
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {item.title ?? "Now playing"}
          {playlist && videos.length > 0 && (
            <span className="ml-2 font-mono text-xs text-dim">
              {current + 1}/{videos.length}
            </span>
          )}
        </p>
        {width !== null && (
          <button
            type="button"
            onClick={() => {
              setWidth(null);
              saveWidth(null);
            }}
            className="cursor-pointer rounded-md px-2 py-1 text-xs text-mut transition-colors duration-150 hover:text-fg"
          >
            Reset size
          </button>
        )}
        <button
          type="button"
          aria-label="Close player"
          onClick={onClose}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-mut transition-colors duration-150 hover:bg-card2 hover:text-fg"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>

      <div className={`flex flex-col ${playlist ? "md:flex-row" : ""}`}>
        <div className="relative aspect-video min-w-0 flex-1 bg-bg [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full">
          <div ref={mount} className="absolute inset-0" />
          {/* keeps the iframe from swallowing the pointer while resizing */}
          {dragging && <div className="absolute inset-0 cursor-ew-resize" />}
        </div>
        {playlist && (
          <PlaylistList
            videos={videos}
            current={current}
            onPick={(i) => {
              player.current?.playVideoAt(i);
              setCurrent(i);
            }}
          />
        )}
      </div>

      <button
        type="button"
        aria-label="Resize player (drag, or use arrow keys)"
        title="Drag to resize · double-click to reset"
        onPointerDown={startDrag}
        onDoubleClick={() => {
          setWidth(null);
          saveWidth(null);
        }}
        onKeyDown={(e) => {
          const w = box.current!.getBoundingClientRect().width;
          if (e.key === "ArrowRight") resizeTo(w + 80);
          if (e.key === "ArrowLeft") resizeTo(w - 80);
        }}
        className="absolute right-0 bottom-0 grid h-7 w-7 cursor-nwse-resize touch-none place-items-center rounded-tl-lg bg-card2/90 text-mut transition-colors duration-150 hover:text-acc"
      >
        <GripVertical aria-hidden className="h-4 w-4 -rotate-45" />
      </button>
    </section>
  );
}

function PlaylistList({
  videos,
  current,
  onPick,
}: {
  videos: string[];
  current: number;
  onPick: (i: number) => void;
}) {
  const active = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    active.current?.scrollIntoView({ block: "nearest" });
  }, [current]);

  return (
    // absolutely positioned so the list never makes the row taller than the player
    <div className="relative h-80 border-t border-line md:h-auto md:w-72 md:shrink-0 md:border-t-0 md:border-l">
      <ol className="absolute inset-0 overflow-y-auto">
        {videos.length === 0 && (
          <li className="px-3 py-4 text-xs text-mut">Loading videos…</li>
        )}
        {videos.map((id, i) => (
          <li key={`${id}:${i}`}>
            <button
              ref={i === current ? active : undefined}
              type="button"
              onClick={() => onPick(i)}
              aria-current={i === current}
              className={`flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left transition-colors duration-150 ${
                i === current ? "bg-acc/12" : "hover:bg-card2"
              }`}
            >
              <span className="w-5 shrink-0 text-right font-mono text-[10px] text-dim">
                {i + 1}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
                alt=""
                loading="lazy"
                className="aspect-video w-20 shrink-0 rounded object-cover"
              />
              <VideoTitle id={id} className={i === current ? "text-acc" : ""} />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function VideoTitle({ id, className }: { id: string; className: string }) {
  const [title, setTitle] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    videoTitle(id).then((t) => live && setTitle(t));
    return () => {
      live = false;
    };
  }, [id]);
  return (
    <span className={`line-clamp-2 text-xs ${className}`}>{title ?? "…"}</span>
  );
}
