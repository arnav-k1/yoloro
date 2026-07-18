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

async function searchVideos(query: string, key: string): Promise<VideoItem[]> {
  const order = pick(["relevance", "date", "viewCount"]);
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoDuration: "long",
    safeSearch: "moderate",
    maxResults: "25",
    order,
    q: query,
    key,
  });
  const res = await fetch(`${API_BASE}/search?${params.toString()}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`);
  const data = await res.json();
  const items = (data.items ?? []) as Array<{
    id: { videoId: string };
    snippet: { title: string; channelTitle: string; thumbnails: Record<string, { url: string }> };
  }>;
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

  const chParams = new URLSearchParams({ part: "contentDetails", id: channelId, key });
  const chRes = await fetch(`${API_BASE}/channels?${chParams.toString()}`);
  if (!chRes.ok) return [];
  const chData = await chRes.json();
  const uploadsPlaylistId =
    chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  const plParams = new URLSearchParams({
    part: "snippet",
    playlistId: uploadsPlaylistId,
    maxResults: "25",
    key,
  });
  const plRes = await fetch(`${API_BASE}/playlistItems?${plParams.toString()}`);
  if (!plRes.ok) return [];
  const plData = await plRes.json();
  const items = (plData.items ?? []) as Array<{
    snippet: {
      title: string;
      channelTitle: string;
      resourceId: { videoId: string };
      thumbnails: Record<string, { url: string }>;
    };
  }>;
  return items
    .filter((item) => item.snippet?.resourceId?.videoId)
    .map((item) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail:
        item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url ?? "",
    }));
}

export async function fetchRandomVideos(): Promise<VideoItem[]> {
  const key = apiKey();
  if (!key) return [];
  const topic = pick(RANDOM_SEED_TOPICS);
  const videos = await searchVideos(topic, key);
  return shuffle(videos);
}

export async function fetchTopicVideos(query: string): Promise<VideoItem[]> {
  const key = apiKey();
  if (!key) return [];
  const videos = await searchVideos(query, key);
  return shuffle(videos);
}

export async function fetchCreatorVideos(query: string): Promise<VideoItem[]> {
  const key = apiKey();
  if (!key) return [];
  const videos = await creatorVideos(query, key);
  return shuffle(videos);
}
