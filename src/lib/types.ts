export type ChannelSource =
  | { kind: "random" }
  | { kind: "topic"; query: string }
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
}

export type VisualStyle = "retro" | "modern";

export interface ViewFilter {
  enabled: boolean;
  min: number;
  max: number;
}

export interface Settings {
  autoAdvance: boolean;
  intervalSeconds: number;
  style: VisualStyle;
  muted: boolean;
  channels: Channel[];
  viewFilter: ViewFilter;
}
