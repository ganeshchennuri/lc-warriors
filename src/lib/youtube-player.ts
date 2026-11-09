// Minimal typings and a one-time loader for the YouTube IFrame Player API (https://developers.google.com/youtube/iframe_api_reference).

export interface YTPlayer {
  getPlaylist(): string[] | null;
  getPlaylistIndex(): number;
  playVideoAt(index: number): void;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    options: {
      host?: string;
      videoId?: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: () => void; onStateChange?: () => void };
    },
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  loading ??= new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!);
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.append(script);
  });
  return loading;
}

const titles = new Map<string, Promise<string | null>>();

/** Video title via YouTube's oEmbed endpoint (CORS-enabled, no API key). Cached per page load. */
export function videoTitle(id: string): Promise<string | null> {
  let title = titles.get(id);
  if (!title) {
    const url = encodeURIComponent(`https://www.youtube.com/watch?v=${id}`);
    title = fetch(`https://www.youtube.com/oembed?format=json&url=${url}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { title?: string } | null) => j?.title ?? null)
      .catch(() => null);
    titles.set(id, title);
  }
  return title;
}
