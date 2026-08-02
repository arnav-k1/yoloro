import { VideoItem } from "./types";
import { RANDOM_SEED_TOPICS } from "./presets";

const API_BASE = "https://www.googleapis.com/youtube/v3";

// English-language regions to rotate the Trending chart across, so "Random" doesn't show the
// same fixed trending list on every flip.
const TRENDING_REGIONS = ["US", "GB", "CA", "AU"];

// YouTube's standard video category IDs. "Random" samples several of these per fetch and merges
// them — the overall (no-category) Trending chart is ranked by raw popularity, which means
// whatever's biggest right now (one viral event, one sport in season) can dominate the whole
// list; sampling categories directly guarantees an actual cross-category mix every time.
const RANDOM_CATEGORY_IDS = [
  "10", // Music
  "17", // Sports
  "20", // Gaming
  "22", // People & Blogs
  "23", // Comedy
  "24", // Entertainment
  "25", // News & Politics
  "26", // Howto & Style
  "27", // Education
  "28", // Science & Technology
];

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

/** "PT1H2M10S" -> 3730. Returns 0 for anything that doesn't match. */
function parseIso8601DurationSeconds(iso: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}

interface RawVideoItem extends VideoItem {
  publishedAt?: string;
}

function stripPublishedAt(v: RawVideoItem): VideoItem {
  const { id, title, channelTitle, thumbnail, viewCount, durationSeconds } = v;
  return { id, title, channelTitle, thumbnail, viewCount, durationSeconds };
}

/** Sorts by views-per-day-since-upload (not raw view count) and keeps the hottest slice.
 *  A video with 500K views in two weeks is what's actually being watched right now; one with
 *  500K views spread over ten years is a relic search's "relevance" order loves to surface. */
function rankByRecentPopularity(videos: RawVideoItem[]): VideoItem[] {
  const now = Date.now();
  const withVelocity = videos.map((v) => {
    const ageDays = v.publishedAt
      ? Math.max(1, (now - new Date(v.publishedAt).getTime()) / 86_400_000)
      : null;
    const velocity = v.viewCount !== undefined && ageDays !== null ? v.viewCount / ageDays : 0;
    return { v, velocity };
  });
  withVelocity.sort((a, b) => b.velocity - a.velocity);
  const hottest = withVelocity.slice(0, Math.min(25, withVelocity.length)).map((x) => x.v);
  return shuffle(hottest.map(stripPublishedAt));
}

function parseSearchItems(data: {
  items?: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      channelTitle: string;
      publishedAt?: string;
      thumbnails: Record<string, { url: string }>;
    };
  }>;
}): RawVideoItem[] {
  const items = data.items ?? [];
  return items
    .filter((item) => item.id?.videoId)
    .map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnail:
        item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url ?? "",
    }));
}

/** Parses a videos.list response (used by the chart=mostPopular trending fetch), which already
 *  includes statistics/contentDetails in the same call — no separate metadata round-trip needed. */
function parseVideosListItems(data: {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      channelTitle: string;
      thumbnails: Record<string, { url: string }>;
    };
    statistics?: { viewCount?: string };
    contentDetails?: { duration?: string };
  }>;
}): VideoItem[] {
  const items = data.items ?? [];
  return items.map((item) => ({
    id: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url ?? "",
    viewCount:
      item.statistics?.viewCount !== undefined ? Number(item.statistics.viewCount) : undefined,
    durationSeconds: item.contentDetails?.duration
      ? parseIso8601DurationSeconds(item.contentDetails.duration)
      : undefined,
  }));
}

/** YouTube's actual Trending feed — the closest thing to "the algorithm" exposed without OAuth
 *  and a user's own watch history. 1 quota unit (vs. 100 for a search.list call). */
async function fetchTrendingChart(
  key: string,
  { categoryId, regionCode, maxResults = 50 }: { categoryId?: string; regionCode: string; maxResults?: number }
): Promise<VideoItem[]> {
  const params = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    chart: "mostPopular",
    regionCode,
    maxResults: String(maxResults),
    key,
  });
  if (categoryId) params.set("videoCategoryId", categoryId);
  const res = await fetch(`${API_BASE}/videos?${params.toString()}`, { next: { revalidate: 0 } });
  if (!res.ok) return [];
  return parseVideosListItems(await res.json());
}

/** Merges trending videos across every category for one region, deduped by video id — every
 *  fetch samples all of them, so no category is ever left out of the mix. */
async function fetchCrossCategoryTrending(key: string, regionCode: string): Promise<VideoItem[]> {
  const results = await Promise.all(
    RANDOM_CATEGORY_IDS.map((categoryId) => fetchTrendingChart(key, { categoryId, regionCode, maxResults: 12 }))
  );
  const byId = new Map<string, VideoItem>();
  for (const video of results.flat()) byId.set(video.id, video);
  return Array.from(byId.values());
}

