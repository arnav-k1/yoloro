import { VideoItem } from "./types";
import { RANDOM_SEED_TOPICS } from "./presets";

const API_BASE = "https://www.googleapis.com/youtube/v3";

function apiKey(): string | undefined {
  return process.env.YOUTUBE_API_KEY;
}

export function hasApiKey(): boolean {
  return Boolean(apiKey());
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseSearchItems(data: {
  items?: Array<{
    id: { videoId: string };
    snippet: { title: string; channelTitle: string; thumbnails: Record<string, { url: string }> };
  }>;
}): VideoItem[] {
  const items = data.items ?? [];
  return items
    .filter((item) => item.id?.videoId)
    .map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail:
        item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url ?? "",
    }));
}

async function searchVideos(query: string, key: string): Promise<VideoItem[]> {
  // order=relevance (not date/viewCount): "date" surfaces brand-new uploads with near-zero
  // views, which starves the view-count filter of candidates; "viewCount" skews toward
  // all-time mega-viral videos. Relevance gives the most natural spread across view counts.
  // maxResults=50 (the API max) is quota-free — search.list costs a flat 100 units regardless
  // of maxResults — and gives the view-count/duration filters more candidates to work with.
  // No videoDuration filter here (previously hardcoded to "long"): the shorts/max-length
  // settings are enforced precisely via each video's real contentDetails.duration instead.
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    safeSearch: "moderate",
    maxResults: "50",
    order: "relevance",
    q: query,
    key,
  });
  const res = await fetch(`${API_BASE}/search?${params.toString()}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`);
  return parseSearchItems(await res.json());
}

/** "PT1H2M10S" -> 3730. Returns 0 for anything that doesn't match. */
function parseIso8601DurationSeconds(iso: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}

/** Fills in real view counts + durations via videos.list (cheap: 1 quota unit, vs. 100 for a search). */
async function attachMetadata(videos: VideoItem[], key: string): Promise<VideoItem[]> {
  if (videos.length === 0) return videos;
  const params = new URLSearchParams({
    part: "statistics,contentDetails",
    id: videos.map((v) => v.id).join(","),
    key,
  });
  const res = await fetch(`${API_BASE}/videos?${params.toString()}`);
  if (!res.ok) return videos;
  const data = await res.json();
  const items = (data.items ?? []) as Array<{
    id: string;
    statistics?: { viewCount?: string };
    contentDetails?: { duration?: string };
  }>;
  const metaById = new Map(
    items.map((item) => [
      item.id,
      {
        viewCount:
          item.statistics?.viewCount !== undefined ? Number(item.statistics.viewCount) : undefined,
        durationSeconds: item.contentDetails?.duration
          ? parseIso8601DurationSeconds(item.contentDetails.duration)
          : undefined,
      },
    ])
  );
  return videos.map((v) => {
    const meta = metaById.get(v.id);
    return { ...v, viewCount: meta?.viewCount, durationSeconds: meta?.durationSeconds };
  });
}

async function resolveChannelId(query: string, key: string): Promise<string | null> {
  const handle = query.trim();
  if (handle.startsWith("@")) {
    const params = new URLSearchParams({ part: "id", forHandle: handle.slice(1), key });
    const res = await fetch(`${API_BASE}/channels?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      const id = data.items?.[0]?.id;
      if (id) return id;
    }
  }
  const params = new URLSearchParams({
    part: "snippet",
    type: "channel",
    maxResults: "1",
    q: handle,
    key,
  });
  const res = await fetch(`${API_BASE}/search?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0]?.id?.channelId ?? null;
}

async function creatorVideos(query: string, key: string): Promise<VideoItem[]> {
  const channelId = await resolveChannelId(query, key);
  if (!channelId) return [];

  // order=viewCount (not the uploads playlist's chronological order): a creator's most recent
  // uploads are almost always too fresh to have accumulated many views, which would starve the
  // view-count filter the same way "date" order does for topic search.
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    channelId,
    order: "viewCount",
    maxResults: "50",
    key,
  });
  const res = await fetch(`${API_BASE}/search?${params.toString()}`);
  if (!res.ok) return [];
  return parseSearchItems(await res.json());
}

export async function fetchRandomVideos(): Promise<VideoItem[]> {
  const key = apiKey();
  if (!key) return [];
  const topic = pick(RANDOM_SEED_TOPICS);
  const videos = await searchVideos(topic, key);
  return shuffle(await attachMetadata(videos, key));
}

export async function fetchTopicVideos(query: string): Promise<VideoItem[]> {
  const key = apiKey();
  if (!key) return [];
  const videos = await searchVideos(query, key);
  return shuffle(await attachMetadata(videos, key));
}

export async function fetchCreatorVideos(query: string): Promise<VideoItem[]> {
  const key = apiKey();
  if (!key) return [];
  const videos = await creatorVideos(query, key);
  return shuffle(await attachMetadata(videos, key));
}
