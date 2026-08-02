import { NextRequest, NextResponse } from "next/server";
import { hasApiKey, fetchRandomVideos, fetchTopicVideos, fetchCreatorVideos } from "@/lib/youtube";
import { mockPoolForQuery, mockRandomPool } from "@/lib/mockVideos";
import { VideoItem } from "@/lib/types";

// YouTube's current Shorts eligibility cutoff (raised from 60s to 3 minutes in 2024).
const SHORTS_MAX_SECONDS = 180;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface FilterOptions {
  viewMin: number | null;
  viewMax: number | null;
  includeShorts: boolean;
  maxDurationSeconds: number | null;
}

function matchesViews(v: VideoItem, { viewMin, viewMax }: FilterOptions): boolean {
  if (viewMin === null && viewMax === null) return true;
  if (v.viewCount === undefined) return true;
  if (viewMin !== null && v.viewCount < viewMin) return false;
  if (viewMax !== null && v.viewCount > viewMax) return false;
  return true;
}

function matchesDuration(v: VideoItem, { includeShorts, maxDurationSeconds }: FilterOptions): boolean {
  if (v.durationSeconds === undefined) return true;
  if (!includeShorts && v.durationSeconds < SHORTS_MAX_SECONDS) return false;
  if (maxDurationSeconds !== null && v.durationSeconds > maxDurationSeconds) return false;
  return true;
}

/**
 * Applies both filters, but degrades gracefully: a filter combination that empties the channel
 * is worse than one that's slightly too loose. Duration/Shorts is treated as the harder
 * constraint — "don't show Shorts" is a rule, "prefer this view range" is a preference — so the
 * fallback order is "both" -> "duration only" -> "view only" -> "everything". Falling back to
 * "view only" first (dropping duration) was the bug: whenever the view range excluded every
 * long-form candidate, it would happily let Shorts back in as long as they were in range.
 */
function filterVideos(videos: VideoItem[], opts: FilterOptions): VideoItem[] {
  const both = videos.filter((v) => matchesViews(v, opts) && matchesDuration(v, opts));
  if (both.length > 0) return both;
  const durationOnly = videos.filter((v) => matchesDuration(v, opts));
  if (durationOnly.length > 0) return durationOnly;
  const viewOnly = videos.filter((v) => matchesViews(v, opts));
  if (viewOnly.length > 0) return viewOnly;
  return videos;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") ?? "random";
  const query = searchParams.get("query") ?? "";
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const viewMin = searchParams.has("viewMin") ? Number(searchParams.get("viewMin")) : null;
  const viewMax = searchParams.has("viewMax") ? Number(searchParams.get("viewMax")) : null;
  const includeShorts = searchParams.get("includeShorts") === "true";
  const rawMaxDurationSeconds = searchParams.has("maxDurationMinutes")
    ? Number(searchParams.get("maxDurationMinutes")) * 60
    : null;
  // A max length at or below the Shorts cutoff combined with excluding Shorts leaves an
  // effectively-empty window: "not a Short" requires >=180s, so a cap of exactly 180s only
  // admits videos of precisely 180.000s, which is practically never. Drop the cap instead and
  // keep the Shorts exclusion, since that's the harder rule of the two.
  const maxDurationSeconds =
    !includeShorts && rawMaxDurationSeconds !== null && rawMaxDurationSeconds <= SHORTS_MAX_SECONDS
      ? null
      : rawMaxDurationSeconds;

  const demo = !hasApiKey();
  let videos: VideoItem[] = [];

  if (demo) {
    videos = kind === "random" ? shuffle(mockRandomPool()) : shuffle(mockPoolForQuery(query));
  } else {
    try {
      if (kind === "random") videos = await fetchRandomVideos();
      else if (kind === "creator") videos = await fetchCreatorVideos(query);
      else videos = await fetchTopicVideos(query, categoryId);
    } catch {
      videos = shuffle(mockRandomPool());
    }

    if (videos.length === 0) {
      videos = shuffle(mockRandomPool());
    }
  }

  videos = filterVideos(videos, { viewMin, viewMax, includeShorts, maxDurationSeconds });

  return NextResponse.json({ videos, demo });
}
