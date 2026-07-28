import { NextRequest, NextResponse } from "next/server";
import { hasApiKey, fetchRandomVideos, fetchTopicVideos, fetchCreatorVideos } from "@/lib/youtube";
import { mockPoolForQuery, mockRandomPool } from "@/lib/mockVideos";
import { VideoItem } from "@/lib/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Keeps videos with a view count in [min, max]. Falls back to the unfiltered list if that
 *  would leave nothing to play — a filter that empties the channel is worse than one that's
 *  slightly too loose. Videos with no known view count (shouldn't normally happen) pass through. */
function filterByViews(videos: VideoItem[], min: number | null, max: number | null): VideoItem[] {
  if (min === null && max === null) return videos;
  const filtered = videos.filter((v) => {
    if (v.viewCount === undefined) return true;
    if (min !== null && v.viewCount < min) return false;
    if (max !== null && v.viewCount > max) return false;
    return true;
  });
  return filtered.length > 0 ? filtered : videos;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") ?? "random";
  const query = searchParams.get("query") ?? "";
  const viewMin = searchParams.has("viewMin") ? Number(searchParams.get("viewMin")) : null;
  const viewMax = searchParams.has("viewMax") ? Number(searchParams.get("viewMax")) : null;

  const demo = !hasApiKey();
  let videos: VideoItem[] = [];

  if (demo) {
    videos = kind === "random" ? shuffle(mockRandomPool()) : shuffle(mockPoolForQuery(query));
  } else {
    try {
      if (kind === "random") videos = await fetchRandomVideos();
      else if (kind === "creator") videos = await fetchCreatorVideos(query);
      else videos = await fetchTopicVideos(query);
    } catch {
      videos = shuffle(mockRandomPool());
    }

    if (videos.length === 0) {
      videos = shuffle(mockRandomPool());
    }
  }

  videos = filterByViews(videos, viewMin, viewMax);

  return NextResponse.json({ videos, demo });
}