async function runSearch(params: URLSearchParams): Promise<RawVideoItem[]> {
  const res = await fetch(`${API_BASE}/search?${params.toString()}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`);
  return parseSearchItems(await res.json());
}

async function searchVideos(query: string, key: string): Promise<RawVideoItem[]> {
  // maxResults=50 (the API max) is quota-free — search.list costs a flat 100 units regardless
  // of maxResults — and gives the ranking/filters more candidates to work with.
  // No videoDuration filter here: the shorts/max-length settings are enforced precisely via
  // each video's real contentDetails.duration instead.
  const baseParams = {
    part: "snippet",
    type: "video",
    safeSearch: "moderate",
    maxResults: "50",
    order: "relevance",
    q: query,
    key,
  };

  // Bias toward the last ~2 years so "relevance" order doesn't surface decade-old evergreen
  // results — but widen back to unrestricted if that leaves too little to rank/filter from.
  const publishedAfter = new Date(Date.now() - 730 * 86_400_000).toISOString();
  const recent = await runSearch(new URLSearchParams({ ...baseParams, publishedAfter }));
  if (recent.length >= 8) return recent;
  return runSearch(new URLSearchParams(baseParams));
}

/** Fills in real view counts + durations via videos.list (cheap: 1 quota unit, vs. 100 for a search). */
async function attachMetadata(videos: RawVideoItem[], key: string): Promise<RawVideoItem[]> {
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

async function creatorVideosViaSearch(channelId: string, key: string): Promise<RawVideoItem[]> {
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

async function creatorVideosViaUploadsPlaylist(channelId: string, key: string): Promise<RawVideoItem[]> {
  const chParams = new URLSearchParams({ part: "contentDetails", id: channelId, key });
  const chRes = await fetch(`${API_BASE}/channels?${chParams.toString()}`);
  if (!chRes.ok) return [];
  const chData = await chRes.json();
  const uploadsPlaylistId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  const plParams = new URLSearchParams({
    part: "snippet",
    playlistId: uploadsPlaylistId,
    maxResults: "50",
    key,
  });
  const plRes = await fetch(`${API_BASE}/playlistItems?${plParams.toString()}`);
  if (!plRes.ok) return [];
  const plData = await plRes.json();
  const items = (plData.items ?? []) as Array<{
    snippet: {
      title: string;
      channelTitle: string;
      publishedAt?: string;
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
      publishedAt: item.snippet.publishedAt,
      thumbnail:
        item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url ?? "",
    }));
}

async function creatorVideos(query: string, key: string): Promise<RawVideoItem[]> {
  const channelId = await resolveChannelId(query, key);
  if (!channelId) return [];

  const viaSearch = await creatorVideosViaSearch(channelId, key);
  if (viaSearch.length >= 10) return viaSearch;

  // search.list scoped by channelId is a known-flaky endpoint — for some channels (seen on
  // PewDiePie's, 4600+ uploads) it returns just a single result regardless of order or
  // maxResults, apparently a backend indexing quirk rather than anything query-shape related.
  // The uploads-playlist route is far more reliable, at the cost of chronological (not
  // popularity) ordering — rankByRecentPopularity downstream compensates for that.
  const viaPlaylist = await creatorVideosViaUploadsPlaylist(channelId, key);
  return viaPlaylist.length > 0 ? viaPlaylist : viaSearch;
}

export async function fetchRandomVideos(): Promise<VideoItem[]> {
  const key = apiKey();
  if (!key) return [];

  const trending = await fetchCrossCategoryTrending(key, pick(TRENDING_REGIONS));
  if (trending.length > 0) return shuffle(trending);

  // Fallback if every category call fails: old keyword-search path.
  const topic = pick(RANDOM_SEED_TOPICS);
  const videos = await searchVideos(topic, key);
  return rankByRecentPopularity(await attachMetadata(videos, key));
}

export async function fetchTopicVideos(query: string, categoryId?: string): Promise<VideoItem[]> {
  const key = apiKey();
  if (!key) return [];

  if (categoryId) {
    const trending = await fetchTrendingChart(key, { categoryId, regionCode: pick(TRENDING_REGIONS) });
    if (trending.length > 0) return shuffle(trending);
  }

  const videos = await searchVideos(query, key);
  return rankByRecentPopularity(await attachMetadata(videos, key));
}

export async function fetchCreatorVideos(query: string): Promise<VideoItem[]> {
  const key = apiKey();
  if (!key) return [];
  const videos = await creatorVideos(query, key);
  return rankByRecentPopularity(await attachMetadata(videos, key));
}
