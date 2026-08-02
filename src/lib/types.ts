export type ChannelSource =
  | { kind: "random" }
  // categoryId: when set, this channel pulls YouTube's real Trending chart for that category
  // instead of keyword search — much higher hit rate for "stuff people are actually watching."
  | { kind: "topic"; query: string; categoryId?: string }
  | { kind: "creator"; query: string };

export interface Channel {
  id: string;
  label: string;
  source: ChannelSource;
}

export interface VideoItem {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  viewCount?: number;
  durationSeconds?: number;
}

export type VisualStyle = "retro" | "modern";

export interface ViewFilter {
  enabled: boolean;
  min: number;
  max: number;
}

export interface DurationFilter {
  enabled: boolean;
  maxMinutes: number;
}

export interface Settings {
  autoAdvance: boolean;
  intervalSeconds: number;
  style: VisualStyle;
  muted: boolean;
  channels: Channel[];
  viewFilter: ViewFilter;
  includeShorts: boolean;
  durationFilter: DurationFilter;
}
