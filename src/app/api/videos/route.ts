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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") ?? "random";
  const query = searchParams.get("query") ?? "";

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

  return NextResponse.json({ videos, demo });
}
