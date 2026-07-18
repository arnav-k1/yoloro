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
}

export type VisualStyle = "retro" | "modern";

export interface Settings {
  autoAdvance: boolean;
  intervalSeconds: number;
  style: VisualStyle;
  muted: boolean;
  channels: Channel[];
}
