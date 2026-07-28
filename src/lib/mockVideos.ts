import { VideoItem } from "./types";

function v(id: string, title: string, channelTitle: string, viewCount: number): VideoItem {
  return {
    id,
    title,
    channelTitle,
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    viewCount,
  };
}

/**
 * Curated real, stable YouTube videos used when no API key is configured.
 * viewCount is a real snapshot (fetched via the Data API) so the view-count filter has
 * something meaningful to filter in demo mode too — it will drift from the live count over time.
 */
export const MOCK_LIBRARY: Record<string, VideoItem[]> = {
  gaming: [
    v("ELS1TlCdQSE", "Minecraft Let's Play - Ep. 1: THE MOST EPIC START!", "iJevin", 326_805),
    v("DaE04iZtAkQ", "Minecraft Let's Play - Ep. 1: AMAZING START! (Hardcore)", "iJevin", 343_099),
    v("BsJJUAGoFBc", "Let's Play Minecraft Episode 1", "TheNeoCubest", 1_275_002),
  ],
  minecraft: [
    v("ELS1TlCdQSE", "Minecraft Let's Play - Ep. 1: THE MOST EPIC START!", "iJevin", 326_805),
    v("DaE04iZtAkQ", "Minecraft Let's Play - Ep. 1: AMAZING START! (Hardcore)", "iJevin", 343_099),
    v("BsJJUAGoFBc", "Let's Play Minecraft Episode 1", "TheNeoCubest", 1_275_002),
  ],
  music: [
    v("dQw4w9WgXcQ", "Rick Astley - Never Gonna Give You Up (Official Video)", "Rick Astley", 1_797_536_311),
    v("kJQP7kiw5Fk", "Luis Fonsi - Despacito ft. Daddy Yankee", "LuisFonsiVEVO", 9_085_634_287),
    v("fJ9rUzIMcZQ", "Queen - Bohemian Rhapsody (Official Video Remastered)", "Queen Official", 2_080_949_091),
    v("OPf0YbXqDm0", "Mark Ronson - Uptown Funk ft. Bruno Mars", "MarkRonsonVEVO", 5_864_813_333),
    v("YQHsXMglC9A", "Adele - Hello (Official Music Video)", "Adele", 3_271_225_220),
    v("8UVNT4wvIGY", "Gotye - Somebody That I Used To Know feat. Kimbra", "Gotye", 2_686_504_528),
  ],
  sports: [
    v("hfOn5oAIpXQ", "NBA Highlights For Basketball Nerds", "J.D.", 108_145),
    v("4Z0kFQuFTHg", "1 Hour of Classic NBA Plays That Would BREAK The Internet Today", "MaxaMillion711", 71_256),
    v("WKbcykFmJp8", "NBA Highlights to Watch While You Procrastinate", "NBArtv", 352_810),
  ],
  basketball: [
    v("hfOn5oAIpXQ", "NBA Highlights For Basketball Nerds", "J.D.", 108_145),
    v("4Z0kFQuFTHg", "1 Hour of Classic NBA Plays That Would BREAK The Internet Today", "MaxaMillion711", 71_256),
    v("WKbcykFmJp8", "NBA Highlights to Watch While You Procrastinate", "NBArtv", 352_810),
  ],
  documentary: [
    v("c1nYtX-NUsc", "Tired of Doomscrolling?", "Kurzgesagt – In a Nutshell", 6_460_791),
    v("S7TUe5w6RHo", "4.5 Billion Years in 1 Hour", "Kurzgesagt – In a Nutshell", 17_119_536),
    v("VD6xJq8NguY", "There Is Life Hiding Inside Earth", "Kurzgesagt – In a Nutshell", 8_481_608),
    v("UBVV8pch1dM", "The Science of Thinking", "Veritasium", 9_152_093),
  ],
  cooking: [
    v("oHEYV2rHu1Y", "Babish Makes You The Ultimate Steak Sandwich | Cook Along", "Binging with Babish", 900_188),
    v("TggSdedcLJo", "The Ultimate Marry-Me Meals | With Babish", "Binging with Babish", 886_555),
    v("dFh7tZoGYA4", "Date Night Dinner | Basics with Babish", "Binging with Babish", 6_308_208),
  ],
  tech: [v("UBVV8pch1dM", "The Science of Thinking", "Veritasium", 9_152_093)],
  misc: [v("hFZFjoX2cGg", "Backyard Squirrel Maze 1.0 - Ninja Warrior Course", "Mark Rober", 146_306_393)],
};

const ALL_MOCK_VIDEOS: VideoItem[] = Object.values(MOCK_LIBRARY).flat();

/** Keywords that route a free-text query to a mock category, beyond the category's own name. */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  gaming: ["gameplay", "walkthrough", "let's play", "lets play"],
  minecraft: ["mine"],
  music: ["song", "official video", "live performance"],
  sports: ["highlights", "full game", "recap"],
  basketball: ["nba", "basketball"],
  documentary: ["science", "history", "space", "explained"],
  cooking: ["recipe", "food", "cook"],
  tech: ["review", "tech"],
};

/** Pick a mock video pool that best matches a free-text topic/creator query. */
export function mockPoolForQuery(query: string): VideoItem[] {
  const q = query.toLowerCase();
  for (const key of Object.keys(MOCK_LIBRARY)) {
    const keywords = [key, ...(CATEGORY_KEYWORDS[key] ?? [])];
    if (keywords.some((kw) => q.includes(kw))) return MOCK_LIBRARY[key];
  }
  // Unknown creator/topic in demo mode: fall back to a random slice of everything.
  return ALL_MOCK_VIDEOS;
}

export function mockRandomPool(): VideoItem[] {
  return ALL_MOCK_VIDEOS;
}
