const HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (!HOSTS.has(url.hostname)) return null;
  const id =
    url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : (url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? "");
  return ID.test(id) ? id : null;
}

const PLAYLIST_ID = /^[A-Za-z0-9_-]{10,64}$/;

export type ResourceLink =
  | { kind: "video"; youtubeId: string; url: string }
  | { kind: "playlist"; youtubeId: string; url: string }
  | { kind: "link"; youtubeId: null; url: string };

/** Classifies a pasted link: a YouTube video, a YouTube playlist, or any other http(s) page. */
export function parseResourceLink(input: string): ResourceLink | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  // a video opened from inside a playlist (watch?v=…&list=…) stays a video
  const videoId = parseYouTubeId(url.href);
  if (videoId) return { kind: "video", youtubeId: videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
  if (HOSTS.has(url.hostname)) {
    const list = url.searchParams.get("list");
    if (list && PLAYLIST_ID.test(list)) {
      return { kind: "playlist", youtubeId: list, url: `https://www.youtube.com/playlist?list=${list}` };
    }
    return null;
  }
  return { kind: "link", youtubeId: null, url: url.href };
}
