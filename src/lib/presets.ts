import { Channel } from "./types";

export const RANDOM_CHANNEL: Channel = {
  id: "random",
  label: "Random",
  source: { kind: "random" },
};

/**
 * Quick-add chips shown in settings. Not active by default (except Random).
 * Gaming/Music/Sports map to real YouTube category IDs, so they pull the actual Trending
 * chart for that category instead of keyword search. Minecraft/Basketball have no matching
 * YouTube category, so they stay on (recency + popularity ranked) keyword search.
 */
export const PRESET_CHANNELS: Channel[] = [
  RANDOM_CHANNEL,
  {
    id: "gaming",
    label: "Gaming",
    source: { kind: "topic", query: "gameplay walkthrough let's play", categoryId: "20" },
  },
  {
    id: "minecraft",
    label: "Minecraft",
    source: { kind: "topic", query: "minecraft survival let's play build" },
  },
  {
    id: "music",
    label: "Music",
    source: { kind: "topic", query: "official music video live performance", categoryId: "10" },
  },
  {
    id: "sports",
    label: "Sports",
    source: { kind: "topic", query: "sports highlights full game recap", categoryId: "17" },
  },
  {
    id: "basketball",
    label: "Basketball",
    source: { kind: "topic", query: "basketball highlights NBA full game" },
  },
];

/** Broad seed topics the "random" channel rotates through for variety. */
export const RANDOM_SEED_TOPICS = [
  "documentary full episode",
  "tech review",
  "cooking recipe tutorial",
  "travel vlog",
  "science explained",
  "history documentary",
  "comedy sketch",
  "product review",
  "diy tutorial",
  "nature wildlife documentary",
  "movie analysis video essay",
  "podcast full episode",
  "life story interview",
  "engineering explained",
  "space exploration documentary",
  "true crime documentary",
  "personal finance explained",
  "workout full routine",
  "art tutorial",
  "book review",
  "gameplay walkthrough",
  "music live performance",
  "sports highlights",
  "car review",
  "news analysis",
];

export function defaultSettingsChannels(): Channel[] {
  return [RANDOM_CHANNEL];
}
